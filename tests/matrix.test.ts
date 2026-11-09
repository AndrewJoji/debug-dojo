import { diffLines } from 'diff'
import { describe, expect, it } from 'vitest'
import { buildChallengeAt, sitesFor } from '../src/engine/challenge'
import { stripMarkers } from '../src/engine/markers'
import { registry } from '../src/engine/registry'
import { runInNode } from '../src/sandbox/node-runner'

// The contract every snippet and mutator must meet (SRS acceptance criterion):
//   1. a snippet passes all its own tests, unbroken;
//   2. at EVERY site a mutator claims, the injected bug makes a test fail;
//   3. the bug changes exactly one line, and it's the line we report.
// New files are picked up automatically, so this runs against Andrew's
// hand-written snippets and mutators too.

/** Count lines removed and added between two versions of the code. */
function changedLineCounts(before: string, after: string) {
  let removed = 0
  let added = 0
  for (const part of diffLines(before, after)) {
    if (part.removed) removed += part.count ?? 0
    if (part.added) added += part.count ?? 0
  }
  return { removed, added }
}

describe.each(registry.snippets.map((s) => [s.id, s] as const))('snippet %s', (_id, snippet) => {
  it('passes all its tests unbroken', async () => {
    const result = await runInNode({ ...snippet, code: stripMarkers(snippet.code).code })
    expect(result.status, result.message).toBe('ran')
    expect(result.tests.length).toBeGreaterThan(0)
    for (const test of result.tests) expect(test.passed, `${test.name}: ${test.error}`).toBe(true)
  })

  for (const mutator of registry.mutators) {
    const { sites } = sitesFor(snippet, mutator)
    if (sites.length === 0) continue

    describe(`under ${mutator.id}`, () => {
      it.each(sites.map((site, index) => [index, site] as const))('site %i fails a test', async (_index, site) => {
        const challenge = buildChallengeAt(snippet, mutator, site)

        // The bug must really change the code...
        expect(challenge.broken).not.toBe(challenge.original)

        // ...on exactly one line: one line edited, or one line removed.
        const { removed, added } = changedLineCounts(challenge.original, challenge.broken)
        expect(removed, 'lines removed').toBe(1)
        expect(added, 'lines added').toBeLessThanOrEqual(1)

        // ...and the reported line is where the change is.
        const originalLines = challenge.original.split('\n')
        const brokenLines = challenge.broken.split('\n')
        const firstDifference = originalLines.findIndex((line, i) => line !== brokenLines[i])
        expect(challenge.line).toBe(firstDifference + 1)

        // ...and at least one test notices.
        const result = await runInNode({ ...snippet, code: challenge.broken })
        const anyFailed = result.status !== 'ran' || result.tests.some((t) => !t.passed)
        expect(anyFailed, `bug at line ${challenge.line} went unnoticed by every test`).toBe(true)
      })
    })
  }
})

describe('registry', () => {
  it('finds the snippets and mutators', () => {
    expect(registry.snippets.length).toBeGreaterThanOrEqual(3)
    expect(registry.mutators.length).toBeGreaterThanOrEqual(3)
  })

  it('every mutator applies to at least one snippet', () => {
    for (const mutator of registry.mutators) {
      const applies = registry.snippets.some((s) => sitesFor(s, mutator).sites.length > 0)
      expect(applies, `${mutator.id} applies to no snippet`).toBe(true)
    }
  })
})
