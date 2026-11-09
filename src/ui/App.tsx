import { useMemo, useState, type ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'
import { buildChallenge, appliesTo } from '../engine/challenge'
import { loadProgress, recordOutcome, saveProgress, type Outcome, type Progress } from '../engine/progress'
import { registry } from '../engine/registry'
import { Alert, AlertDescription, AlertTitle } from './components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { ChallengeView } from './ChallengeView'
import { Picker } from './Picker'
import { ProgressView } from './ProgressView'
import { useRoute } from './route'
import { browserStorage } from './storage'
import { cn } from './lib/utils'

const storage = browserStorage()

export function App() {
  const route = useRoute()
  const [progress, setProgress] = useState<Progress>(() => loadProgress(storage))

  const recordFinish = (outcome: Outcome) => {
    setProgress((current) => {
      const next = recordOutcome(current, outcome)
      saveProgress(storage, next)
      return next
    })
  }

  // Build the challenge from the URL. Same URL, same bug, every time.
  const challenge = useMemo(() => {
    if (route.page !== 'challenge') return null
    const snippet = registry.snippets.find((s) => s.id === route.snippetId)
    const mutator = registry.mutators.find((m) => m.id === route.mutatorId)
    if (!snippet || !mutator || !appliesTo(snippet, mutator)) return 'invalid' as const
    return buildChallenge(snippet, mutator, route.seed)
  }, [route])

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <a href="#/" className="font-mono text-lg font-semibold">
            debug-dojo
          </a>
          <nav aria-label="Main" className="flex gap-1 text-sm">
            <NavLink href="#/" active={route.page !== 'progress'}>
              Practice
            </NavLink>
            <NavLink href="#/progress" active={route.page === 'progress'}>
              Progress
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6">
        {route.page !== 'progress' && <Picker />}

        {route.page === 'home' && <Welcome />}
        {route.page === 'progress' && <ProgressView progress={progress} />}
        {challenge === 'invalid' && (
          <Alert variant="destructive">
            <CircleAlert aria-hidden />
            <AlertTitle>Error: this challenge link doesn't match any snippet</AlertTitle>
            <AlertDescription>The snippet or bug type may have been renamed. Pick a new challenge above.</AlertDescription>
          </Alert>
        )}
        {challenge && challenge !== 'invalid' && (
          // The key resets all challenge state when the URL changes.
          <ChallengeView key={window.location.hash} challenge={challenge} onFinish={recordFinish} />
        )}
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-8 text-xs text-muted-foreground">
        No AI, no backend: your code runs in a sandboxed iframe in this browser.{' '}
        <a className="underline underline-offset-4" href="https://github.com/AndrewJoji/debug-dojo">
          Source on GitHub
        </a>
      </footer>
    </div>
  )
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <a
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn('rounded-md px-3 py-1.5', active ? 'bg-secondary font-medium' : 'text-muted-foreground hover:text-foreground')}
    >
      {children}
    </a>
  )
}

function Welcome() {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Find the bug. Fix it. Know why.</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm leading-relaxed">
        <p>
          Each challenge takes a small, working piece of JavaScript, HTML or API code and injects one realistic bug.
          You get a symptom report, like a customer ticket, and the code.
        </p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Read the ticket and the code.</li>
          <li>Press Run to see which tests fail. Hints unlock after your first run.</li>
          <li>Fix the code until every test passes.</li>
          <li>Read why it broke, with links to MDN.</li>
        </ol>
        <p className="text-muted-foreground">
          {registry.snippets.length} snippets and {registry.mutators.length} bug types so far. Pick a category above, or
          press Random.
        </p>
      </CardContent>
    </Card>
  )
}
