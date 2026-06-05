import { Card, CardContent } from '@/components/ui/card'
import type { KeywordMatches } from '@/types'

interface KeywordAnalysisProps {
  matches: KeywordMatches | null
}

export function KeywordAnalysis({ matches }: KeywordAnalysisProps) {
  if (!matches || (matches.matched.length === 0 && matches.missed.length === 0)) {
    return null
  }
  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <p className="text-sm font-medium">Keywords vs Job Description</p>
        <div className="flex flex-wrap gap-1.5">
          {matches.matched.map((k) => (
            <span
              key={`m-${k}`}
              className="rounded-md bg-green-500/10 px-2 py-0.5 text-xs text-green-500"
            >
              ✅ {k}
            </span>
          ))}
          {matches.missed.map((k) => (
            <span
              key={`x-${k}`}
              className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs text-amber-500"
            >
              ⚠️ {k}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
