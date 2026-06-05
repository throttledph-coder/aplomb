import { Card, CardContent } from '@/components/ui/card'
import { Markdown } from './Markdown'
import type { InterviewSession } from '@/types'

interface ReportSummaryProps {
  session: InterviewSession
  questionCount: number
  report: string
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Card>
      <CardContent className="py-4 text-center">
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}

export function ReportSummary({ session, questionCount, report }: ReportSummaryProps) {
  const minutes = Math.max(1, Math.round(session.duration_sec / 60))
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <Stat value={String(questionCount)} label="Questions" />
        <Stat value={`${minutes} min`} label="Duration" />
        <Stat value={session.interview_type.replace('_', ' ')} label="Interview Type" />
      </div>

      <Card>
        <CardContent className="py-5">
          <p className="mb-2 text-sm font-medium">AI Coaching Summary</p>
          <Markdown text={report} />
        </CardContent>
      </Card>
    </div>
  )
}
