import { CATEGORY_LABELS, DIFFICULTY_LABELS } from './types'
import type { Challenge, Difficulty, GeneratedProblem } from './types'

// Generated problems arrive as JSON written by an AI generator (see
// docs/generating.md), so nothing about them is trusted until checked here.
//   validateGenerated: is the shape right?       (runs in the app and in CI)
//   lintGenerated:     is the content acceptable? (runs in CI before anything ships)
// Whether the bug is real (original passes, broken fails) needs the sandbox,
// so that check lives in tests/generated.test.ts.

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Check the JSON's shape and return it typed, or throw one error listing
 * every problem, so a generator can fix them all in one pass.
 */
export function validateGenerated(raw: unknown, file: string): GeneratedProblem {
  const errors: string[] = []
  const p = (raw ?? {}) as Record<string, unknown>
  const isText = (key: string) => typeof p[key] === 'string' && (p[key] as string).trim() !== ''
  const need = (key: string) => {
    if (!isText(key)) errors.push(`"${key}" must be a non-empty string`)
  }

  for (const key of ['id', 'generatedBy', 'generatedAt', 'title', 'bugType', 'bugName', 'ticket', 'original', 'broken', 'tests', 'theory']) {
    need(key)
  }

  // The id must match the filename, so links like #/g/<id> map to one file.
  const expectedId = file.split('/').pop()?.replace(/\.json$/, '')
  if (isText('id') && p.id !== expectedId) errors.push(`"id" is "${String(p.id)}" but the file is ${expectedId}.json`)
  if (isText('id') && !KEBAB.test(p.id as string)) errors.push('"id" must be kebab-case')
  if (isText('bugType') && !KEBAB.test(p.bugType as string)) errors.push('"bugType" must be kebab-case')
  if (isText('generatedAt') && !DATE.test(p.generatedAt as string)) errors.push('"generatedAt" must be YYYY-MM-DD')
  if (p.source !== 'ai-generated') errors.push('"source" must be "ai-generated"')
  if (!(String(p.category) in CATEGORY_LABELS)) {
    errors.push(`"category" must be one of: ${Object.keys(CATEGORY_LABELS).join(', ')}`)
  }
  if (!(String(p.difficulty) in DIFFICULTY_LABELS)) errors.push('"difficulty" must be easy, medium or hard')

  if (!Array.isArray(p.hints) || p.hints.length !== 3 || !p.hints.every((h) => typeof h === 'string' && h.trim())) {
    errors.push('"hints" must be exactly 3 non-empty strings (where to look, what is wrong, how to fix)')
  }
  if (
    !Array.isArray(p.links) ||
    p.links.length === 0 ||
    !p.links.every((l) => typeof l?.label === 'string' && typeof l?.href === 'string')
  ) {
    errors.push('"links" must be a non-empty list of { label, href }')
  }
  if (p.html !== undefined && typeof p.html !== 'string') errors.push('"html" must be a string when present')
  if (p.fakeApi !== undefined && (typeof p.fakeApi !== 'object' || p.fakeApi === null || Array.isArray(p.fakeApi))) {
    errors.push('"fakeApi" must be an object of routes when present')
  }

  if (errors.length > 0) throw new Error(`${file}:\n  - ${errors.join('\n  - ')}`)
  return p as unknown as GeneratedProblem
}

/** Longest allowed `original`, in lines, per difficulty. Keeps problems bite-sized. */
export const MAX_LINES: Record<Difficulty, number> = { easy: 20, medium: 35, hard: 60 }

/**
 * Browser APIs generated code may not touch. The sandbox already blocks real
 * network access (CSP) and the parent page (opaque origin); this list keeps
 * generated problems about debugging and nothing else, and catches a
 * generator trying something odd before a human ever runs it.
 */
const FORBIDDEN: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /\bXMLHttpRequest\b/, name: 'XMLHttpRequest' },
  { pattern: /\bWebSocket\b/, name: 'WebSocket' },
  { pattern: /\beval\s*\(/, name: 'eval' },
  { pattern: /\bimport\s*\(/, name: 'dynamic import()' },
  { pattern: /\bnew\s+Function\b/, name: 'new Function' },
  { pattern: /\b(?:local|session)Storage\b/, name: 'localStorage/sessionStorage' },
  { pattern: /\bindexedDB\b/, name: 'indexedDB' },
  { pattern: /\bdocument\.cookie\b/, name: 'document.cookie' },
  { pattern: /\bpostMessage\b/, name: 'postMessage' },
  // `parent.x`, `top.x`, `opener.x`, `location`, unless they're a property of
  // something else (`node.parent`) or inside a string ('location' header).
  { pattern: /(?<![.\w$'"`])(?:parent|top|opener)\s*\./, name: 'parent/top/opener' },
  { pattern: /(?<![.\w$'"`])location\b/, name: 'location' },
]

/** Content rules a generated problem must meet. Returns problems found (empty = fine). */
export function lintGenerated(p: GeneratedProblem): string[] {
  const problems: string[] = []

  for (const [field, code] of [['original', p.original], ['broken', p.broken], ['tests', p.tests]] as const) {
    for (const { pattern, name } of FORBIDDEN) {
      if (pattern.test(code)) problems.push(`${field} uses ${name}, which generated problems may not use`)
    }
  }

  const lines = p.original.trimEnd().split('\n').length
  if (lines > MAX_LINES[p.difficulty]) {
    problems.push(`original is ${lines} lines; ${p.difficulty} problems allow at most ${MAX_LINES[p.difficulty]}`)
  }

  for (const link of p.links) {
    if (!link.href.startsWith('https://developer.mozilla.org/')) {
      problems.push(`link "${link.href}" must point to https://developer.mozilla.org/`)
    }
  }

  // The ticket is a customer's symptom report. Naming the bug type gives it away.
  if (p.ticket.toLowerCase().includes(p.bugName.toLowerCase())) {
    problems.push('ticket names the bug; it should only describe the symptom')
  }
  return problems
}

/** 1-based number of the first line that differs between two versions. */
export function firstChangedLine(before: string, after: string): number {
  const a = before.split('\n')
  const b = after.split('\n')
  const index = a.findIndex((line, i) => line !== b[i])
  return (index === -1 ? Math.min(a.length, b.length) : index) + 1
}

export function challengeFromGenerated(p: GeneratedProblem): Challenge {
  return {
    kind: 'generated',
    title: p.title,
    category: p.category,
    difficulty: p.difficulty,
    source: 'ai-generated',
    bugType: p.bugType,
    ticketRef: `DD-G-${p.id.slice(0, 18)}`,
    ticket: p.ticket,
    lesson: { name: p.bugName, hints: p.hints, theory: p.theory, links: p.links },
    original: p.original,
    broken: p.broken,
    line: firstChangedLine(p.original, p.broken),
    tests: p.tests,
    html: p.html,
    fakeApi: p.fakeApi,
  }
}
