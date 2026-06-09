import { useState, type ReactNode } from 'react'
import { Radio, FileText, Briefcase, Pencil, Check, X, Trash2, Clock, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { relativeWhen } from '@/lib/calendar/grouping'
import type { Interview } from '@/types'

export interface EventHandlers {
  onLaunch: (iv: Interview) => void
  onEdit: (iv: Interview) => void
  onReport: (iv: Interview) => void
  onJob: (iv: Interview) => void
  onComplete: (iv: Interview) => void
  onCancel: (iv: Interview) => void
  onDelete: (iv: Interview) => void
}

// Anchored detail+actions popover for a calendar event. Manages its own open
// state so action buttons close it. `children` is the event chip/block trigger.
export function EventPopover({
  iv,
  now,
  handlers,
  children,
}: {
  iv: Interview
  now: Date
  handlers: EventHandlers
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const run = (fn: (iv: Interview) => void) => () => {
    setOpen(false)
    fn(iv)
  }
  const upcoming = iv.status === 'upcoming'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{iv.round_name?.trim() || iv.interview_type.replace('_', ' ')}</Badge>
            {!upcoming && (
              <Badge variant="secondary" className="capitalize">
                {iv.status}
              </Badge>
            )}
          </div>
          <p className="text-sm font-medium">
            {iv.company} — {iv.job_title}
          </p>
          <p className="flex items-center gap-2 text-sm text-primary">
            <Clock className="h-4 w-4" />
            {relativeWhen(iv.scheduled_at, now)} · {iv.duration_min} min
          </p>
          {iv.location && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="break-all">{iv.location}</span>
            </p>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {upcoming && (
            <Button size="sm" onClick={run(handlers.onLaunch)}>
              <Radio className="mr-1.5 h-4 w-4" /> Start
            </Button>
          )}
          {iv.session_id && (
            <Button size="sm" variant="outline" onClick={run(handlers.onReport)}>
              <FileText className="mr-1.5 h-4 w-4" /> Report
            </Button>
          )}
          {iv.application_id && (
            <Button size="sm" variant="outline" onClick={run(handlers.onJob)}>
              <Briefcase className="mr-1.5 h-4 w-4" /> Job
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={run(handlers.onEdit)}>
            <Pencil className="mr-1.5 h-4 w-4" /> Edit
          </Button>
          {upcoming && (
            <Button size="sm" variant="ghost" onClick={run(handlers.onComplete)}>
              <Check className="mr-1.5 h-4 w-4" /> Complete
            </Button>
          )}
          {upcoming && (
            <Button size="sm" variant="ghost" onClick={run(handlers.onCancel)}>
              <X className="mr-1.5 h-4 w-4" /> Cancel
            </Button>
          )}
          <Button size="sm" variant="ghost" className="text-destructive" onClick={run(handlers.onDelete)}>
            <Trash2 className="mr-1.5 h-4 w-4" /> Delete
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
