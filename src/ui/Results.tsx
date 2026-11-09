import { CheckCircle2, CircleAlert, Loader2, XCircle } from 'lucide-react'
import type { RunResult } from '../engine/types'
import { Alert, AlertDescription, AlertTitle } from './components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'

const STATUS_TITLES: Record<Exclude<RunResult['status'], 'ran'>, string> = {
  'syntax-error': 'Error: the code does not parse',
  timeout: 'Error: time limit reached',
  crashed: 'Error: the code crashed before the tests ran',
}

// FR-4: pass/fail per test with the error output. Pass/fail is always shown
// as an icon AND a word, never by colour alone (SRS accessibility).
export function Results({ result, running }: { result: RunResult | null; running: boolean }) {
  const passed = result?.tests.filter((t) => t.passed).length ?? 0
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          Tests
          {result && result.tests.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              {passed} of {result.tests.length} passing
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent aria-live="polite" className="grid gap-3">
        {running && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> Running…
          </p>
        )}
        {!running && !result && (
          <p className="text-sm text-muted-foreground">Press Run (or Ctrl+Enter) to run the tests against your code.</p>
        )}
        {!running && result && result.status !== 'ran' && (
          <Alert variant="destructive">
            <CircleAlert aria-hidden />
            <AlertTitle>{STATUS_TITLES[result.status]}</AlertTitle>
            <AlertDescription className="font-mono text-xs whitespace-pre-wrap">{result.message}</AlertDescription>
          </Alert>
        )}
        {!running && result && result.tests.length > 0 && (
          <ul className="grid gap-2">
            {result.tests.map((test) => (
              <li key={test.name} className="rounded-md border p-2 text-sm">
                <div className="flex items-start gap-2">
                  {test.passed ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                  ) : (
                    <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                  )}
                  <span>
                    <strong className={test.passed ? 'text-success' : 'text-destructive'}>
                      {test.passed ? 'PASS' : 'FAIL'}
                    </strong>{' '}
                    {test.name}
                  </span>
                </div>
                {test.error && (
                  <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 font-mono text-xs whitespace-pre-wrap">
                    {test.error}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
