// scaffold-example (written by Claude)
import { defineMutator } from '../engine/define'
import type { Site } from '../engine/types'

// Mismatched selector: the JavaScript looks for an element the HTML doesn't
// have, so the lookup returns null and the next line crashes.
//
// Two realistic versions of the mistake:
//   querySelector('#deal-list')  -> querySelector('.deal-list')   (id vs class)
//   getElementById('deal-list')  -> getElementById('dealList')    (kebab vs camelCase)

// A DOM lookup call, then the quoted string passed to it. Group 1 is the
// method name, group 2 the opening quote, group 3 the selector text.
const LOOKUP_CALL =
  /\b(querySelector|querySelectorAll|getElementById|getElementsByClassName)\(\s*(['"])([^'"\n]+)\2/g

/** 'deal-list' -> 'dealList'; a name without dashes gets an 's' instead. */
function misspellName(name: string): string {
  if (name.includes('-')) return name.replace(/-(\w)/g, (_dash, letter: string) => letter.toUpperCase())
  return name + 's'
}

export default defineMutator({
  id: 'selector-mismatch',
  name: 'Mismatched selector',
  category: 'dom-html',
  tag: 'selector',

  findSites(code) {
    const sites: Site[] = []
    for (const match of code.matchAll(LOOKUP_CALL)) {
      const [whole, method, , selector] = match
      // querySelector only gets the id/class swap, so the selector must start with # or .
      if (method.startsWith('querySelector') && !/^[#.]/.test(selector)) continue
      // The site is the quoted string, quotes included. The match ends with
      // the closing quote, so step back over it, the selector and the opening quote.
      const end = match.index + whole.length
      sites.push({ start: end - selector.length - 2, end })
    }
    return sites
  },

  breakAt(code, site) {
    const quoted = code.slice(site.start, site.end) // e.g. '#deal-list' with quotes
    const quote = quoted[0]
    const selector = quoted.slice(1, -1)
    let broken: string
    if (selector.startsWith('#')) broken = '.' + selector.slice(1)
    else if (selector.startsWith('.')) broken = '#' + selector.slice(1)
    else broken = misspellName(selector) // getElementById / getElementsByClassName
    return code.slice(0, site.start) + quote + broken + quote + code.slice(site.end)
  },

  ticket:
    "The page loads, but one part of it stays empty and the console says \"Cannot read properties of null\". When we inspect the HTML, the element is right there.",

  hints: [
    'Find the line that looks up an element. What does that lookup return when nothing matches?',
    'The selector does not match anything in the HTML, so the lookup returns null and the next line crashes on it. Compare it character by character with the markup: # means id, . means class.',
    "Change the selector so it matches the element's real id or class in the HTML.",
  ],

  theory:
    "document.querySelector() returns the first matching element, or null when nothing matches. It doesn't throw for a valid selector that finds nothing. '#name' matches id=\"name\" and '.name' matches class=\"name\"; getElementById takes the bare id with no '#'. The crash comes on the next line, when the code calls a method on null. When you see \"Cannot read properties of null\", put the selector next to the real markup (in DevTools' Elements panel) before suspecting anything else.",

  links: [
    { label: 'MDN: Document.querySelector()', href: 'https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector' },
    { label: 'MDN: ID selectors', href: 'https://developer.mozilla.org/en-US/docs/Web/CSS/ID_selectors' },
    { label: 'MDN: Class selectors', href: 'https://developer.mozilla.org/en-US/docs/Web/CSS/Class_selectors' },
  ],
})
