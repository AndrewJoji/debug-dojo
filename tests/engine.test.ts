import { describe, expect, it } from 'vitest'
import { buildChallenge, matchingPairs, pickChallenge, sitesFor } from '../src/engine/challenge'
import { defineMutator, defineSnippet } from '../src/engine/define'
import { lineAt, stripMarkers } from '../src/engine/markers'
import { emptyStats, loadProgress, recordOutcome, saveProgress, STORAGE_KEY, type StorageLike } from '../src/engine/progress'
import { hashSeed, mulberry32 } from '../src/engine/random'
import { registry } from '../src/engine/registry'

describe('random', () => {
  it('gives the same sequence for the same seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('gives different sequences for different seeds', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)())
  })

  it('hashes strings to stable unsigned 32-bit numbers', () => {
    expect(hashSeed('remove-await')).toBe(hashSeed('remove-await'))
    expect(hashSeed('a')).not.toBe(hashSeed('b'))
    expect(hashSeed('anything')).toBeGreaterThanOrEqual(0)
  })
})

describe('markers', () => {
  it('strips markers and remembers where the marked code starts', () => {
    const { code, markers } = stripMarkers('const res = /*@await*/ await fetch(url)')
    expect(code).toBe('const res = await fetch(url)')
    expect(markers).toEqual([{ tag: 'await', offset: 12 }])
    expect(code.slice(12)).toMatch(/^await/)
  })

  it('reports 1-based line numbers', () => {
    expect(lineAt('a\nb\nc', 0)).toBe(1)
    expect(lineAt('a\nb\nc', 4)).toBe(3)
  })
})

// A tiny made-up mutator, so these tests don't depend on the example files.
const dropSemicolon = defineMutator({
  id: 'drop-semicolon',
  name: 'Drop a semicolon',
  category: 'logic',
  tag: 'semi',
  findSites: (code) => [...code.matchAll(/;/g)].map((m) => ({ start: m.index, end: m.index + 1 })),
  breakAt: (code, site) => code.slice(0, site.start) + code.slice(site.end),
  ticket: 'ticket',
  hints: ['where', 'what', 'how'],
  theory: '',
  links: [],
})

const threeStatements = defineSnippet({
  id: 'three',
  title: 'Three statements',
  category: 'logic',
  code: 'a();\nb();\nc();\n',
  tests: "test('x', () => {})",
  ticket: 'fallback',
})

describe('challenges', () => {
  it('builds the same bug for the same seed', () => {
    const first = buildChallenge(threeStatements, dropSemicolon, 7)
    const again = buildChallenge(threeStatements, dropSemicolon, 7)
    expect(again.broken).toBe(first.broken)
    expect(again.line).toBe(first.line)
  })

  it('reaches every site across seeds', () => {
    const lines = new Set<number>()
    for (let seed = 0; seed < 50; seed++) lines.add(buildChallenge(threeStatements, dropSemicolon, seed).line)
    expect([...lines].sort()).toEqual([1, 2, 3])
  })

  it('only uses marked sites when the snippet has markers for the tag', () => {
    const marked = { ...threeStatements, code: 'a();\nb()/*@semi*/;\nc();\n' }
    const { code, sites } = sitesFor(marked, dropSemicolon)
    expect(code).toBe('a();\nb();\nc();\n')
    expect(sites).toEqual([{ start: 8, end: 9 }])
    expect(buildChallenge(marked, dropSemicolon, 123).line).toBe(2)
  })

  it('never shows markers in the original or broken code', () => {
    for (const snippet of registry.snippets) {
      for (const { mutator } of matchingPairs(registry).filter((p) => p.snippet === snippet)) {
        const challenge = buildChallenge(snippet, mutator, 1)
        expect(challenge.original).not.toMatch(/\/\*@/)
        expect(challenge.broken).not.toMatch(/\/\*@/)
      }
    }
  })

  it('Random gives a valid challenge for 200 seeds in a row', () => {
    for (let seed = 0; seed < 200; seed++) {
      const challenge = pickChallenge(registry, {}, seed)
      expect(challenge).not.toBeNull()
      expect(challenge!.broken).not.toBe(challenge!.original)
      expect(challenge!.mutator.hints).toHaveLength(3)
    }
  })

  it('respects the category and bug-type filters', () => {
    expect(pickChallenge(registry, { category: 'dom-html' }, 3)?.mutator.category).toBe('dom-html')
    expect(pickChallenge(registry, { mutatorId: 'remove-await' }, 3)?.mutator.id).toBe('remove-await')
    expect(pickChallenge(registry, { mutatorId: 'no-such-bug' }, 3)).toBeNull()
  })
})

describe('progress', () => {
  const memoryStorage = (): StorageLike & { data: Map<string, string> } => {
    const data = new Map<string, string>()
    return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) }
  }

  it('records solves, reveals, hints and best time', () => {
    let progress = recordOutcome({}, { mutatorId: 'remove-await', result: 'solved', hintsUsed: 2, timeMs: 90_000, at: new Date(0) })
    progress = recordOutcome(progress, { mutatorId: 'remove-await', result: 'solved', hintsUsed: 0, timeMs: 30_000, at: new Date(0) })
    progress = recordOutcome(progress, { mutatorId: 'remove-await', result: 'revealed', hintsUsed: 3, timeMs: 10_000, at: new Date(0) })
    expect(progress['remove-await']).toEqual({
      ...emptyStats(),
      attempts: 3,
      solves: 2,
      reveals: 1,
      hintsUsed: 5,
      bestTimeMs: 30_000,
      lastPlayed: new Date(0).toISOString(),
    })
  })

  it('survives a save and load (a page reload)', () => {
    const storage = memoryStorage()
    const progress = recordOutcome({}, { mutatorId: 'x', result: 'solved', hintsUsed: 1, timeMs: 5, at: new Date(0) })
    saveProgress(storage, progress)
    expect(loadProgress(storage)).toEqual(progress)
  })

  it('starts fresh when storage holds junk or throws', () => {
    const storage = memoryStorage()
    storage.data.set(STORAGE_KEY, '{not json')
    expect(loadProgress(storage)).toEqual({})
    const throwing: StorageLike = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(loadProgress(throwing)).toEqual({})
    expect(() => saveProgress(throwing, {})).not.toThrow()
  })
})
