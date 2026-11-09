// FR-8: progress per bug type, saved in the browser so weak spots show up.
//
// The functions here are pure (they return new objects) and take storage as a
// parameter. The app passes window.localStorage; tests pass a tiny in-memory
// fake. That keeps this file free of browser globals and easy to test.

export const STORAGE_KEY = 'debug-dojo:progress:v1'

/** The two methods of the Storage API we use, so a fake can stand in for it. */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface BugStats {
  /** Challenges finished, whether solved or revealed. */
  attempts: number
  solves: number
  reveals: number
  /** Total hints opened across all attempts. */
  hintsUsed: number
  /** Fastest solve in milliseconds, or null if never solved. */
  bestTimeMs: number | null
  /** ISO date of the last finished challenge. */
  lastPlayed: string | null
}

/** Stats keyed by mutator id: a mutator *is* a bug type. */
export type Progress = Record<string, BugStats>

export interface Outcome {
  mutatorId: string
  result: 'solved' | 'revealed'
  hintsUsed: number
  timeMs: number
  at: Date
}

export function emptyStats(): BugStats {
  return { attempts: 0, solves: 0, reveals: 0, hintsUsed: 0, bestTimeMs: null, lastPlayed: null }
}

export function loadProgress(storage: StorageLike): Progress {
  // Storage can throw (blocked site data, private mode) or hold junk from an
  // older version. Either way, starting fresh beats crashing the app.
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Progress) : {}
  } catch {
    return {}
  }
}

export function saveProgress(storage: StorageLike, progress: Progress): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // Out of quota or blocked: progress just won't persist this session.
  }
}

/** Fold one finished challenge into the stats. Returns a new object. */
export function recordOutcome(progress: Progress, outcome: Outcome): Progress {
  const before = progress[outcome.mutatorId] ?? emptyStats()
  const solved = outcome.result === 'solved'
  const after: BugStats = {
    attempts: before.attempts + 1,
    solves: before.solves + (solved ? 1 : 0),
    reveals: before.reveals + (solved ? 0 : 1),
    hintsUsed: before.hintsUsed + outcome.hintsUsed,
    bestTimeMs:
      solved && (before.bestTimeMs === null || outcome.timeMs < before.bestTimeMs)
        ? outcome.timeMs
        : before.bestTimeMs,
    lastPlayed: outcome.at.toISOString(),
  }
  return { ...progress, [outcome.mutatorId]: after }
}
