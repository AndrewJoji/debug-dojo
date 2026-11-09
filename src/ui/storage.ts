import type { StorageLike } from '../engine/progress'

// Even *reading* window.localStorage can throw (blocked site data, some
// private modes). Fall back to memory so the app still works; progress just
// won't survive a reload in that case.
export function browserStorage(): StorageLike {
  try {
    const storage = window.localStorage
    storage.getItem('debug-dojo:probe')
    return storage
  } catch {
    const memory = new Map<string, string>()
    return { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => void memory.set(k, v) }
  }
}
