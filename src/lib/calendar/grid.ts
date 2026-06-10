import type { Interview } from '@/types'

// Pure local-time date math for the calendar grid views (Month / Week). Mirrors
// the local-time approach in grouping.ts so buckets and grids agree.

export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function addWeeks(d: Date, n: number): Date {
  return addDays(d, n * 7)
}

export function addMonths(d: Date, n: number): Date {
  const x = new Date(d)
  x.setMonth(x.getMonth() + n)
  return x
}

// Sunday-start week (Google default).
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d)
  x.setDate(x.getDate() - x.getDay())
  return x
}

export function weekDays(viewDate: Date): Date[] {
  const s = startOfWeek(viewDate)
  return Array.from({ length: 7 }, (_, i) => addDays(s, i))
}

// 6 rows × 7 days covering viewDate's month, padded with adjacent-month days so
// the top-left cell is the Sunday on/before the 1st.
export function monthMatrix(viewDate: Date): Date[][] {
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
  const gridStart = startOfWeek(first)
  return Array.from({ length: 6 }, (_, w) =>
    Array.from({ length: 7 }, (_, i) => addDays(gridStart, w * 7 + i)),
  )
}

export function eventsForDay(items: Interview[], day: Date): Interview[] {
  return items
    .filter((iv) => {
      const d = new Date(iv.scheduled_at)
      return !Number.isNaN(d.getTime()) && sameDay(d, day)
    })
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
}

export function minutesSinceMidnight(iso: string): number {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 0
  return d.getHours() * 60 + d.getMinutes()
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// Local-time value for <input type="datetime-local"> (YYYY-MM-DDTHH:mm).
export function toLocalInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`
}

export function monthLabel(d: Date): string {
  return d.toLocaleDateString([], { month: 'long', year: 'numeric' })
}

export function weekRangeLabel(d: Date): string {
  const days = weekDays(d)
  const s = days[0]
  const e = days[6]
  const sLabel = s.toLocaleDateString([], { month: 'short', day: 'numeric' })
  if (s.getMonth() === e.getMonth()) return `${sLabel} – ${e.getDate()}, ${e.getFullYear()}`
  const eLabel = e.toLocaleDateString([], { month: 'short', day: 'numeric' })
  return `${sLabel} – ${eLabel}, ${e.getFullYear()}`
}
