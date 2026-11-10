import { bugTypes } from '../engine/challenge'
import { emptyStats, type Progress } from '../engine/progress'
import { registry } from '../engine/registry'
import { CATEGORY_LABELS } from '../engine/types'
import { Badge } from './components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { formatDuration } from './format'

// FR-8: progress per bug type, so weak spots show up.
// A bug type counts as a weak spot once tried, if you solve fewer than half
// without revealing, or lean on two or more hints per attempt on average.
export function ProgressView({ progress }: { progress: Progress }) {
  const rows = bugTypes(registry).map((type) => {
    const stats = progress[type.id] ?? emptyStats()
    const solveRate = stats.attempts ? stats.solves / stats.attempts : 0
    const hintsPerAttempt = stats.attempts ? stats.hintsUsed / stats.attempts : 0
    const weak = stats.attempts > 0 && (solveRate < 0.5 || hintsPerAttempt >= 2)
    return { type, stats, solveRate, hintsPerAttempt, weak }
  })
  // Tried bug types first, weakest first, so the list reads as "work on these".
  rows.sort((a, b) => Number(b.stats.attempts > 0) - Number(a.stats.attempts > 0) || Number(b.weak) - Number(a.weak))

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl font-semibold">Progress</h1>
        <p className="text-sm text-muted-foreground">Saved in this browser only. One row per bug type.</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {rows.map(({ type, stats, solveRate, hintsPerAttempt, weak }) => (
          <li key={type.id}>
            <Card className="h-full">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{CATEGORY_LABELS[type.category]}</Badge>
                  {weak && <Badge variant="destructive">Weak spot</Badge>}
                </div>
                <CardTitle className="text-base">{type.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.attempts === 0 ? (
                  <p className="text-sm text-muted-foreground">Not tried yet.</p>
                ) : (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">Attempts</dt>
                    <dd>{stats.attempts}</dd>
                    <dt className="text-muted-foreground">Solved</dt>
                    <dd>
                      {stats.solves} ({Math.round(solveRate * 100)}%)
                    </dd>
                    <dt className="text-muted-foreground">Revealed</dt>
                    <dd>{stats.reveals}</dd>
                    <dt className="text-muted-foreground">Hints per attempt</dt>
                    <dd>{hintsPerAttempt.toFixed(1)}</dd>
                    <dt className="text-muted-foreground">Best time</dt>
                    <dd>{stats.bestTimeMs === null ? 'n/a' : formatDuration(stats.bestTimeMs)}</dd>
                  </dl>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}
