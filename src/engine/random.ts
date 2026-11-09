// Deterministic randomness. The SRS requires that the same snippet, mutator
// and seed always produce the same bug, so challenges can be repeated, shared
// by URL and tested. Math.random() can't be seeded, so we bring our own.

/**
 * Turn any string into a 32-bit unsigned integer (FNV-1a hash).
 * Used to mix "snippetId:mutatorId:seed" into one number, so the same seed
 * gives different (but still repeatable) picks for different challenges.
 */
export function hashSeed(text: string): number {
  let hash = 0x811c9dc5 // FNV offset basis: an agreed-on non-zero start value
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i) // fold the next character into the hash...
    hash = Math.imul(hash, 0x01000193) // ...then spread it with the FNV prime
  }
  return hash >>> 0 // `>>> 0` reinterprets the result as unsigned
}

/**
 * mulberry32: a tiny, well-known seeded PRNG. Returns a function that yields
 * a new float in [0, 1) on each call, always the same sequence for a seed.
 * It's not cryptographic; it only needs to be repeatable and spread evenly.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0 // step the state by a fixed odd constant
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1) // the next two lines scramble the bits
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296 // scale 32 bits down to [0, 1)
  }
}

/** Pick one item from a non-empty list using a seeded generator. */
export function pickOne<T>(items: readonly T[], rng: () => number): T {
  if (items.length === 0) throw new Error('pickOne: cannot pick from an empty list')
  return items[Math.floor(rng() * items.length)]
}

/** A fresh random seed for "Random" mode. Kept small so it reads well in a URL. */
export function newSeed(): number {
  const buffer = new Uint32Array(1)
  crypto.getRandomValues(buffer)
  return buffer[0] % 1_000_000
}
