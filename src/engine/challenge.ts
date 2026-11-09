import { lineAt, stripMarkers } from './markers'
import { hashSeed, mulberry32, pickOne } from './random'
import type { Category, Challenge, Mutator, Site, Snippet } from './types'

// This file turns "a snippet, a mutator and a seed" into a challenge.
// Mutators only answer two questions (where could the bug go? break it there),
// so all the seed handling lives here, in one place.

export interface Registry {
  snippets: Snippet[]
  mutators: Mutator[]
}

/** What the user chose in the picker. Leave both out for Random. */
export interface PickFilter {
  category?: Category
  mutatorId?: string
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

/** Inject the bug at one specific site. The tests use this to try every site. */
export function buildChallengeAt(
  snippet: Snippet,
  mutator: Mutator,
  site: Site,
  seed = 0,
): Challenge {
  const { code } = stripMarkers(snippet.code)
  const broken = mutator.breakAt(code, site)
  return {
    snippet,
    mutator,
    seed,
    original: code,
    broken,
    // Text before `site.start` is untouched by the edit, so this offset still
    // points at the start of the bug in the broken code.
    line: lineAt(broken, site.start),
    ticket: mutator.ticket || snippet.ticket,
  }
}

/**
 * The SRS's `mutate(code, seed)`: same snippet + mutator + seed, same bug.
 * Mixing the ids into the seed means seed 42 picks independently for each
 * pair instead of always choosing, say, the first site.
 */
export function buildChallenge(snippet: Snippet, mutator: Mutator, seed: number): Challenge {
  const { sites } = sitesFor(snippet, mutator)
  if (sites.length === 0) {
    throw new Error(`Mutator "${mutator.id}" does not apply to snippet "${snippet.id}"`)
  }
  const rng = mulberry32(hashSeed(`${snippet.id}:${mutator.id}:${seed}`))
  return buildChallengeAt(snippet, mutator, pickOne(sites, rng), seed)
}

/** Every (snippet, mutator) pair where the mutator applies, filtered by the picker. */
export function matchingPairs(
  registry: Registry,
  filter: PickFilter = {},
): Array<{ snippet: Snippet; mutator: Mutator }> {
  const pairs: Array<{ snippet: Snippet; mutator: Mutator }> = []
  for (const mutator of registry.mutators) {
    if (filter.mutatorId && mutator.id !== filter.mutatorId) continue
    // Category filters on the *bug's* category: picking "HTTP & APIs" should
    // give you an HTTP bug, whichever snippet it lands in.
    if (filter.category && mutator.category !== filter.category) continue
    for (const snippet of registry.snippets) {
      if (appliesTo(snippet, mutator)) pairs.push({ snippet, mutator })
    }
  }
  return pairs
}

/** Choose which snippet and mutator to pair for the picker's filter. Null if nothing matches. */
export function pickPair(
  registry: Registry,
  filter: PickFilter,
  seed: number,
): { snippet: Snippet; mutator: Mutator } | null {
  const pairs = matchingPairs(registry, filter)
  if (pairs.length === 0) return null
  // The filter is part of the hash so "seed 5, any bug" and "seed 5, DOM bugs"
  // don't always land on related picks.
  const rng = mulberry32(hashSeed(`pick:${filter.category ?? '*'}:${filter.mutatorId ?? '*'}:${seed}`))
  return pickOne(pairs, rng)
}

/** Pick and build a challenge in one step. Returns null if nothing matches. */
export function pickChallenge(
  registry: Registry,
  filter: PickFilter,
  seed: number,
): Challenge | null {
  const pair = pickPair(registry, filter, seed)
  return pair && buildChallenge(pair.snippet, pair.mutator, seed)
}
