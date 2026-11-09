import { diffLines } from 'diff'
import { cn } from './lib/utils'

// FR-7: a line diff between the broken code and the original. Each line is
// marked with "+" or "−" as well as a background colour.
export function RevealDiff({ broken, original }: { broken: string; original: string }) {
  const parts = diffLines(broken, original)
  return (
    <pre className="overflow-x-auto rounded-md border font-mono text-xs leading-relaxed" aria-label="Diff from the broken code to the original">
      {parts.flatMap((part, partIndex) =>
        part.value
          .replace(/\n$/, '')
          .split('\n')
          .map((line, lineIndex) => (
            <div
              key={`${partIndex}-${lineIndex}`}
              className={cn('px-3', part.added && 'bg-diff-added', part.removed && 'bg-diff-removed')}
            >
              <span className="mr-3 inline-block w-3 select-none text-muted-foreground" aria-hidden>
                {part.added ? '+' : part.removed ? '−' : ' '}
              </span>
              <span className="sr-only">{part.added ? 'Original: ' : part.removed ? 'Broken: ' : ''}</span>
              {line || ' '}
            </div>
          )),
      )}
    </pre>
  )
}
