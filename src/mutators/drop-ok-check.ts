// scaffold-example (written by Claude)
import { defineMutator } from '../engine/define'
import type { Site } from '../engine/types'

// Unchecked res.ok: delete the line that turns an HTTP error into a thrown
// error. fetch() only rejects on network failure, so without this check a
// 4xx/5xx error body flows on as if it were real data.
//
// Only the one-line form is matched:  if (!res.ok) throw new Error(...)
// A braced, multi-line guard is left alone, which keeps the bug to one line.

// Start of a line, optional indent, `if (!<name>.ok) throw`, rest of the line,
// and the newline itself (so removing it doesn't leave a blank line behind).
const OK_GUARD_LINE = /^[ \t]*if\s*\(\s*!\s*[\w$]+\.ok\s*\)\s*throw\b[^\n]*\n/gm

export default defineMutator({
  id: 'drop-ok-check',
  name: 'Unchecked res.ok',
  category: 'http-api',
  tag: 'ok-check',

  findSites(code) {
    const sites: Site[] = []
    for (const match of code.matchAll(OK_GUARD_LINE)) {
      sites.push({ start: match.index, end: match.index + match[0].length })
    }
    return sites
  },

  breakAt(code, site) {
    return code.slice(0, site.start) + code.slice(site.end)
  },

  ticket:
    "When the API has a bad moment, users get a confusing crash (something about undefined or 'is not a function') instead of a clear error. From the screenshots, support can't tell the server was the problem.",

  hints: [
    'Look at what happens right after the response arrives, before the body is read. What happens when the status is 500?',
    'fetch() only rejects when the network fails. A 404 or 500 still resolves normally, so nothing stops the code from treating the error body as real data.',
    'Check res.ok (true only for statuses 200 to 299) and throw an error that includes res.status before you read the body.',
  ],

  theory:
    "A fetch() that resolves only means the server answered. HTTP errors (4xx, 5xx) arrive as normal Response objects with res.ok === false. Your code has to check, usually with `if (!res.ok) throw new Error('Request failed: ' + res.status)`, before calling res.json(). Otherwise the error body (often {\"error\": \"...\"}) flows into code that expects real data and breaks somewhere far away, with a message that hides the real cause. It's one of the most common bugs in API integrations, and one of the first things to check when a customer reports a vague crash.",

  links: [
    { label: 'MDN: Response.ok', href: 'https://developer.mozilla.org/en-US/docs/Web/API/Response/ok' },
    { label: 'MDN: Using the Fetch API (checking the response)', href: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#checking_response_status' },
    { label: 'MDN: HTTP response status codes', href: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status' },
  ],
})
