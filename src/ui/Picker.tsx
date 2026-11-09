import { useMemo, useState } from 'react'
import { Shuffle } from 'lucide-react'
import { matchingPairs, pickPair, type PickFilter } from '../engine/challenge'
import { registry } from '../engine/registry'
import { newSeed } from '../engine/random'
import { CATEGORY_LABELS, type Category } from '../engine/types'
import { challengeHash } from './route'
import { Button } from './components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select'

const ANY = 'any'

// FR-1: pick a category, a bug type, or Random. Picking writes a new
// challenge URL; the App reads the URL and builds the challenge from it.
export function Picker() {
  const [category, setCategory] = useState<string>(ANY)
  const [mutatorId, setMutatorId] = useState<string>(ANY)

  const filter: PickFilter = {
    category: category === ANY ? undefined : (category as Category),
    mutatorId: mutatorId === ANY ? undefined : mutatorId,
  }

  // How many challenges each category offers, so empty ones can be disabled.
  const countByCategory = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const { mutator } of matchingPairs(registry)) counts[mutator.category] = (counts[mutator.category] ?? 0) + 1
    return counts
  }, [])

  const mutatorsInCategory = registry.mutators.filter((m) => category === ANY || m.category === category)

  const start = (pickFilter: PickFilter) => {
    const seed = newSeed()
    const pair = pickPair(registry, pickFilter, seed)
    if (pair) window.location.hash = challengeHash(pair.snippet.id, pair.mutator.id, seed)
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
        Category
        <Select
          value={category}
          onValueChange={(value) => {
            setCategory(value)
            setMutatorId(ANY)
          }}
        >
          <SelectTrigger className="w-44" aria-label="Category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any category</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value} disabled={!countByCategory[value]}>
                {label}
                {!countByCategory[value] && ' (none yet)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
        Bug type
        <Select value={mutatorId} onValueChange={setMutatorId}>
          <SelectTrigger className="w-48" aria-label="Bug type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any bug type</SelectItem>
            {mutatorsInCategory.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <Button onClick={() => start(filter)}>New challenge</Button>
      <Button variant="outline" onClick={() => start({})}>
        <Shuffle aria-hidden /> Random
      </Button>
    </div>
  )
}
