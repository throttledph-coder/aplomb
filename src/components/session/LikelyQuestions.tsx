import { useEffect, useRef, useState } from 'react'
import { Lightbulb, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { InterviewSession, ParsedResumeData } from '@/types'

interface LikelyQuestionsProps {
  resume: ParsedResumeData
  session: InterviewSession
  disabled?: boolean
  onPick: (question: string) => void
}

export function LikelyQuestions({ resume, session, disabled, onPick }: LikelyQuestionsProps) {
  const [questions, setQuestions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    if (!window.ai) {
      setLoading(false)
      return
    }
    window.ai
      .generateQuestions({ resume, session })
      .then(setQuestions)
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false))
  }, [resume, session])

  // Hide entirely if nothing generated (e.g. no key) — keeps the screen clean.
  if (!loading && questions.length === 0) return null

  return (
    <Card>
      <CardContent className="py-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-2 text-sm font-medium"
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Lightbulb className="h-4 w-4 text-amber-400" />
          Likely questions
          {loading && <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </button>
        {open && !loading && (
          <div className="mt-3 flex flex-col gap-1.5">
            {questions.map((q, i) => (
              <button
                key={i}
                type="button"
                disabled={disabled}
                onClick={() => onPick(q)}
                className="rounded-md border px-3 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
