import { useEffect, useState } from 'react'

// The URL hash is the app's only router, and it makes challenges shareable:
//   #/c/<snippetId>/<mutatorId>/<seed>   a specific challenge
//   #/progress                           the progress view
//   anything else                        the start screen
// GitHub Pages serves static files, so hash routes avoid 404s on reload.

export type Route =
  | { page: 'challenge'; snippetId: string; mutatorId: string; seed: number }
  | { page: 'progress' }
  | { page: 'home' }

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/')
  if (parts[0] === 'progress') return { page: 'progress' }
  if (parts[0] === 'c' && parts.length === 4) {
    const seed = Number(parts[3])
    if (Number.isInteger(seed) && seed >= 0) {
      return { page: 'challenge', snippetId: parts[1], mutatorId: parts[2], seed }
    }
  }
  return { page: 'home' }
}

export function challengeHash(snippetId: string, mutatorId: string, seed: number): string {
  return `#/c/${snippetId}/${mutatorId}/${seed}`
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
