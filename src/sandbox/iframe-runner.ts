import type { RunResult } from '../engine/types'
import { isRunResult, prepareJob, RUN_TIMEOUT_MS, TIMEOUT_MESSAGE, type RunRequest } from './prepare'
import { createFakeFetch } from './runtime/fake-fetch'
import { runHarness } from './runtime/harness'

// Runs user code in a throwaway, sandboxed iframe and waits for the result.
//
// sandbox="allow-scripts" (and deliberately NOT allow-same-origin) gives the
// iframe an opaque origin: scripts run, but they can't read this page's DOM,
// localStorage or cookies. postMessage is the only way in or out.
//
// Message flow:
//   1. iframe loads and posts { type: 'ready' }
//   2. we post the job (guarded code + tests + fake API routes)
//   3. iframe runs the harness and posts { type: 'result', result }
// A kill timer covers the case where step 3 never happens.

// Small grace period on top of the harness's own deadline, so the harness
// normally reports the timeout itself (with per-test detail) before we kill it.
const KILL_AFTER_MS = RUN_TIMEOUT_MS + 750

/** The page that boots inside the iframe. The runtime arrives as source text. */
function sandboxPage(html: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body>${html}
<script>
const createFakeFetch = ${String(createFakeFetch)};
const runHarness = ${String(runHarness)};
window.addEventListener('message', async (event) => {
  if (event.source !== window.parent) return;
  const result = await runHarness(event.data, createFakeFetch, window);
  window.parent.postMessage({ type: 'debug-dojo:result', result }, '*');
}, { once: true });
window.parent.postMessage({ type: 'debug-dojo:ready' }, '*');
</script>
</body></html>`
}

export function runInIframe(request: RunRequest): Promise<RunResult> {
  const job = prepareJob(request)
  // Syntax errors are caught before we bother creating an iframe.
  if (isRunResult(job)) return Promise.resolve(job)

  return new Promise((resolve) => {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('sandbox', 'allow-scripts')
    iframe.setAttribute('aria-hidden', 'true')
    iframe.tabIndex = -1
    iframe.style.display = 'none'

    const finish = (result: RunResult) => {
      clearTimeout(killTimer)
      window.removeEventListener('message', onMessage)
      iframe.remove() // destroys the iframe's whole JS world, timers and all
      resolve(result)
    }

    const onMessage = (event: MessageEvent) => {
      // The iframe's origin is opaque ("null"), so we can't check
      // event.origin. Checking the sender window is the reliable test.
      if (event.source !== iframe.contentWindow) return
      const data = event.data as { type?: string; result?: RunResult }
      if (data.type === 'debug-dojo:ready') {
        iframe.contentWindow?.postMessage(job, '*')
      } else if (data.type === 'debug-dojo:result' && data.result) {
        finish(data.result)
      }
    }

    const killTimer = setTimeout(
      () => finish({ status: 'timeout', tests: [], message: TIMEOUT_MESSAGE }),
      KILL_AFTER_MS,
    )
    window.addEventListener('message', onMessage)
    iframe.srcdoc = sandboxPage(request.html ?? '')
    document.body.appendChild(iframe)
  })
}
