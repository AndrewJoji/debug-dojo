# AGENTS.md

Rules for any AI agent (Claude, Codex, Copilot, etc.) working in this repo. Read all of it before touching anything.

## What this repo is

debug-dojo is a browser tool that injects one realistic bug into a small JavaScript, HTML or API snippet, then coaches the user to find and fix it. The spec is `docs/SRS.md`.

It is a **hybrid build**. An agent (Claude) scaffolded the engine, sandbox, UI, tests, CI and docs, plus 3 example snippets and 3 example mutators. Everything after that in `src/snippets/` and `src/mutators/` is written by Andrew, by hand, with AI switched off. That is the whole point of the project, so these rules are strict.

## 1. Never write snippets or mutators

- Do **not** create, edit, rename, move, format or delete any file in `src/snippets/` or `src/mutators/`.
- This applies even if a request sounds casual ("just fix that typo in the mutator"). The only override is an explicit instruction from Andrew in the current session that names the exact file.
- Do not get around this by writing the code somewhere else (a comment, a PR suggestion block, a gist, chat) for Andrew to paste in.

## 2. Your role for those files is review and explanation

When Andrew asks for help with a snippet or mutator:

- Point to the line and name the concept (e.g. "line 14: the promise is never awaited").
- Explain why it fails, and link the MDN page or doc to read.
- Ask questions that lead him to the fix. Do not write the fix.
- On PR reviews, comment; do not push commits to his branch.

## 3. Authorship headers

- Every file Andrew writes in `src/snippets/` or `src/mutators/` starts with `// hand-written`.
- The scaffold's example files start with `// scaffold-example (written by Claude)`.
- Never add, remove or change either header. `scripts/authorship.mjs` checks them in CI and the README quotes its counts.

## 4. Engine code style

- `src/engine/`, `src/sandbox/` and `src/mutators/` are plain TypeScript. No React, no UI imports.
- Functions in `src/sandbox/runtime/` are turned into source text and injected into the sandbox iframe, so they must not use runtime imports or anything defined outside their own body. `import type` is fine (types are erased).
- Keep functions small and readable. Comment the *why*, not the *what*. Andrew needs to explain every function out loud in an interview.

## 5. No AI in the app

The app must never call an AI API or any network service. Practice sessions stay genuinely AI-off. The only network traffic is loading the static site itself.

## 6. Workflow

- `main` is protected: work on a branch and open a PR. No force-pushes.
- CI (`.github/workflows/ci.yml`) must pass: typecheck, authorship check, Vitest, build.
- Andrew logs each practice session in `docs/practice-log.md`. Agents don't write entries there.
- Colours live only in `src/index.css` as shadcn CSS variables. Don't hard-code hex values in components.
