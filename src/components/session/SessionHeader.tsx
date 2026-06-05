import type { ReactNode } from 'react'
import { Circle, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { InterviewSession } from '@/types'

function fmt(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

interface SessionHeaderProps {
  session: InterviewSession
  elapsedSec: number
  onEnd: () => void
  extra?: ReactNode
}

export function SessionHeader({ session, elapsedSec, onEnd, extra }: SessionHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b pb-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">
          {session.company} — {session.job_title}
        </h1>
        <p className="text-xs capitalize text-muted-foreground">
          {session.interview_type.replace('_', ' ')} interview
        </p>
      </div>
      <div className="flex items-center gap-4">
        {extra}
        <span className="flex items-center gap-1.5 font-mono text-sm">
          <Circle className="h-2.5 w-2.5 fill-red-500 text-red-500" />
          {fmt(elapsedSec)}
        </span>
        <Button variant="destructive" size="sm" onClick={onEnd}>
          <Square className="mr-2 h-3.5 w-3.5" />
          End Session
        </Button>
      </div>
    </div>
  )
}
