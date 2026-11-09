# Bug Practice Tool — SRS v0 (working name)

Nov 9, 2026 · @Andrew Joji

## Purpose and goals

A browser tool that injects a realistic bug into a small piece of JavaScript, HTML or API code, then coaches you to find and fix it. It doubles as interview practice for Glia's Client Engineering round (API debugging plus JavaScript and HTML) and as a public portfolio piece.

- **Practice:** build debugging fluency without AI, with hints and theory that make each fix stick.
- **Portfolio:** a public repo whose commit history shows steady hands-on work, with an honest README about how it was built.
- **Hybrid build:** Claude scaffolds v0; Andrew extends it by hand, AI-off, one snippet or mutator per session.

## Scope

v0 is a curated snippet library plus bug injectors, running fully in the browser. Pasting any website or repo is deferred, because breaking live sites needs a proxy and breaking repos needs a sandbox to install and run them.

|  | Included |
| --- | --- |
| **v0 (in scope)** | 10–15 hand-written snippets across 5 categories; about 8 mutators; bug picker (by category, bug type, or random); in-browser editor; tests that check your fix; 3-step hint ladder; theory panel with MDN links; reveal answer with a diff; progress saved locally |
| **Out of scope for v0** | Arbitrary website URLs; GitHub repo input; accounts or backend; AI-generated bugs; languages other than JavaScript and HTML |
| **v1 candidates** | Public GitHub repo input, limited to a single JavaScript file; AST-based mutators instead of text rules; shareable challenge links; timed interview mode |

## Functional requirements

| ID | Requirement |
| --- | --- |
| FR-1 | User picks a category (async/fetch, HTTP and APIs, DOM and HTML, data and JSON, logic), a bug type, or Random. |
| FR-2 | The tool picks a snippet where the chosen mutator applies, injects exactly one bug, and shows the broken code in an editor. |
| FR-3 | Each challenge shows a short symptom report written like a customer ticket, e.g. "the deals list shows undefined." |
| FR-4 | User edits the code and clicks Run; the snippet's tests run in a sandbox and show pass/fail with the error output. |
| FR-5 | A 3-step hint ladder: where to look, what's wrong, how to fix. Each hint is opened deliberately and counted. |
| FR-6 | After a solve or a reveal, a theory panel explains the concept and links to MDN. |
| FR-7 | Reveal shows a diff between the broken code and the original. |
| FR-8 | Progress (solved, hints used, time taken) is saved in the browser per bug type, so weak spots show up. |
| FR-9 | API snippets run against a fake fetch that can return set status codes, headers, delays and errors. |
| FR-10 | Adding a snippet or mutator means adding one file, with no changes elsewhere. |

## Non-functional requirements

- **No AI during practice.** The tool makes no AI calls, so a session stays genuinely AI-off.
- **Client-side only.** A static site with no backend, deployable on GitHub Pages or Vercel for free.
- **Safe execution.** User code runs in a sandboxed iframe or Web Worker with a 3-second timeout, so an infinite loop can't freeze the page.
- **Deterministic bugs.** The same snippet, mutator and seed always produce the same bug, so challenges can be repeated and tested.
- **Desktop-first.** The editor targets laptop screens; the rest of the UI still reads on mobile.
- **Accessible.** Keyboard-usable, visible focus states, and pass/fail never shown by colour alone.
- **Readable code.** Plain, commented TypeScript a reviewer can follow, since interviewers may ask about any part of it.

## Data model

Two kinds of file, each self-contained, so adding one never touches another.

**Snippet** (`src/snippets/*.ts`)

| Field | What it holds |
| --- | --- |
| `id`, `title`, `category` | Identity and where it shows in the picker |
| `code` | Working source, with optional `/*@tag*/` markers showing mutators where they may act |
| `tests` | Assertions that pass on the original code and fail once a bug is injected |
| `fakeApi` | Optional fake responses for fetch: status, body, headers, delay |
| `ticket` | Default symptom text if the mutator doesn't supply one |

**Mutator** (`src/mutators/*.ts`)

| Field | What it holds |
| --- | --- |
| `id`, `name`, `category` | e.g. `remove-await`, "Missing await", async/fetch |
| `appliesTo(code)` | Returns true if this mutator can break this snippet |
| `mutate(code, seed)` | Returns the broken code plus the line it changed |
| `ticket` | Symptom report shown to the user |
| `hints` | Three steps: where to look, what's wrong, how to fix |
| `theory`, `links` | Short explanation plus MDN links |

**Starter mutators for v0:** missing `await`, unchecked `res.ok`, wrong status code check, off-by-one loop bound, misspelled property or JSON key, wrong or missing request header, mismatched id/class selector, missing `return`.

## Architecture and tech stack

A static Vite app: React and shadcn/ui for the interface, plain TypeScript for the engine. The engine has no React in it, so Andrew's daily practice stays plain TypeScript.

**How a challenge runs**

1. Picker chooses a mutator and a snippet it applies to, using a seed.
2. Engine calls `mutate()` and stores the original, the broken code and the changed line.
3. Editor shows the broken code and the symptom ticket.
4. On Run, the code and tests go to a sandboxed iframe with the fake fetch injected; results come back by `postMessage`.
5. Hints, theory and the reveal diff come from the mutator's file. Progress is saved to `localStorage`.

| Layer | Choice | Why |
| --- | --- | --- |
| Build | Vite + TypeScript | Fast, static output, no server |
| UI | React + shadcn/ui + Tailwind | Matches Deal Hunter's dashboard and the planned shared design guide |
| Editor | CodeMirror 6 | Lightweight, good JS and HTML support |
| Sandbox | iframe with `sandbox="allow-scripts"` | Isolates user code and enforces the timeout |
| Diff | `diff` (jsdiff) | Small library for the reveal view |
| Tests | Vitest | Checks every snippet passes clean and fails under each mutator it claims |
| Deploy | GitHub Pages or Vercel | Free static hosting |

## Repo structure

One public repo, with `main` protected the same way as Andrew's other repos (PR required, no force-pushes). Claude can't create repos, so Andrew creates the empty repo and gives the claude-chat-workplane app access to it.

```
<repo-name>/
├─ README.md            # what it is, how it was built (Claude scaffold + Andrew's AI-off additions)
├─ AGENTS.md            # rules for AI agents: never edit files under src/snippets or src/mutators marked hand-written
├─ docs/
│  ├─ SRS.md            # this document
│  └─ practice-log.md   # one dated line per AI-off session
├─ src/
│  ├─ engine/           # picker, mutate runner, seeds (plain TypeScript)
│  ├─ sandbox/          # iframe runner + fake fetch
│  ├─ snippets/         # one file per snippet
│  ├─ mutators/         # one file per mutator
│  ├─ ui/               # React screens and shadcn components
│  └─ main.tsx
├─ tests/               # Vitest: every snippet × mutator pair checked
└─ package.json
```

Each file Andrew writes AI-off starts with a `// hand-written` comment, so the README can count them honestly.

## Build plan

Claude builds the frame in about an hour; Andrew grows the content by hand over 2–3 weeks, one item per 45-minute AI-off session.

| Who | What | When |
| --- | --- | --- |
| Andrew | Create the empty public repo, grant app access, approve this SRS | First |
| Claude | Scaffold: engine, sandbox, fake fetch, UI, tests, CI, README, plus 3 snippets and 3 mutators as worked examples | Same day, as a PR to staging |
| Andrew | Read the scaffold until he can explain every function out loud | First AI-off session |
| Andrew | Add one snippet or one mutator per session, AI-off, with docs open; log it in `docs/practice-log.md` | 5 sessions a week |
| Claude | Review each PR afterward: explain mistakes, never rewrite hand-written files | After each session |

**Rule:** Claude never writes into `src/snippets` or `src/mutators` after the scaffold. AI help is for review and explanation only.

## Acceptance criteria

v0 is done when every item below holds.

- [ ] Picking Random 20 times gives a working challenge every time, with no crashes or bugs that are impossible to solve.
- [ ] Every snippet passes its tests unbroken, and fails them under each mutator that claims to apply (enforced in CI).
- [ ] An infinite loop in the editor stops after 3 seconds with a clear message, and the page stays usable.
- [ ] A missing-`await` challenge on a fetch snippet can be solved end to end: ticket, hints, fix, pass, theory, diff.
- [ ] Progress survives a page reload.
- [ ] The README states plainly what Claude scaffolded and what was written by hand.
- [ ] The site deploys from `main` with a public URL.

## Open questions for Andrew

- [ ] **Name.** The tool and repo name are yours to pick.
- [ ] **Design system.** Use shadcn/ui as planned, and should this be the first project built on the shared design guide?
- [ ] **Stack.** React + shadcn for the UI, or plain HTML/CSS/JS so the whole app is practice?
- [ ] **Hosting.** GitHub Pages or Vercel?
- [ ] **Hints.** Unlock freely, or only after a set time (e.g. 5 minutes) to force a real attempt first?
- [ ] **Interview mode.** Add a timed mode with no hints in v0, or leave it for v1?
