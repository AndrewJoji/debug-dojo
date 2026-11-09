// Markers let a snippet author say "break it HERE". A marker is a comment like
// /*@await*/ placed directly before the code a mutator should act on:
//
//   const res = /*@await*/ await fetch('/api/deals')
//
// We strip markers before anything else happens, so mutators, the editor and
// the sandbox never see them. We just remember where each one was.

export interface Marker {
  tag: string
  /** Offset in the *stripped* code where the marked code starts. */
  offset: number
}

// /*@  then a tag made of letters, digits or dashes  then */,
// plus any spaces or tabs after it (so stripping doesn't leave a double space).
const MARKER = /\/\*@([\w-]+)\*\/[ \t]*/g

export function stripMarkers(code: string): { code: string; markers: Marker[] } {
  const markers: Marker[] = []
  let removed = 0 // characters stripped so far, to convert raw offsets to stripped ones
  const stripped = code.replace(MARKER, (match: string, tag: string, rawOffset: number) => {
    // In the stripped string, the marked code starts where the marker used to begin.
    markers.push({ tag, offset: rawOffset - removed })
    removed += match.length
    return ''
  })
  return { code: stripped, markers }
}

/** 1-based line number of a character offset, for "the bug is on line N". */
export function lineAt(code: string, offset: number): number {
  let line = 1
  for (let i = 0; i < offset && i < code.length; i++) {
    if (code[i] === '\n') line++
  }
  return line
}
