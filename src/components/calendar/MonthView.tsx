import { monthMatrix, eventsForDay, sameDay } from '@/lib/calendar/grid'
import { cn } from '@/lib/utils'
import { eventTone, fmtTime } from './tone'
import type { Interview } from '@/types'

interface MonthViewProps {
  viewDate: Date
  items: Interview[]
  now: Date
  onDayClick: (day: Date) => void
  onEventClick: (iv: Interview) => void
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function MonthView({ viewDate, items, now, onDayClick, onEventClick }: MonthViewProps) {
  const weeks = monthMatrix(viewDate)
  const month = viewDate.getMonth()

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="grid grid-cols-7 border-b bg-muted/30 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flat().map((day, i) => {
          const dayEvents = eventsForDay(items, day)
          const isToday = sameDay(day, now)
          const outside = day.getMonth() !== month
          const shown = dayEvents.slice(0, 3)
          const extra = dayEvents.length - shown.length
          return (
            <div
              key={i}
              role="button"
              tabIndex={0}
              onClick={() => onDayClick(day)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onDayClick(day)
                }
              }}
              className={cn(
                'min-h-[5.5rem] cursor-pointer border-b border-r p-1.5 align-top transition-colors hover:bg-accent/40',
                i % 7 === 6 && 'border-r-0',
                i >= 35 && 'border-b-0',
                outside && 'bg-muted/20',
              )}
            >
              <div className="flex justify-end">
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs',
                    isToday && 'bg-primary font-semibold text-primary-foreground',
                    !isToday && outside && 'text-muted-foreground/60',
                  )}
                >
                  {day.getDate()}
                </span>
              </div>
              <div className="mt-1 space-y-1">
                {shown.map((iv) => (
                  <div
                    key={iv.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEventClick(iv)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        e.stopPropagation()
                        onEventClick(iv)
                      }
                    }}
                    className={cn(
                      'truncate rounded px-1 py-0.5 text-[11px] leading-tight',
                      eventTone(iv),
                    )}
                    title={`${fmtTime(iv.scheduled_at)} · ${iv.company} — ${iv.job_title}`}
                  >
                    <span className="tabular-nums">{fmtTime(iv.scheduled_at)}</span> {iv.company}
                  </div>
                ))}
                {extra > 0 && (
                  <div className="px-1 text-[11px] text-muted-foreground">+{extra} more</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
