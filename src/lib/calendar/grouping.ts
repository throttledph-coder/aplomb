import type { Interview } from '@/types'

export interface GroupedInterviews {
  today: Interview[]
  thisWeek: Interview[]
  later: Interview[]
  past: Interview[]
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

// Pure: bucket interviews relative to `now`. Completed/cancelled always fall to
// `past` so the upcoming buckets stay actionable. Assumes `list` is sorted by
// scheduled_at ascending (queries.listInterviews does this); `past` is reversed
// to read most-recent-first.
export function groupByWhen(list: Interview[], now: Date): GroupedInterviews {
  const out: GroupedInterviews = { today: [], thisWeek: [], later: [], past: [] }
  const today0 = startOfDay(now).getTime()
  const tomorrow0 = today0 + 86_400_000
  const week0 = today0 + 7 * 86_400_000

  for (const iv of list) {
    if (iv.status !== 'upcoming') {
      out.past.push(iv)
      continue
    }
    const t = new Date(iv.scheduled_at).getTime()
    if (Number.isNaN(t)) out.later.push(iv)
    else if (t < today0) out.past.push(iv)
    else if (t < tomorrow0) out.today.push(iv)
    else if (t < week0) out.thisWeek.push(iv)
    else out.later.push(iv)
  }

  out.past.reverse()
  return out
}

// Human-friendly countdown for a card header, e.g. "in 25 min", "Today 2:00 PM",
// "Tomorrow 10:00 AM", "in 3 days · 9:00 AM", "Mar 14 · 11:30 AM".
export function relativeWhen(iso: string, now: Date): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const diffDays = Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / 86_400_000)

  if (diffDays === 0) {
    const ms = d.getTime() - now.getTime()
    if (ms >= 0 && ms < 60 * 60 * 1000) {
      return `in ${Math.max(1, Math.round(ms / 60_000))} min`
    }
    return `Today ${time}`
  }
  if (diffDays === 1) return `Tomorrow ${time}`
  if (diffDays === -1) return `Yesterday ${time}`
  if (diffDays > 1 && diffDays < 7) return `in ${diffDays} days · ${time}`

  const date = d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  return `${date} · ${time}`
}
