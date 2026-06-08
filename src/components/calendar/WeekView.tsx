import { weekDays, eventsForDay, minutesSinceMidnight, sameDay } from '@/lib/calendar/grid'
import { cn } from '@/lib/utils'
import { eventTone } from './tone'
import type { Interview } from '@/types'

interface WeekViewProps {
  viewDate: Date
  items: Interview[]
  now: Date
  onSlotClick: (slot: Date) => void
  onEventClick: (iv: Interview) => void
}

// Pixels per hour. Matches the `h-12` (48px) hour cells; event top/height are
// computed at runtime so they must use inline geometry (Tailwind can't express
// dynamic px). Styling otherwise stays in Tailwind per project rules.
const HOUR_H = 48
const HOURS = Array.from({ length: 24 }, (_, h) => h)

function hourLabel(h: number): string {
  if (h === 0) return ''
  const ampm = h < 12 ? 'AM' : 'PM'
  const display = h % 12 === 0 ? 12 : h % 12
  return `${display} ${ampm}`
}

export function WeekView({ viewDate, items, now, onSlotClick, onEventClick }: WeekViewProps) {
  const days = weekDays(viewDate)
  const nowTop = now.getHours() * HOUR_H + (now.getMinutes() / 60) * HOUR_H

  return (
    <div className="max-h-[70vh] overflow-auto rounded-lg border">
      {/* Header row: blank gutter + 7 day headers */}
      <div className="sticky top-0 z-20 grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] bg-card">
        <div className="border-b border-r" />
        {days.map((d) => {
          const today = sameDay(d, now)
          return (
            <div key={d.toISOString()} className="border-b border-r py-1 text-center">
              <div className="text-[11px] text-muted-foreground">
                {d.toLocaleDateString([], { weekday: 'short' })}
              </div>
              <div
                className={cn(
                  'mx-auto flex h-6 w-6 items-center justify-center rounded-full text-sm',
                  today && 'bg-primary font-semibold text-primary-foreground',
                )}
              >
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Body: hour gutter + 7 day columns */}
      <div className="grid grid-cols-[3rem_repeat(7,minmax(0,1fr))]">
        <div>
          {HOURS.map((h) => (
            <div key={h} className="h-12 border-r pr-1 text-right text-[10px] text-muted-foreground">
              {hourLabel(h)}
            </div>
          ))}
        </div>
        {days.map((day) => {
          const dayEvents = eventsForDay(items, day)
          const today = sameDay(day, now)
          return (
            <div key={day.toISOString()} className="relative border-r">
              {HOURS.map((h) => (
                <div
                  key={h}
                  role="button"
                  tabIndex={-1}
                  className="h-12 cursor-pointer border-b hover:bg-accent/30"
                  onClick={() => {
                    const slot = new Date(day)
                    slot.setHours(h, 0, 0, 0)
                    onSlotClick(slot)
                  }}
                />
              ))}
              {today && (
                <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top: nowTop }}>
                  <div className="h-px bg-red-500" />
                  <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
                </div>
              )}
              {dayEvents.map((iv) => {
                const top = (minutesSinceMidnight(iv.scheduled_at) / 60) * HOUR_H
                const height = Math.max(18, (iv.duration_min / 60) * HOUR_H)
                return (
                  <div
                    key={iv.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onEventClick(iv)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onEventClick(iv)
                      }
                    }}
                    className={cn(
                      'absolute inset-x-0.5 z-10 overflow-hidden rounded px-1 text-[11px] leading-tight',
                      eventTone(iv),
                    )}
                    style={{ top, height }}
                    title={`${iv.company} — ${iv.job_title}`}
                  >
                    <div className="truncate font-medium">{iv.company}</div>
                    <div className="truncate">{iv.round_name?.trim() || iv.job_title}</div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
