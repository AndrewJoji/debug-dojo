import { useEffect, useState } from 'react'
import type { Target } from '../engine/challenge'

// The URL hash is the app's only router, and it makes challenges shareable:
//   #/c/<snippetId>/<mutatorId>/<seed>   a mutated challenge (seed picks the bug site)
//   #/g/<problemId>                      a generated problem
//   #/progress                           the progress view
//   anything else                        the start screen
// GitHub Pages serves static files, so hash routes avoid 404s on reload.

export type Route =
  | { page: 'challenge'; target: Target; seed: number }
  | { page: 'progress' }
  | { page: 'home' }

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/')
  if (parts[0] === 'progress') return { page: 'progress' }
  if (parts[0] === 'g' && parts.length === 2 && parts[1]) {
    return { page: 'challenge', target: { kind: 'generated', id: parts[1] }, seed: 0 }
  }
  if (parts[0] === 'c' && parts.length === 4) {
    const seed = Number(parts[3])
    if (Number.isInteger(seed) && seed >= 0) {
      return { page: 'challenge', target: { kind: 'mutated', snippetId: parts[1], mutatorId: parts[2] }, seed }
    }
  }
  return { page: 'home' }
}

export function targetHash(target: Target, seed: number): string {
  return target.kind === 'generated' ? `#/g/${target.id}` : `#/c/${target.snippetId}/${target.mutatorId}/${seed}`
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
