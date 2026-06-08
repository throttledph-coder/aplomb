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
  onMoreClick: (day: Date) => void
  onEventDrop: (id: number, day: Date) => void
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function MonthView({
  viewDate,
  items,
  now,
  onDayClick,
  onEventClick,
  onMoreClick,
  onEventDrop,
}: MonthViewProps) {
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
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const id = Number(e.dataTransfer.getData('text/plain'))
                if (id) onEventDrop(id, day)
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
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation()
                      e.dataTransfer.setData('text/plain', String(iv.id))
                      e.dataTransfer.effectAllowed = 'move'
                    }}
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
                      'cursor-grab truncate rounded px-1 py-0.5 text-[11px] leading-tight active:cursor-grabbing',
                      eventTone(iv),
                    )}
                    title={`${fmtTime(iv.scheduled_at)} · ${iv.company} — ${iv.job_title}`}
                  >
                    <span className="tabular-nums">{fmtTime(iv.scheduled_at)}</span> {iv.company}
                  </div>
                ))}
                {extra > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onMoreClick(day)
                    }}
                    className="px-1 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    +{extra} more
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
