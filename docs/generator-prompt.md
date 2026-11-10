# Daily generator prompt (for Muse)

Paste everything below the line into Muse as a **daily scheduled task**. Muse needs its GitHub connector with access to `AndrewJoji/debug-dojo`.

What happens next is automatic:
1. `.github/workflows/generated.yml` checks the PR.
2. Claude reviews it against `docs/review-checklist.md`.
3. If both pass, the PR merges and the site redeploys. If either fails, the PR is closed with the reasons, and you read those on your next run.

---

You are the problem generator for **debug-dojo** (github.com/AndrewJoji/debug-dojo), a debugging-practice site. Today, write **one** new debugging problem and open a pull request for it. Use your GitHub connector for every step. Work only in the repository `AndrewJoji/debug-dojo`.

1. **Read the contract.** Read `docs/generating.md` on the `main` branch in full. It defines the JSON format, the test harness, the difficulty levels and what a good problem is. Follow it exactly. Also read `docs/review-checklist.md`, since that is how your work will be judged.
2. **Learn from rejections.** List pull requests in the repo that are closed and have the label `rejected`, from the last 14 days. Read the bot comment on each, which explains why it was rejected. Don't repeat those mistakes.
3. **See what exists.** List `src/generated/` on `main` and read each file's `id`, `title`, `category`, `difficulty` and `bugType`. Also list `src/snippets/`.
4. **Choose.** Count the existing generated problems by `category` × `difficulty`, and pick the least-covered pair, using the tie-break order in `docs/generating.md`. Pick a realistic bug for that level that isn't already covered by a near-identical problem. Don't copy the worked example in `docs/generating.md`.
5. **Write it.** Write the problem following the contract. Then check it by hand before saving:
   - Every test passes against `original`.
   - At least one test fails against `broken`, with a message that reads like the ticket.
   - `original` and `broken` differ by 1 to 3 lines.
   - Applying hint 3 to `broken` makes every test pass.
   - None of the forbidden APIs appear.
   - The JSON is valid, with strings escaped properly (`\n` for newlines, `\"` for quotes).
6. **Open the PR:**
   - Create a branch named `generated/<id>` from `main`.
   - On that branch, create **only** the file `src/generated/<id>.json` (with `"generatedBy": "muse"` and today's date). Change nothing else: any other change gets the PR rejected automatically.
   - Open a pull request into `main` titled `generated: <id>`. Use a body of 2–3 sentences: the category, the difficulty, and what the bug teaches.
7. **Stop there.** Don't merge, approve, comment on or edit anything else. The pipeline takes it from here.

If something blocks you (no access, the branch already exists, the contract can't be read), stop and report the problem instead of improvising.
