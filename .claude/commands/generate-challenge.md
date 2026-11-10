---
description: Generate one AI problem into src/generated/, verify it with the test suite, and open a PR
argument-hint: "[easy|medium|hard] [category]"
---

Generate ONE new debugging problem for debug-dojo, following `docs/generating.md` exactly. Read it in full first, then read `docs/review-checklist.md`.

Requested level and category: `$ARGUMENTS`. If nothing is given, pick the least-covered category × difficulty pair, as `docs/generating.md` describes.

Rules:
- Create only `src/generated/<id>.json`, with `"generatedBy": "claude-code"` and today's date. Never touch `src/snippets/` or `src/mutators/`; those are hand-written by Andrew, AI-off.
- Don't copy the worked example in `docs/generating.md`, or anything already in `src/generated/` or `src/snippets/`.

Steps:
1. List `src/generated/` and `src/snippets/` to see what exists, then choose the problem.
2. Write the file.
3. Run `npx vitest run tests/generated.test.ts`. If it fails, fix the problem file and run it again, until the whole `generated problems` suite passes. Then run `npm run check`.
4. Review the problem yourself against `docs/review-checklist.md`, especially that hint 3 really fixes it. Fix anything that fails.
5. Create branch `generated/<id>` from an up-to-date `main`, and commit only that one file with the message `generated: <id>`.
6. Push, and open a PR titled `generated: <id>`. The `generated.yml` workflow reviews it and ships it if it passes.
7. Report the PR link, the category, the difficulty and the bug.
