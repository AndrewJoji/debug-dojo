import { useMemo, useState, type ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'
import { candidates, challengeFor } from '../engine/challenge'
import { loadProgress, recordOutcome, saveProgress, type Outcome, type Progress } from '../engine/progress'
import { registry } from '../engine/registry'
import { DIFFICULTY_LABELS, SOURCE_LABELS, type Difficulty, type Source } from '../engine/types'
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
  const challenge = useMemo(
    () => (route.page === 'challenge' ? (challengeFor(registry, route.target, route.seed) ?? 'invalid') : null),
    [route],
  )

  // Challenges need room for the editor and side panel; every other page is
  // a single centered column, so the header, picker and content line up.
  const width = route.page === 'challenge' ? 'max-w-7xl' : 'max-w-3xl'

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className={cn('mx-auto flex w-full items-center justify-between gap-3 px-4 py-3', width)}>
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

      <main className={cn('mx-auto grid w-full flex-1 content-start gap-6 px-4 py-8', width)}>
        {route.page === 'home' && <Home />}
        {route.page === 'progress' && <ProgressView progress={progress} />}
        {route.page === 'challenge' && <Picker />}
        {challenge === 'invalid' && (
          <Alert variant="destructive">
            <CircleAlert aria-hidden />
            <AlertTitle>Error: this challenge link doesn't match any challenge</AlertTitle>
            <AlertDescription>It may have been renamed or removed. Pick a new challenge above.</AlertDescription>
          </Alert>
        )}
        {challenge && challenge !== 'invalid' && (
          // The key resets all challenge state when the URL changes.
          <ChallengeView key={window.location.hash} challenge={challenge} onFinish={recordFinish} />
        )}
      </main>

      <footer className={cn('mx-auto w-full px-4 pb-8 text-xs text-muted-foreground', width)}>
        No AI while you practise, no backend: your code runs in a sandboxed iframe in this browser.{' '}
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

function Home() {
  const all = candidates(registry)
  const count = <K extends 'difficulty' | 'source'>(key: K, value: string) => all.filter((c) => c[key] === value).length

  return (
    <>
      <section className="grid gap-3 py-4 text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Find the bug. Fix it. Know why.</h1>
        <p className="mx-auto max-w-xl text-muted-foreground">
          Each challenge is a small, working piece of JavaScript, HTML or API code with one realistic bug in it, a
          symptom report written like a customer ticket, and tests that tell you when it's fixed.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Start a challenge</CardTitle>
        </CardHeader>
        <CardContent>
          <Picker />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How it works</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed">
              <li>Read the ticket and the code.</li>
              <li>Press Run to see which tests fail. Hints unlock after your first run.</li>
              <li>Fix the code until every test passes.</li>
              <li>Read why it broke, with links to MDN.</li>
            </ol>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{all.length} challenges</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => (
                <Stat key={d} label={DIFFICULTY_LABELS[d]} value={count('difficulty', d)} />
              ))}
              {(Object.keys(SOURCE_LABELS) as Source[]).map((s) => (
                <Stat key={s} label={SOURCE_LABELS[s]} value={count('source', s)} />
              ))}
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              AI-generated problems are written ahead of time, reviewed and tested before they ship. Nothing calls AI
              while you practise.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </>
  )
}
