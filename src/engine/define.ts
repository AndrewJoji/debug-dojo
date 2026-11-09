import type { Mutator, Snippet } from './types'

// These helpers do nothing at runtime: they return what you pass in.
// They exist so a snippet or mutator file gets full type-checking and
// editor autocomplete with one import, without spelling out the type.

export function defineSnippet(snippet: Snippet): Snippet {
  return snippet
}

export function defineMutator(mutator: Mutator): Mutator {
  return mutator
}
