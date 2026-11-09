import type { Registry } from './challenge'
import type { Mutator, Snippet } from './types'

// FR-10: adding a snippet or mutator means adding one file, nothing else.
// Vite's import.meta.glob finds every file in the folder at build time, so
// there is no list to update. Each file must `export default` its object.

const snippetFiles = import.meta.glob<{ default: Snippet }>('../snippets/*.ts', { eager: true })
const mutatorFiles = import.meta.glob<{ default: Mutator }>('../mutators/*.ts', { eager: true })

/**
 * Collect the default exports and check the basics, so a mistake in a new
 * file fails loudly with its filename instead of as a confusing UI bug.
 */
function collect<T extends { id: string }>(
  files: Record<string, { default: T }>,
  check: (item: T, file: string) => void,
): T[] {
  const seen = new Map<string, string>()
  const items: T[] = []
  for (const [file, mod] of Object.entries(files)) {
    const item = mod.default
    if (!item) throw new Error(`${file} has no default export`)
    check(item, file)
    const clash = seen.get(item.id)
    if (clash) throw new Error(`Duplicate id "${item.id}" in ${file} and ${clash}`)
    seen.set(item.id, file)
    items.push(item)
  }
  // Sort by id so the order never depends on how the filesystem lists files;
  // the seeded picker relies on a stable order.
  return items.sort((a, b) => a.id.localeCompare(b.id))
}

function checkSnippet(snippet: Snippet, file: string): void {
  if (!snippet.code.trim()) throw new Error(`${file}: snippet has no code`)
  if (!snippet.tests.includes('test(')) throw new Error(`${file}: snippet has no test() calls`)
}

function checkMutator(mutator: Mutator, file: string): void {
  if (mutator.hints.length !== 3) {
    throw new Error(`${file}: mutator needs exactly 3 hints (where, what, how)`)
  }
}

export const registry: Registry = {
  snippets: collect(snippetFiles, checkSnippet),
  mutators: collect(mutatorFiles, checkMutator),
}
