import { Lock } from 'lucide-react'
import { Button } from './components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { InlineCode } from './InlineCode'

const STEP_NAMES = ['Where to look', "What's wrong", 'How to fix'] as const

interface HintLadderProps {
  hints: [string, string, string]
  opened: number
  /** Hints stay locked until the first Run, to force a real attempt first. */
  unlocked: boolean
  onOpen: () => void
}

// FR-5: three hints, opened one at a time, on purpose, and counted.
export function HintLadder({ hints, opened, unlocked, onOpen }: HintLadderProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          Hints
          <span className="text-sm font-normal text-muted-foreground">{opened} of 3 used</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {!unlocked && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="size-4" aria-hidden /> Run your code once to unlock hints.
          </p>
        )}
        <ol className="grid gap-2">
          {hints.slice(0, opened).map((hint, i) => (
            <li key={i} className="rounded-md border p-3 text-sm">
              <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Hint {i + 1}: {STEP_NAMES[i]}
              </p>
              <InlineCode text={hint} />
            </li>
          ))}
        </ol>
        {opened < 3 && (
          <Button variant="secondary" disabled={!unlocked} onClick={onOpen}>
            Show hint {opened + 1}: {STEP_NAMES[opened]}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
