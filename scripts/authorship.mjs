// Checks and counts who wrote each challenge.
//
// Every file in src/snippets/ and src/mutators/ must start with one of:
//   // hand-written                          (Andrew, AI-off)
//   // scaffold-example (written by Claude)  (the 3 + 3 worked examples)
// Every src/generated/*.json must say "source": "ai-generated".
// CI fails otherwise, so the README's counts stay honest.

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const FOLDERS = ['src/snippets', 'src/mutators']
const HAND = '// hand-written'
const SCAFFOLD = '// scaffold-example'

let missing = 0
const counts = {}

for (const folder of FOLDERS) {
  counts[folder] = { hand: 0, scaffold: 0 }
  for (const name of readdirSync(folder).filter((f) => f.endsWith('.ts')).sort()) {
    const firstLine = readFileSync(join(folder, name), 'utf8').split(/\r?\n/, 1)[0].trim()
    if (firstLine.startsWith(HAND)) counts[folder].hand++
    else if (firstLine.startsWith(SCAFFOLD)) counts[folder].scaffold++
    else {
      console.error(`✗ ${folder}/${name}: first line must be "${HAND}" or "${SCAFFOLD} ..."`)
      missing++
    }
  }
}

for (const [folder, { hand, scaffold }] of Object.entries(counts)) {
  console.log(`${folder}: ${hand} hand-written, ${scaffold} scaffold examples`)
}

// Generated problems are JSON, so their authorship lives in a field, not a comment.
const GENERATED = 'src/generated'
let generated = 0
const byGenerator = {}
let generatedFiles = []
try {
  generatedFiles = readdirSync(GENERATED).filter((f) => f.endsWith('.json'))
} catch {
  // No generated problems yet.
}
for (const name of generatedFiles) {
  let source
  let generatedBy
  try {
    ;({ source, generatedBy } = JSON.parse(readFileSync(join(GENERATED, name), 'utf8')))
  } catch {
    console.error(`✗ ${GENERATED}/${name}: not valid JSON`)
    missing++
    continue
  }
  if (source !== 'ai-generated') {
    console.error(`✗ ${GENERATED}/${name}: "source" must be "ai-generated"`)
    missing++
    continue
  }
  generated++
  byGenerator[generatedBy] = (byGenerator[generatedBy] ?? 0) + 1
}
const detail = Object.entries(byGenerator).map(([by, n]) => `${n} by ${by}`).join(', ')
console.log(`${GENERATED}: ${generated} AI-generated${detail ? ` (${detail})` : ''}`)

if (missing > 0) {
  console.error(`\n${missing} file(s) without valid authorship.`)
  process.exit(1)
}
