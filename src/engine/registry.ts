import { validateGenerated } from './generated'
import type { GeneratedProblem, Mutator, Snippet, Source } from './types'

// FR-10: adding a snippet, mutator or generated problem means adding one
// file, nothing else. Vite's import.meta.glob finds every file in the folder
// at build time, so there is no list to update.

const snippetFiles = import.meta.glob<{ default: Snippet }>('../snippets/*.ts', { eager: true })
const mutatorFiles = import.meta.glob<{ default: Mutator }>('../mutators/*.ts', { eager: true })
const generatedFiles = import.meta.glob<unknown>('../generated/*.json', { eager: true, import: 'default' })

// The same snippet and mutator files again, as plain text, to read their
// first line: "// hand-written" or "// scaffold-example". That header is the
// one place authorship is recorded, so the UI and the README can't disagree.
const sourceText = import.meta.glob<string>(['../snippets/*.ts', '../mutators/*.ts'], {
  eager: true,
  query: '?raw',
  import: 'default',
})

function sourceOf(file: string): Source {
  return (sourceText[file] ?? '').startsWith('// hand-written') ? 'hand-written' : 'example'
}

export interface Registry {
  snippets: Snippet[]
  mutators: Mutator[]
  generated: GeneratedProblem[]
  /** Who wrote each snippet and mutator, keyed by "snippet:<id>" / "mutator:<id>". */
  sources: Record<string, Source>
  /** Generated files that failed validation. The app skips them; CI fails on them. */
  generatedErrors: string[]
}

/**
 * Collect the default exports and check the basics, so a mistake in a new
 * file fails loudly with its filename instead of as a confusing UI bug.
 */
function collect<T extends { id: string }>(
  files: Record<string, { default: T }>,
  kind: 'snippet' | 'mutator',
  check: (item: T, file: string) => void,
  sources: Record<string, Source>,
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
    sources[`${kind}:${item.id}`] = sourceOf(file)
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

/**
 * Generated files come from an AI generator, so one bad file must not take
 * the whole site down: it is skipped and its error recorded for CI to fail on.
 */
function collectGenerated(errors: string[]): GeneratedProblem[] {
  const problems: GeneratedProblem[] = []
  for (const [file, raw] of Object.entries(generatedFiles)) {
    try {
      problems.push(validateGenerated(raw, file))
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
  }
  return problems.sort((a, b) => a.id.localeCompare(b.id))
}

function buildRegistry(): Registry {
  const sources: Record<string, Source> = {}
  const generatedErrors: string[] = []
  return {
    snippets: collect(snippetFiles, 'snippet', checkSnippet, sources),
    mutators: collect(mutatorFiles, 'mutator', checkMutator, sources),
    generated: collectGenerated(generatedErrors),
    sources,
    generatedErrors,
  }
}

export const registry: Registry = buildRegistry()
