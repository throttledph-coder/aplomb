import { Copy, RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface AnswerPanelProps {
  question: string | null
  answer: string
  isGenerating: boolean
  canRegenerate: boolean
  onCopy: () => void
  onRegenerate: () => void
}

export function AnswerPanel({
  question,
  answer,
  isGenerating,
  canRegenerate,
  onCopy,
  onRegenerate,
}: AnswerPanelProps) {
  const showSkeleton = isGenerating && answer.length === 0

  if (!question && !answer && !isGenerating) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center text-sm text-muted-foreground">
          <Sparkles className="h-6 w-6" />
          Suggested answers appear here. Ask a question to begin.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex flex-1 flex-col gap-3 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Suggested Answer
        </p>
        {question && <p className="text-sm font-medium">{question}</p>}

        <div className="flex-1 whitespace-pre-wrap text-sm leading-relaxed">
          {showSkeleton ? (
            <div className="space-y-2">
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
            </div>
          ) : (
            answer
          )}
        </div>

        {!isGenerating && answer.length > 0 && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="secondary" onClick={onCopy}>
              <Copy className="mr-2 h-3.5 w-3.5" />
              Copy
            </Button>
            {canRegenerate && (
              <Button size="sm" variant="ghost" onClick={onRegenerate}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Regenerate
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
