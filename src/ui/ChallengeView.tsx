import { useRef, useState } from 'react'
import { CheckCircle2, Eye, Play, RotateCcw } from 'lucide-react'
import type { Outcome } from '../engine/progress'
import { CATEGORY_LABELS, type Challenge, type RunResult } from '../engine/types'
import { runInIframe } from '../sandbox/iframe-runner'
import { Alert, AlertDescription, AlertTitle } from './components/ui/alert'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog'
import { Editor } from './Editor'
import { formatDuration } from './format'
import { HintLadder } from './HintLadder'
import { Results } from './Results'
import { RevealDiff } from './RevealDiff'
import { Theory } from './Theory'

interface ChallengeViewProps {
  challenge: Challenge
  /** Called once per challenge, on the first solve or reveal. */
  onFinish: (outcome: Outcome) => void
}

// One challenge from ticket to theory. The parent gives this component a new
// `key` for each challenge, so all the state below starts fresh every time.
export function ChallengeView({ challenge, onFinish }: ChallengeViewProps) {
  const { snippet, mutator } = challenge
  const [code, setCode] = useState(challenge.broken)
  const [editorKey, setEditorKey] = useState(0)
  const [result, setResult] = useState<RunResult | null>(null)
  const [running, setRunning] = useState(false)
  const [hasRun, setHasRun] = useState(false)
  const [hintsOpened, setHintsOpened] = useState(0)
  const [finished, setFinished] = useState<{ result: Outcome['result']; timeMs: number } | null>(null)
  const startedAt = useRef(Date.now())
  // A ref, not just state: `run` awaits the sandbox, so its copy of `finished`
  // can be stale by the time it calls finish().
  const finishedRef = useRef(false)

  const finish = (outcome: Outcome['result']) => {
    if (finishedRef.current) return // only the first solve or reveal counts
    finishedRef.current = true
    const timeMs = Date.now() - startedAt.current
    setFinished({ result: outcome, timeMs })
    onFinish({ mutatorId: mutator.id, result: outcome, hintsUsed: hintsOpened, timeMs, at: new Date() })
  }

  const run = async () => {
    if (running) return
    setRunning(true)
    const runResult = await runInIframe({ code, tests: snippet.tests, html: snippet.html, fakeApi: snippet.fakeApi })
    setResult(runResult)
    setRunning(false)
    setHasRun(true)
    const allPassed = runResult.status === 'ran' && runResult.tests.length > 0 && runResult.tests.every((t) => t.passed)
    if (allPassed) finish('solved')
  }

  const resetCode = () => {
    setCode(challenge.broken)
    setEditorKey((k) => k + 1) // remount the editor with the broken code
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid content-start gap-4">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{CATEGORY_LABELS[snippet.category]}</Badge>
              {/* The bug type gives the answer away, so it only appears once you're done. */}
              {finished && <Badge variant="secondary">Bug: {mutator.name}</Badge>}
              <span className="text-xs text-muted-foreground">Ticket DD-{challenge.seed}</span>
            </div>
            <CardTitle className="text-lg">{snippet.title}</CardTitle>
            <CardDescription className="text-base text-foreground">“{challenge.ticket}”</CardDescription>
          </CardHeader>
          {snippet.html && (
            <CardContent>
              <details>
                <summary className="cursor-pointer text-sm font-medium">Page HTML (read-only)</summary>
                <div className="mt-2">
                  <Editor initialValue={snippet.html} language="html" readOnly label="Page HTML, read-only" />
                </div>
              </details>
            </CardContent>
          )}
        </Card>

        {finished?.result === 'solved' && (
          <Alert>
            <CheckCircle2 className="text-success" aria-hidden />
            <AlertTitle>Solved in {formatDuration(finished.timeMs)}</AlertTitle>
            <AlertDescription>
              {hintsOpened === 0 ? 'No hints used.' : `${hintsOpened} hint${hintsOpened > 1 ? 's' : ''} used.`} Read the
              theory below, then try another.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-2">
          <Editor
            key={editorKey}
            initialValue={code}
            language="javascript"
            onChange={setCode}
            onRun={run}
            label="Code editor. Press Control+Enter to run the tests."
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={run} disabled={running}>
              <Play aria-hidden /> Run <kbd className="ml-1 text-xs opacity-70">Ctrl+Enter</kbd>
            </Button>
            <Button variant="outline" onClick={resetCode}>
              <RotateCcw aria-hidden /> Reset code
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost">
                  <Eye aria-hidden /> {finished ? 'Compare with original' : 'Reveal answer'}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{finished ? 'The bug, line by line' : 'Reveal the answer?'}</DialogTitle>
                  <DialogDescription>
                    {finished
                      ? `The bug was injected on line ${challenge.line}. Lines marked − are the broken code; + is the original.`
                      : 'This counts as a reveal, not a solve, in your progress.'}
                  </DialogDescription>
                </DialogHeader>
                {finished ? (
                  <RevealDiff broken={challenge.broken} original={challenge.original} />
                ) : (
                  <Button onClick={() => finish('revealed')}>Show the answer</Button>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="grid content-start gap-4">
        <Results result={result} running={running} />
        <HintLadder hints={mutator.hints} opened={hintsOpened} unlocked={hasRun} onOpen={() => setHintsOpened((n) => Math.min(3, n + 1))} />
        {finished && <Theory mutator={mutator} />}
      </div>
    </div>
  )
}
