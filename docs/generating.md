# Generating problems

The contract for anything that writes AI-generated problems into debug-dojo: Muse on its daily schedule, or the `/generate-challenge` command in Claude Code. If a file follows this page, CI and the reviewer will accept it. If it doesn't, the PR is closed with the reasons.

**The rule:** AI may *create* problems. It never helps anyone *solve* them, and the app never calls AI. Hand-written work in `src/snippets/` and `src/mutators/` is off limits to every generator.

## What to produce

Exactly **one new file**: `src/generated/<id>.json`. No other file may change. A PR that touches anything else is rejected before anyone reads it.

```jsonc
{
  "id": "paginate-orders-off-by-one",          // kebab-case, unique, identical to the filename
  "source": "ai-generated",                     // always this
  "generatedBy": "muse",                        // "muse" or "claude-code"
  "generatedAt": "2026-11-10",                  // YYYY-MM-DD
  "title": "Load every page of orders",         // what the code does, not what's wrong
  "category": "http-api",                       // async-fetch | http-api | dom-html | data-json | logic
  "difficulty": "medium",                       // easy | medium | hard (see below)
  "bugType": "off-by-one",                      // kebab-case; reuse an existing one when it fits
  "bugName": "Off-by-one loop bound",           // human name, shown after solving
  "ticket": "Customers with lots of orders say the last page never shows.",
  "html": "<ul id=\"orders\"></ul>",            // optional: body markup for DOM problems
  "fakeApi": {                                  // optional: routes for the fake fetch
    "GET /api/orders?page=1": { "status": 200, "body": { "items": [1, 2], "pages": 2 } }
  },
  "original": "…working code…",
  "broken": "…the same code with ONE bug…",
  "tests": "…test() calls…",
  "hints": ["where to look", "what's wrong", "how to fix"],
  "theory": "Short explanation of the concept. `backticks` render as code.",
  "links": [{ "label": "MDN: Array.prototype.slice()", "href": "https://developer.mozilla.org/…" }]
}
```

Existing bug types (reuse the id when it fits): `remove-await` (Missing await), `drop-ok-check` (Unchecked res.ok), `selector-mismatch` (Mismatched selector). Look at `src/generated/` for the ones generators have added since.

## The code and the tests

- **Plain browser JavaScript**, as a script, not a module: no `import`/`export`, no top-level `await`. Define functions; the tests call them by name.
- **`tests`** run after the code, in the same scope, with these globals:
  - `test(name, fn)` registers a test. `fn` may be async.
  - `assert.ok(value)`, `assert.equal(actual, expected)` (uses `Object.is`), `assert.deepEqual(actual, expected)` (compares JSON), `await assert.rejects(() => promise, 'substring of the error message')`.
  - `api.route('METHOD /path', response)` overrides a route for this test. `api.requests` lists every request made (`{ method, url, headers, body }`; header names lower-cased).
- **Fake fetch:** a route is `{ status, body, headers, delay, error: 'network' }`, all optional. Objects are sent as JSON. Unknown routes return 404. HTTP errors resolve normally (just like real fetch); only `error: 'network'` rejects.
- **The DOM** comes from `html`, set up once before the code runs. Tests share it, so code that renders should clear what it rendered before.
- **Everything must finish in 3 seconds.** Keep `delay` under 100 ms.
- **No stray rejections.** Neither `original` nor `broken` may leave a promise that rejects with nobody listening (e.g. a `throw` inside a callback nothing awaits). Tests must exercise the bug through values they can assert on.
- **Forbidden** in `original`, `broken` and `tests`: `XMLHttpRequest`, `WebSocket`, `eval`, `new Function`, `import()`, `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`, `postMessage`, `location`, `parent.`, `top.`, `opener.`. The sandbox blocks real network access anyway; these just keep problems about debugging.

## What makes a good problem

1. **`original` works.** Every test passes against it.
2. **`broken` has exactly one bug:** a change of 1 to 3 lines that makes at least one test fail. Not a rewrite, not two bugs.
3. **The bug is realistic.** It's a mistake a working developer actually makes (see the list below), not a typo nobody would write, such as `retrun`.
4. **The tests explain the failure.** A failing assertion should point at the *symptom* ("expected 3 orders but got 2"), the way a bug report would.
5. **The ticket is a customer's symptom report.** It names what they saw, never the cause. Don't put the bug name in it.
6. **The hints climb in this order:**
   1. *Where to look*: the area of the code, no diagnosis.
   2. *What's wrong*: the concept, without the exact fix.
   3. *How to fix*: concrete enough to apply.
7. **The theory is accurate and short** (3–6 sentences), and teaches the concept beyond this one problem.
8. **Links are MDN only** (`https://developer.mozilla.org/`), 1 to 3 of them.
9. **It's different from what exists.** Read the titles and code already in `src/generated/` and `src/snippets/`. No near-duplicates.

## Difficulty

| Level | Size of `original` | What it feels like |
| --- | --- | --- |
| **easy** | ≤ 20 lines | The symptom points close to the cause. One function, one obvious data flow. *Missing `await`, wrong comparison operator, wrong property name.* |
| **medium** | ≤ 35 lines | The symptom shows up away from the cause. Two or three functions, or you have to read the fake API's response shape. *Unchecked `res.ok`, the wrong field in a nested JSON body, an event listener on the wrong element.* |
| **hard** | ≤ 60 lines | Subtle, with a misleading symptom, but still exactly one bug. *Async ordering (`forEach` with `async`), pagination off-by-one, header-case or `Content-Type` mistakes, a stale closure, mutating shared state, an `Array.sort` without a comparator on numbers.* |

## Choosing what to make

Spread coverage. Count the existing problems in `src/generated/` by `category` × `difficulty`, and make one for the **least-covered pair**. If several pairs tie, prefer the categories the interview cares about most: `http-api`, then `async-fetch`, then `dom-html`, then `data-json`, then `logic`.

## Checking your work before opening the PR

If you can run code (Claude Code), run `npm test`. The `generated problems` suite runs exactly the CI checks. If you can't run code (Muse), trace it by hand:

- Run each test in your head against `original`: does every one pass?
- Run them against `broken`: does at least one fail, and with a message that reads like the ticket?
- Diff `original` and `broken`: are 1 to 3 lines different?

## Worked example (easy)

This shows the format only. Don't submit it or a near copy of it.

```json
{
  "id": "cart-total-skips-first-item",
  "source": "ai-generated",
  "generatedBy": "claude-code",
  "generatedAt": "2026-11-10",
  "title": "Add up the cart",
  "category": "logic",
  "difficulty": "easy",
  "bugType": "off-by-one",
  "bugName": "Off-by-one loop bound",
  "ticket": "The cart total is always a little lower than the prices add up to.",
  "original": "function cartTotal(prices) {\n  let total = 0;\n  for (let i = 0; i < prices.length; i++) {\n    total += prices[i];\n  }\n  return total;\n}\n",
  "broken": "function cartTotal(prices) {\n  let total = 0;\n  for (let i = 1; i < prices.length; i++) {\n    total += prices[i];\n  }\n  return total;\n}\n",
  "tests": "test('adds every price', () => {\n  assert.equal(cartTotal([5, 10, 20]), 35);\n});\n\ntest('a single item costs its price', () => {\n  assert.equal(cartTotal([12]), 12);\n});\n",
  "hints": [
    "Look at the loop. Which items does it actually visit?",
    "The loop starts at the wrong index, so one item is never counted. Arrays start at index 0.",
    "Start the loop at `let i = 0` so the first price is included."
  ],
  "theory": "JavaScript arrays are zero-indexed: the first item is `prices[0]` and the last is `prices[prices.length - 1]`. Off-by-one errors come from mixing these up: starting at 1, or using `<=` instead of `<` on the length. A good habit is to test the edges: an empty list, one item, and the first and last items.",
  "links": [
    { "label": "MDN: for statement", "href": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for" },
    { "label": "MDN: Indexed collections", "href": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Indexed_collections" }
  ]
}
```
