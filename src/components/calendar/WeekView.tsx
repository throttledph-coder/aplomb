import { useEffect, useRef } from 'react'
import { weekDays, eventsForDay, minutesSinceMidnight, sameDay } from '@/lib/calendar/grid'
import { cn } from '@/lib/utils'
import { eventTone } from './tone'
import { EventPopover, type EventHandlers } from './EventPopover'
import type { Interview } from '@/types'

interface WeekViewProps {
  viewDate: Date
  items: Interview[]
  now: Date
  onSlotClick: (slot: Date) => void
  handlers: EventHandlers
  onEventDrop: (id: number, slot: Date) => void
}

// Pixels per hour. Matches the `h-12` (48px) hour cells; event top/height are
// computed at runtime so they must use inline geometry (Tailwind can't express
// dynamic px). Styling otherwise stays in Tailwind per project rules.
const HOUR_H = 48
const HOURS = Array.from({ length: 24 }, (_, h) => h)
const SNAP_MIN = 15

function hourLabel(h: number): string {
  if (h === 0) return ''
  const ampm = h < 12 ? 'AM' : 'PM'
  const display = h % 12 === 0 ? 12 : h % 12
  return `${display} ${ampm}`
}

export function WeekView({
  viewDate,
  items,
  now,
  onSlotClick,
  handlers,
  onEventDrop,
}: WeekViewProps) {
  const days = weekDays(viewDate)
  const nowTop = now.getHours() * HOUR_H + (now.getMinutes() / 60) * HOUR_H
  const scrollRef = useRef<HTMLDivElement>(null)

  // Open the week scrolled to ~8 AM (typical working hours), once on mount.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 8 * HOUR_H
  }, [])

  function dropToSlot(day: Date, e: React.DragEvent<HTMLDivElement>): Date | null {
    const id = Number(e.dataTransfer.getData('text/plain'))
    if (!id) return null
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const rawMin = (y / HOUR_H) * 60
    const mins = Math.max(0, Math.min(23 * 60 + 45, Math.round(rawMin / SNAP_MIN) * SNAP_MIN))
    const slot = new Date(day)
    slot.setHours(0, mins, 0, 0)
    return slot
  }

  return (
    <div ref={scrollRef} className="max-h-[70vh] overflow-auto rounded-lg border">
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
            <div
              key={day.toISOString()}
              className="relative border-r"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const slot = dropToSlot(day, e)
                const id = Number(e.dataTransfer.getData('text/plain'))
                if (slot && id) onEventDrop(id, slot)
              }}
            >
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
                  <EventPopover key={iv.id} iv={iv} now={now} handlers={handlers}>
                    <div
                      role="button"
                      tabIndex={0}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', String(iv.id))
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                      className={cn(
                        'absolute inset-x-0.5 z-10 cursor-grab overflow-hidden rounded px-1 text-[11px] leading-tight active:cursor-grabbing',
                        eventTone(iv),
                      )}
                      style={{ top, height }}
                      title={`${iv.company} — ${iv.job_title}`}
                    >
                      <div className="truncate font-medium">{iv.company}</div>
                      <div className="truncate">{iv.round_name?.trim() || iv.job_title}</div>
                    </div>
                  </EventPopover>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
