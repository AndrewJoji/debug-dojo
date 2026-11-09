// Mutator hints and theory are plain strings. Text between backticks is shown
// as inline code, so `await` reads as code without needing Markdown.
export function InlineCode({ text }: { text: string }) {
  return (
    <>
      {text.split('`').map((part, i) =>
        // Odd-numbered parts sit between a pair of backticks.
        i % 2 === 1 ? (
          <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]">
            {part}
          </code>
        ) : (
          part
        ),
      )}
    </>
  )
}
