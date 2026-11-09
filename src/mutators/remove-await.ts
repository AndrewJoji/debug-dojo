// scaffold-example (written by Claude)
import { defineMutator } from '../engine/define'
import type { Site } from '../engine/types'

// Missing await: the classic async bug. `fetch()` and `res.json()` return
// Promises; drop the `await` and the variable holds the Promise, not the value.
//
// Text rules, not a parser: we look for the word `await` followed by a fetch
// call or a `.json()` call. That's good enough for curated snippets (the
// matrix test proves every site really breaks a test). AST mutators are a v1 idea.

// `await`, then whitespace, then (without consuming it) either `fetch(` or
// something ending in `.json(`, e.g. `res.json(`.
const AWAIT_BEFORE_ASYNC_CALL = /\bawait\s+(?=fetch\s*\(|[\w$.]+\.json\s*\()/g

export default defineMutator({
  id: 'remove-await',
  name: 'Missing await',
  category: 'async-fetch',
  tag: 'await',

  findSites(code) {
    const sites: Site[] = []
    for (const match of code.matchAll(AWAIT_BEFORE_ASYNC_CALL)) {
      // The site covers "await" plus the whitespace after it, so removing it
      // leaves tidy code: `const res = fetch(...)`.
      sites.push({ start: match.index, end: match.index + match[0].length })
    }
    return sites
  },

  breakAt(code, site) {
    return code.slice(0, site.start) + code.slice(site.end)
  },

  ticket:
    "Since yesterday's refactor the data never shows up. Sometimes the screen says undefined, sometimes the console shows a TypeError. Nothing changed on the server side.",

  hints: [
    'Look at the lines that call fetch() or read the response body. For each variable, ask what it actually holds when the next line uses it.',
    'One of those calls returns a Promise, and the next line treats it as the finished value. A Promise has no .ok, .status or .json() of its own, and you cannot loop over it.',
    'Put `await` back in front of the call that returns a Promise (fetch(...) or res.json()), so the variable holds the resolved value.',
  ],

  theory:
    "fetch() and Response.json() are asynchronous: they return a Promise straight away and settle later. Inside an async function, `await` pauses until the Promise settles and hands you its value. Without it you get the Promise object itself, so res.ok is undefined and data.map doesn't exist. Notice the code never fails at the missing await: it fails a line or two later, which is why the error message points somewhere else. When a value is undefined right after an API call, check that every async step is awaited.",

  links: [
    { label: 'MDN: await', href: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await' },
    { label: 'MDN: Using promises', href: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises' },
    { label: 'MDN: Response.json()', href: 'https://developer.mozilla.org/en-US/docs/Web/API/Response/json' },
  ],
})
