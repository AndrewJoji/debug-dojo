// Checks and counts who wrote each snippet and mutator.
//
// Every file in src/snippets/ and src/mutators/ must start with one of:
//   // hand-written                          (Andrew, AI-off)
//   // scaffold-example (written by Claude)  (the 3 + 3 worked examples)
// CI fails if a file has neither, so the README's counts stay honest.

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

if (missing > 0) {
  console.error(`\n${missing} file(s) without an authorship header.`)
  process.exit(1)
}
