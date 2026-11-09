import type { RunResult } from '../engine/types'
import { isRunResult, prepareJob, type RunRequest } from './prepare'
import { createFakeFetch } from './runtime/fake-fetch'
import { runHarness } from './runtime/harness'

// Runs a snippet the same way the iframe does, but in the current JS context.
// Only for Vitest (with the jsdom environment, which supplies `document`).
// It is NOT a safety boundary: there is no isolation here, only the loop guard.

export async function runInNode(request: RunRequest): Promise<RunResult> {
  const job = prepareJob(request)
  if (isRunResult(job)) return job
  // A fresh body per run, matching a brand-new iframe in the browser.
  document.body.innerHTML = request.html ?? ''
  return runHarness(job, createFakeFetch, globalThis)
}
