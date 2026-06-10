import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Radio, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverClose,
} from '@/components/ui/popover'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { addMonths, eventsForDay, monthLabel, monthMatrix, sameDay } from '@/lib/calendar/grid'
import { cn } from '@/lib/utils'
import type { Interview } from '@/types'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function dayHeading(d: Date): string {
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}

function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

// Compact interactive month calendar for the dashboard. Days with events open
// an agenda popover (quick-launch, add, open calendar); empty days go straight
// to scheduling on that date. Pure presentation — all mutations via callbacks.
export function MiniCalendar({
  items,
  now,
  onLaunch,
  onSchedule,
  onOpen,
}: {
  items: Interview[]
  now: Date
  onLaunch: (iv: Interview) => void
  onSchedule: (day: Date) => void
  onOpen: () => void
}) {
  const [viewDate, setViewDate] = useState(() => new Date(now))
  const weeks = monthMatrix(viewDate)

  function cell(day: Date) {
    const events = eventsForDay(items, day)
    const isToday = sameDay(day, now)
    const inMonth = day.getMonth() === viewDate.getMonth()
    const hasUpcoming = events.some((e) => e.status === 'upcoming')

    const button = (
      <button
        onClick={events.length === 0 ? () => onSchedule(day) : undefined}
        aria-label={day.toDateString() + (events.length ? `, ${events.length} interview(s)` : '')}
        className={cn(
          'relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs tabular-nums transition-colors',
          isToday
            ? 'bg-primary font-semibold text-primary-foreground hover:bg-primary/90'
            : 'hover:bg-accent',
          !inMonth && !isToday && 'text-muted-foreground/40',
        )}
      >
        {day.getDate()}
        {events.length > 0 && (
          <span
            className={cn(
              'absolute bottom-0.5 h-1 w-1 rounded-full',
              isToday
                ? 'bg-primary-foreground'
                : hasUpcoming
                  ? 'bg-primary'
                  : 'bg-muted-foreground/50',
            )}
          />
        )}
      </button>
    )

    if (events.length === 0) return <div key={day.getTime()}>{button}</div>

    return (
      <Popover key={day.getTime()}>
        {/* Hover = read-only schedule/notes preview; click = the action popover. */}
        <HoverCard openDelay={150} closeDelay={100}>
          <HoverCardTrigger asChild>
            <PopoverTrigger asChild>{button}</PopoverTrigger>
          </HoverCardTrigger>
          <HoverCardContent align="center" side="left" className="w-64 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {dayHeading(day)}
            </p>
            <div className="mt-2 space-y-2.5">
              {events.map((iv) => (
                <div key={iv.id} className="min-w-0">
                  <p
                    className={cn(
                      'truncate text-sm font-medium',
                      iv.status === 'cancelled' && 'text-muted-foreground line-through',
                    )}
                  >
                    <span className="tabular-nums text-primary">{timeLabel(iv.scheduled_at)}</span>{' '}
                    {iv.company} — {iv.job_title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="px-1.5 py-0 text-[10px] capitalize">
                      {iv.round_name?.trim() || iv.interview_type.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{iv.duration_min} min</span>
                  </div>
                  {iv.location && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{iv.location}</span>
                    </p>
                  )}
                  {iv.notes?.trim() && (
                    <p className="mt-1 line-clamp-2 text-xs italic text-muted-foreground">
                      {iv.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 border-t pt-1.5 text-[10px] text-muted-foreground/70">
              Click the date for actions
            </p>
          </HoverCardContent>
        </HoverCard>
        <PopoverContent align="center" className="w-64 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {dayHeading(day)}
          </p>
          <div className="mt-2 space-y-1.5">
            {events.map((iv) => (
              <div key={iv.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'truncate text-sm font-medium',
                      iv.status === 'cancelled' && 'text-muted-foreground line-through',
                    )}
                  >
                    <span className="tabular-nums text-primary">{timeLabel(iv.scheduled_at)}</span>{' '}
                    {iv.company}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {iv.job_title} · {iv.duration_min} min
                  </p>
                </div>
                {iv.status === 'upcoming' && (
                  <PopoverClose asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0 text-primary"
                      onClick={() => onLaunch(iv)}
                      aria-label={`Start live session for ${iv.company}`}
                    >
                      <Radio className="h-4 w-4" />
                    </Button>
                  </PopoverClose>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2.5 border-t pt-2">
            <PopoverClose asChild>
              <Button size="sm" variant="ghost" className="w-full" onClick={() => onSchedule(day)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add
              </Button>
            </PopoverClose>
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={onOpen}
          className="text-sm font-medium tracking-tight transition-colors hover:text-primary"
          aria-label="Open calendar"
        >
          {monthLabel(viewDate)}
        </button>
        <div className="flex items-center">
          {!sameMonth(viewDate, now) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setViewDate(new Date(now))}
            >
              Today
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewDate((v) => addMonths(v, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewDate((v) => addMonths(v, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 pb-1 text-center text-[10px] font-medium uppercase text-muted-foreground/70">
        {WEEKDAYS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {weeks.flat().map((day) => cell(day))}
      </div>
    </div>
  )
}
