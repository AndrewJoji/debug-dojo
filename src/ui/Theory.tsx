import { ExternalLink } from 'lucide-react'
import type { Lesson } from '../engine/types'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { InlineCode } from './InlineCode'

// FR-6: after a solve or a reveal, explain the concept and link to MDN.
export function Theory({ lesson }: { lesson: Lesson }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Why it broke: {lesson.name}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm leading-relaxed">
        <p>
          <InlineCode text={lesson.theory} />
        </p>
        <ul className="grid gap-1">
          {lesson.links.map((link) => (
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
