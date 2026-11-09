import type { FakeApi, RunResult, TestResult } from '../../engine/types'
import type { FakeApiControl } from './fake-fetch'

// The test harness: runs the user's code and the snippet's tests together,
// then reports which tests passed. The same function runs in two places:
//   - in the browser, inside the sandboxed iframe (via String(runHarness));
//   - in Vitest, called directly under jsdom (see ../node-runner.ts).
// So CI tests exactly the code the browser runs.
//
// RULE FOR THIS FOLDER: no runtime imports and nothing from outside the
// function body. Anything it needs (like createFakeFetch) comes in as a parameter.

export interface HarnessJob {
  /** User code, already passed through the loop guard. */
  code: string
  /** Snippet tests, already passed through the loop guard. */
  tests: string
  fakeApi: FakeApi
  /** Total time budget for the whole run, in milliseconds. */
  timeoutMs: number
  timeoutMessage: string
}

export async function runHarness(
  job: HarnessJob,
  createFakeFetch: (routes: FakeApi) => FakeApiControl,
  globalObject: { fetch: typeof fetch },
): Promise<RunResult> {
  // One deadline for the whole run. The loop guard checks it inside every
  // loop iteration; the per-test race below checks it while awaiting.
  const deadline = Date.now() + job.timeoutMs
  let timedOut = false
  function __guard(): void {
    if (Date.now() > deadline) {
      timedOut = true
      throw new Error(job.timeoutMessage)
    }
  }

  // --- the tiny test API snippets use: test(name, fn) and assert.* ---
  const registered: Array<{ name: string; fn: () => unknown }> = []
  function test(name: string, fn: () => unknown): void {
    registered.push({ name, fn })
  }

  // Show values the way a console would, so failures read like real bugs:
  // "expected ["A","B"] but got Promise { <pending> }".
  function show(value: unknown): string {
    if (value instanceof Promise) return 'Promise { <pending> }'
    if (value === undefined) return 'undefined'
    if (typeof value === 'function') return `function ${value.name || '(anonymous)'}`
    try {
      return JSON.stringify(value) ?? String(value)
    } catch {
      return String(value)
    }
  }
  function fail(message: string | undefined, fallback: string): never {
    throw new Error(message ?? fallback)
  }
  const assert = {
    ok(value: unknown, message?: string) {
      if (!value) fail(message, `expected a truthy value but got ${show(value)}`)
    },
    equal(actual: unknown, expected: unknown, message?: string) {
      if (!Object.is(actual, expected)) fail(message, `expected ${show(expected)} but got ${show(actual)}`)
    },
    // Compares via JSON, which is enough for the plain data snippets use.
    deepEqual(actual: unknown, expected: unknown, message?: string) {
      if (actual instanceof Promise || show(actual) !== show(expected)) {
        fail(message, `expected ${show(expected)} but got ${show(actual)}`)
      }
    },
    /** Passes if `fn` throws or rejects; `match` must appear in the error message. */
    async rejects(fn: () => unknown, match?: string, message?: string) {
      try {
        await fn()
      } catch (error) {
        const text = error instanceof Error ? error.message : String(error)
        if (match && !text.includes(match)) {
          fail(message, `expected an error containing "${match}" but got "${text}"`)
        }
        return
      }
      fail(message, match ? `expected an error containing "${match}" but nothing was thrown` : 'expected an error but nothing was thrown')
    },
  }

  // --- swap in the fake fetch for the duration of the run ---
  const api = createFakeFetch(job.fakeApi)
  const realFetch = globalObject.fetch
  globalObject.fetch = api.fetch as typeof fetch

  try {
    // Run user code and tests in ONE function body, so the tests can call
    // the snippet's functions by name. `new Function` gives the code its own
    // scope and only the names we hand it, like a fresh <script>.
    let program: (...args: unknown[]) => unknown
    try {
      program = new Function('test', 'assert', 'api', '__guard', `${job.code}\n;\n${job.tests}`) as typeof program
    } catch (error) {
      return { status: 'syntax-error', tests: [], message: error instanceof Error ? error.message : String(error) }
    }

    try {
      program(test, assert, api, __guard)
    } catch (error) {
      // Top-level code threw before any test could run.
      const message = error instanceof Error ? error.message : String(error)
      return { status: timedOut ? 'timeout' : 'crashed', tests: [], message }
    }

    const results: TestResult[] = []
    for (const { name, fn } of registered) {
      if (timedOut) {
        results.push({ name, passed: false, error: 'Not run: the time limit was already reached' })
        continue
      }
      api.reset() // each test starts with the snippet's routes and no recorded requests

      // Race the test against the deadline, so a promise that never settles
      // (e.g. an await on something that never resolves) can't hang the run.
      let timer: ReturnType<typeof setTimeout> | undefined
      const deadlinePassed = new Promise<Error>((resolve) => {
        timer = setTimeout(() => {
          timedOut = true
          resolve(new Error(job.timeoutMessage))
        }, Math.max(0, deadline - Date.now()))
      })
      const testFinished = Promise.resolve()
        .then(() => fn())
        .then(
          () => null, // passed
          (error: unknown) => (error instanceof Error ? error : new Error(String(error))),
        )
      const error = await Promise.race([testFinished, deadlinePassed])
      clearTimeout(timer)

      results.push(error ? { name, passed: false, error: error.message } : { name, passed: true })
    }

    return { status: timedOut ? 'timeout' : 'ran', tests: results, message: timedOut ? job.timeoutMessage : undefined }
  } finally {
    globalObject.fetch = realFetch
  }
}
