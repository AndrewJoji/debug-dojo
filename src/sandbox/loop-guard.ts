import { parse } from 'acorn'
import { simple } from 'acorn-walk'
import type { Node } from 'acorn'

// Why this exists: a sandboxed iframe isolates *what* code can touch, but in
// most browsers it still runs on the page's main thread. `while (true) {}`
// would freeze the whole tab, and no setTimeout in the parent could ever fire
// to stop it. So before running, we add a call to __guard() at the top of
// every loop body. __guard() throws once the time budget is used up, which
// breaks the loop from the inside. (CodePen and JSBin use the same trick.)

export type GuardResult =
  | { ok: true; code: string }
  | { ok: false; message: string; line: number }

interface LoopNode extends Node {
  body: Node
}

export function guardLoops(code: string): GuardResult {
  let ast: Node
  try {
    // Parsing first also gives the user a proper syntax error with a line
    // number, instead of a vague failure from deep inside the sandbox.
    ast = parse(code, { ecmaVersion: 'latest', sourceType: 'script', locations: true })
  } catch (error) {
    const err = error as SyntaxError & { loc?: { line: number } }
    return { ok: false, message: err.message, line: err.loc?.line ?? 1 }
  }

  // Collect text insertions as (offset, text) pairs, then apply them.
  const insertions: Array<{ at: number; text: string }> = []
  const guardBody = (node: Node) => {
    const body = (node as LoopNode).body
    if (body.type === 'BlockStatement') {
      // `while (x) { ... }` → `while (x) {__guard(); ... }`
      insertions.push({ at: body.start + 1, text: '__guard();' })
    } else {
      // `while (x) step()` has no braces, so add them: `while (x) {__guard();step()}`
      insertions.push({ at: body.start, text: '{__guard();' })
      insertions.push({ at: body.end, text: '}' })
    }
  }
  simple(ast, {
    ForStatement: guardBody,
    ForInStatement: guardBody,
    ForOfStatement: guardBody,
    WhileStatement: guardBody,
    DoWhileStatement: guardBody,
  })

  // Apply from the end of the string backwards, so inserting text never
  // shifts the offsets of insertions we haven't applied yet. None of the
  // inserted text contains a newline, so line numbers in errors stay right.
  insertions.sort((a, b) => b.at - a.at)
  let guarded = code
  for (const { at, text } of insertions) {
    guarded = guarded.slice(0, at) + text + guarded.slice(at)
  }
  return { ok: true, code: guarded }
}
