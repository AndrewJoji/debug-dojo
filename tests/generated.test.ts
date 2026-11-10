import { diffLines } from 'diff'
import { describe, expect, it } from 'vitest'
import { challengeFromGenerated, lintGenerated, validateGenerated } from '../src/engine/generated'
import { stripMarkers } from '../src/engine/markers'
import { registry } from '../src/engine/registry'
import type { GeneratedProblem } from '../src/engine/types'
import { runInNode } from '../src/sandbox/node-runner'

// The gate every AI-generated problem must pass before it can ship.
// Shape and content rules are cheap checks; the important ones run the code:
//   - the original passes every test (the "working" code really works)
//   - the broken version fails at least one (the bug is real and catchable)
//   - original and broken differ by 1–3 lines (it's ONE bug, not a rewrite)

/** Lines changed between two versions: the larger of lines removed and added. */
function changedLines(before: string, after: string): number {
  let removed = 0
  let added = 0
  for (const part of diffLines(before, after)) {
    if (part.removed) removed += part.count ?? 0
    if (part.added) added += part.count ?? 0
  }
  return Math.max(removed, added)
}

const normalise = (code: string) => code.replace(/\s+/g, ' ').trim()

describe('generated problems', () => {
  it('all files in src/generated/ are valid', () => {
    expect(registry.generatedErrors, registry.generatedErrors.join('\n\n')).toEqual([])
  })

  it('no two problems share the same working code', () => {
    const seen = new Map<string, string>()
    for (const snippet of registry.snippets) seen.set(normalise(stripMarkers(snippet.code).code), `snippet ${snippet.id}`)
    for (const problem of registry.generated) {
      const key = normalise(problem.original)
      expect(seen.get(key), `${problem.id} duplicates ${seen.get(key)}`).toBeUndefined()
      seen.set(key, `generated ${problem.id}`)
    }
  })

  describe.each(registry.generated.map((p) => [p.id, p] as const))('%s', (_id, problem) => {
    it('meets the content rules', () => {
      expect(lintGenerated(problem)).toEqual([])
    })

    it('original passes every test', async () => {
      const result = await runInNode({ ...problem, code: problem.original })
      expect(result.status, result.message).toBe('ran')
      expect(result.tests.length).toBeGreaterThan(0)
      for (const test of result.tests) expect(test.passed, `${test.name}: ${test.error}`).toBe(true)
    })

    it('broken fails at least one test', async () => {
      const result = await runInNode({ ...problem, code: problem.broken })
      const anyFailed = result.status !== 'ran' || result.tests.some((t) => !t.passed)
      expect(anyFailed, 'the bug went unnoticed by every test').toBe(true)
    })

    it('is one bug: 1 to 3 changed lines', () => {
      const changed = changedLines(problem.original, problem.broken)
      expect(changed).toBeGreaterThanOrEqual(1)
      expect(changed).toBeLessThanOrEqual(3)
    })
  })
})

// Fixtures proving the gate rejects bad problems, so CI failing on a real
// generated file is something we've seen work, not something we assume.
describe('the generated-problem gate', () => {
  const good: GeneratedProblem = {
    id: 'sum-prices',
    source: 'ai-generated',
    generatedBy: 'test',
    generatedAt: '2026-11-10',
    title: 'Sum prices',
    category: 'logic',
    difficulty: 'easy',
    bugType: 'off-by-one',
    bugName: 'Off-by-one loop bound',
    ticket: 'The cart total is too low.',
    original: 'function total(items) {\n  let sum = 0;\n  for (let i = 0; i < items.length; i++) sum += items[i];\n  return sum;\n}\n',
    broken: 'function total(items) {\n  let sum = 0;\n  for (let i = 1; i < items.length; i++) sum += items[i];\n  return sum;\n}\n',
    tests: "test('adds every price', () => { assert.equal(total([1, 2, 3]), 6) })",
    hints: ['where', 'what', 'how'],
    theory: 'theory',
    links: [{ label: 'MDN: for', href: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for' }],
  }

  it('accepts a good problem, and its bug is real', async () => {
    expect(() => validateGenerated(good, 'src/generated/sum-prices.json')).not.toThrow()
    expect(lintGenerated(good)).toEqual([])
    expect(challengeFromGenerated(good).line).toBe(3)
    const fixed = await runInNode({ ...good, code: good.original })
    const broken = await runInNode({ ...good, code: good.broken })
    expect(fixed.tests.every((t) => t.passed)).toBe(true)
    expect(broken.tests.some((t) => !t.passed)).toBe(true)
  })

  it('rejects a bad shape, listing every problem', () => {
    const bad = { ...good, id: 'Not Kebab', difficulty: 'impossible', hints: ['only one'] }
    expect(() => validateGenerated(bad, 'src/generated/sum-prices.json')).toThrow(
      /id.*file is sum-prices[\s\S]*kebab-case[\s\S]*difficulty[\s\S]*hints/,
    )
  })

  it('rejects forbidden APIs, oversized code, non-MDN links and tickets that name the bug', () => {
    const bad: GeneratedProblem = {
      ...good,
      original: good.original + '\n'.repeat(25) + "localStorage.setItem('x', 1); fetch(location.href);",
      ticket: 'There is an off-by-one loop bound somewhere.',
      links: [{ label: 'blog', href: 'https://example.com' }],
    }
    const problems = lintGenerated(bad).join('\n')
    expect(problems).toMatch(/localStorage/)
    expect(problems).toMatch(/location/)
    expect(problems).toMatch(/at most 20/)
    expect(problems).toMatch(/developer\.mozilla\.org/)
    expect(problems).toMatch(/ticket names the bug/)
  })

  it('does not flag harmless look-alikes', () => {
    const fine: GeneratedProblem = {
      ...good,
      original: "const loc = res.headers.get('location'); node.parent.id; item.top;\n",
    }
    expect(lintGenerated(fine)).toEqual([])
  })

  it('catches a "bug" that no test notices', async () => {
    const silent = { ...good, broken: good.original.replace('let sum = 0;', 'let sum = 0; // changed') }
    const result = await runInNode({ ...silent, code: silent.broken })
    expect(result.tests.every((t) => t.passed)).toBe(true) // so the "broken fails" check would fail CI
  })

  it('catches a rewrite posing as one bug', () => {
    const rewrite = good.original.replace(/sum/g, 'acc').replace('function total', 'function add')
    expect(changedLines(good.original, rewrite)).toBeGreaterThan(3)
  })
})
