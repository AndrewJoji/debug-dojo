import type { FakeApi, RunResult } from '../engine/types'
import { guardLoops } from './loop-guard'
import type { HarnessJob } from './runtime/harness'

// Shared by the browser runner and the Vitest runner, so both prepare code
// the same way before it reaches the harness.

/** NFR "Safe execution": user code gets 3 seconds, then it's stopped. */
export const RUN_TIMEOUT_MS = 3000
export const TIMEOUT_MESSAGE =
  'Stopped: your code ran for more than 3 seconds. Look for an infinite loop or a promise that never settles.'

/** What a Run needs: the user's current code plus the snippet's tests and setup. */
export interface RunRequest {
  code: string
  tests: string
  html?: string
  fakeApi?: FakeApi
}

/**
 * Guard loops in both the user's code and the tests. Returns either a job
 * ready for the harness, or a finished RunResult when the code won't parse.
 */
export function prepareJob(request: RunRequest): HarnessJob | RunResult {
  const code = guardLoops(request.code)
  if (!code.ok) {
    return { status: 'syntax-error', tests: [], message: `Line ${code.line}: ${code.message}` }
  }
  const tests = guardLoops(request.tests)
  if (!tests.ok) {
    // This is a bug in the snippet file, not in the user's fix.
    return { status: 'syntax-error', tests: [], message: `Snippet tests don't parse (line ${tests.line}): ${tests.message}` }
  }
  return {
    code: code.code,
    tests: tests.code,
    fakeApi: request.fakeApi ?? {},
    timeoutMs: RUN_TIMEOUT_MS,
    timeoutMessage: TIMEOUT_MESSAGE,
  }
}

/** Tell the two possible return types of prepareJob apart. */
export function isRunResult(value: HarnessJob | RunResult): value is RunResult {
  return 'status' in value
}
