import { useMemo, useState, type ReactNode } from 'react'
import { Shuffle } from 'lucide-react'
import { bugTypes, candidates, pickTarget, type PickFilter } from '../engine/challenge'
import { registry } from '../engine/registry'
import { newSeed } from '../engine/random'
import { CATEGORY_LABELS, DIFFICULTY_LABELS, SOURCE_LABELS, type Category, type Difficulty, type Source } from '../engine/types'
import { targetHash } from './route'
import { Button } from './components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select'
import { cn } from './lib/utils'

const ANY = 'any'
const orUndefined = <T extends string>(value: string) => (value === ANY ? undefined : (value as T))

// FR-1: pick by category, difficulty, bug type or source, or go Random.
// Picking writes a new challenge URL; the App reads the URL and builds the
// challenge from it, so every challenge is also a shareable link.
export function Picker({ className }: { className?: string }) {
  const [category, setCategory] = useState(ANY)
  const [difficulty, setDifficulty] = useState(ANY)
  const [bugType, setBugType] = useState(ANY)
  const [source, setSource] = useState(ANY)

  const filter: PickFilter = {
    category: orUndefined<Category>(category),
    difficulty: orUndefined<Difficulty>(difficulty),
    bugType: orUndefined(bugType),
    source: orUndefined<Source>(source),
  }
  const matches = candidates(registry, filter).length

  // Options with no challenges behind them are shown but disabled, so the
  // picker never leads to an empty result.
  const all = useMemo(() => candidates(registry), [])
  const has = (key: 'category' | 'difficulty' | 'source', value: string) => all.some((c) => c[key] === value)
  const types = useMemo(() => bugTypes(registry), [])

  const start = (pickFilter: PickFilter) => {
    const seed = newSeed()
    const target = pickTarget(registry, pickFilter, seed)
    if (target) window.location.hash = targetHash(target, seed)
  }

  return (
    <div className={cn('grid grid-cols-2 items-end gap-2 sm:flex sm:flex-wrap', className)}>
      <Field label="Category">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any category</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value} disabled={!has('category', value)}>
                {label}
                {!has('category', value) && ' (none yet)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Difficulty">
        <Select value={difficulty} onValueChange={setDifficulty}>
          <SelectTrigger className="w-full sm:w-32" aria-label="Difficulty">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any level</SelectItem>
            {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value} disabled={!has('difficulty', value)}>
                {label}
                {!has('difficulty', value) && ' (none yet)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Bug type">
        <Select value={bugType} onValueChange={setBugType}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Bug type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any bug type</SelectItem>
            {types.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Source">
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Source">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any source</SelectItem>
            {Object.entries(SOURCE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value} disabled={!has('source', value)}>
                {label}
                {!has('source', value) && ' (none yet)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <div className="col-span-2 flex gap-2">
        <Button onClick={() => start(filter)} disabled={matches === 0}>
          New challenge
        </Button>
        <Button variant="outline" onClick={() => start({})}>
          <Shuffle aria-hidden /> Random
        </Button>
      </div>
      {matches === 0 && (
        <p className="col-span-2 w-full text-sm text-muted-foreground" role="status">
          No challenges match that combination yet. Loosen a filter.
        </p>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
      {label}
      {children}
    </label>
  )
}
