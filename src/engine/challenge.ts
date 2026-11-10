import { challengeFromGenerated } from './generated'
import { lineAt, stripMarkers } from './markers'
import { hashSeed, mulberry32, pickOne } from './random'
import type { Registry } from './registry'
import type { Category, Challenge, Difficulty, Mutator, Site, Snippet, Source } from './types'

// This file turns the picker's choice into a challenge. There are two kinds:
//   mutated   – a snippet plus a mutator plus a seed (the bug is injected live)
//   generated – a pre-broken problem from src/generated/ (no seed needed)
// Mutators only answer two questions (where could the bug go? break it there),
// so all the seed handling lives here, in one place.

/** What the user chose in the picker. Leave everything out for Random. */
export interface PickFilter {
  category?: Category
  difficulty?: Difficulty
  /** A mutator id, or a generated problem's bugType. */
  bugType?: string
  source?: Source
}

/** Where a challenge comes from: enough to rebuild it, and to put in the URL. */
export type Target =
  | { kind: 'mutated'; snippetId: string; mutatorId: string }
  | { kind: 'generated'; id: string }

/** One pickable challenge, with the fields the picker filters on. */
export interface Candidate {
  target: Target
  category: Category
  difficulty: Difficulty
  source: Source
  bugType: string
  bugName: string
}

/**
 * The sites where `mutator` may act on `snippet`, in the marker-free code.
 *
 * If the snippet has markers for this mutator's tag, only marked sites count:
 * the author has said exactly where the bug belongs. Otherwise every site the
 * mutator finds counts.
 */
export function sitesFor(snippet: Snippet, mutator: Mutator): { code: string; sites: Site[] } {
  const { code, markers } = stripMarkers(snippet.code)
  // Sort by position so "site #2" means the same thing on every run;
  // determinism must not depend on the order a mutator happened to return.
  const sites = [...mutator.findSites(code)].sort((a, b) => a.start - b.start)

  const tagged = markers.filter((m) => m.tag === mutator.tag)
  if (tagged.length === 0) return { code, sites }
  return { code, sites: sites.filter((s) => tagged.some((m) => m.offset === s.start)) }
}

/** The SRS's `appliesTo(code)`, derived from the mutator's sites. */
export function appliesTo(snippet: Snippet, mutator: Mutator): boolean {
  return sitesFor(snippet, mutator).sites.length > 0
}

/** A pair counts as hand-written if either half is; otherwise it's a scaffold example. */
function pairSource(registry: Registry, snippet: Snippet, mutator: Mutator): Source {
  const hand =
    registry.sources[`snippet:${snippet.id}`] === 'hand-written' ||
    registry.sources[`mutator:${mutator.id}`] === 'hand-written'
  return hand ? 'hand-written' : 'example'
}

/** Inject the bug at one specific site. The tests use this to try every site. */
export function buildChallengeAt(
  snippet: Snippet,
  mutator: Mutator,
  site: Site,
  seed = 0,
  source: Source = 'example',
): Challenge {
  const { code } = stripMarkers(snippet.code)
  const broken = mutator.breakAt(code, site)
  return {
    kind: 'mutated',
    title: snippet.title,
    category: snippet.category,
    difficulty: snippet.difficulty ?? 'medium',
    source,
    bugType: mutator.id,
    ticketRef: `DD-${seed}`,
    ticket: mutator.ticket || snippet.ticket,
    lesson: { name: mutator.name, hints: mutator.hints, theory: mutator.theory, links: mutator.links },
    original: code,
    broken,
    // Text before `site.start` is untouched by the edit, so this offset still
    // points at the start of the bug in the broken code.
    line: lineAt(broken, site.start),
    tests: snippet.tests,
    html: snippet.html,
    fakeApi: snippet.fakeApi,
  }
}

/**
 * The SRS's `mutate(code, seed)`: same snippet + mutator + seed, same bug.
 * Mixing the ids into the seed means seed 42 picks independently for each
 * pair instead of always choosing, say, the first site.
 */
export function buildChallenge(
  snippet: Snippet,
  mutator: Mutator,
  seed: number,
  source: Source = 'example',
): Challenge {
  const { sites } = sitesFor(snippet, mutator)
  if (sites.length === 0) {
    throw new Error(`Mutator "${mutator.id}" does not apply to snippet "${snippet.id}"`)
  }
  const rng = mulberry32(hashSeed(`${snippet.id}:${mutator.id}:${seed}`))
  return buildChallengeAt(snippet, mutator, pickOne(sites, rng), seed, source)
}

/**
 * Every pickable challenge that matches the filter: each (snippet, mutator)
 * pair where the mutator applies, then each generated problem.
 */
export function candidates(registry: Registry, filter: PickFilter = {}): Candidate[] {
  const all: Candidate[] = []
  for (const mutator of registry.mutators) {
    for (const snippet of registry.snippets) {
      if (!appliesTo(snippet, mutator)) continue
      all.push({
        target: { kind: 'mutated', snippetId: snippet.id, mutatorId: mutator.id },
        // Category is the *bug's* category: picking "HTTP & APIs" should give
        // you an HTTP bug, whichever snippet it lands in.
        category: mutator.category,
        difficulty: snippet.difficulty ?? 'medium',
        source: pairSource(registry, snippet, mutator),
        bugType: mutator.id,
        bugName: mutator.name,
      })
    }
  }
  for (const problem of registry.generated) {
    all.push({
      target: { kind: 'generated', id: problem.id },
      category: problem.category,
      difficulty: problem.difficulty,
      source: 'ai-generated',
      bugType: problem.bugType,
      bugName: problem.bugName,
    })
  }
  return all.filter(
    (c) =>
      (!filter.category || c.category === filter.category) &&
      (!filter.difficulty || c.difficulty === filter.difficulty) &&
      (!filter.bugType || c.bugType === filter.bugType) &&
      (!filter.source || c.source === filter.source),
  )
}

/** Every bug type on offer, for the picker and the progress view. Sorted by name. */
export function bugTypes(registry: Registry): Array<{ id: string; name: string; category: Category }> {
  const seen = new Map<string, { id: string; name: string; category: Category }>()
  for (const c of candidates(registry)) {
    if (!seen.has(c.bugType)) seen.set(c.bugType, { id: c.bugType, name: c.bugName, category: c.category })
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/** Choose a challenge for the picker's filter. Null if nothing matches. */
export function pickTarget(registry: Registry, filter: PickFilter, seed: number): Target | null {
  const pool = candidates(registry, filter)
  if (pool.length === 0) return null
  // The filter is part of the hash so "seed 5, any bug" and "seed 5, DOM bugs"
  // don't always land on related picks.
  const key = [filter.category, filter.difficulty, filter.bugType, filter.source].map((v) => v ?? '*').join(':')
  const rng = mulberry32(hashSeed(`pick:${key}:${seed}`))
  return pickOne(pool, rng).target
}

/** Rebuild a challenge from a URL target. Null if it no longer exists. */
export function challengeFor(registry: Registry, target: Target, seed = 0): Challenge | null {
  if (target.kind === 'generated') {
    const problem = registry.generated.find((p) => p.id === target.id)
    return problem ? challengeFromGenerated(problem) : null
  }
  const snippet = registry.snippets.find((s) => s.id === target.snippetId)
  const mutator = registry.mutators.find((m) => m.id === target.mutatorId)
  if (!snippet || !mutator || !appliesTo(snippet, mutator)) return null
  return buildChallenge(snippet, mutator, seed, pairSource(registry, snippet, mutator))
}

/** Pick and build a challenge in one step. Returns null if nothing matches. */
export function pickChallenge(registry: Registry, filter: PickFilter, seed: number): Challenge | null {
  const target = pickTarget(registry, filter, seed)
  return target && challengeFor(registry, target, seed)
}
