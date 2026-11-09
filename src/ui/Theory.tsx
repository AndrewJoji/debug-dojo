import { ExternalLink } from 'lucide-react'
import type { Mutator } from '../engine/types'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { InlineCode } from './InlineCode'

// FR-6: after a solve or a reveal, explain the concept and link to MDN.
export function Theory({ mutator }: { mutator: Mutator }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Why it broke: {mutator.name}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm leading-relaxed">
        <p>
          <InlineCode text={mutator.theory} />
        </p>
        <ul className="grid gap-1">
          {mutator.links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-muted-foreground"
              >
                {link.label}
                <ExternalLink className="size-3" aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
