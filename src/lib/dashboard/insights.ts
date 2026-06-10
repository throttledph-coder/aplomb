import { addDays, sameDay, startOfDay } from '@/lib/calendar/grid'
import type { Application, Interview, InterviewSession, InterviewType } from '@/types'

// Pure derivations for the one-stop dashboard: countdowns, activity feed,
// weekly trends, and heuristic performance insights. No AI calls — everything
// comes from local data so the home screen stays instant and honest.

// "in 2d 10h" / "in 3h 12m" / "in 45m" / "now" — countdown to a future ISO time.
export function countdownLabel(iso: string, now: Date): string {
  const ms = new Date(iso).getTime() - now.getTime()
  if (Number.isNaN(ms) || ms <= 0) return 'now'
  const mins = Math.floor(ms / 60_000)
  const days = Math.floor(mins / 1440)
  const hours = Math.floor((mins % 1440) / 60)
  if (days > 0) return `in ${days}d ${hours}h`
  if (hours > 0) return `in ${hours}h ${mins % 60}m`
  if (mins > 0) return `in ${mins}m`
  return 'now'
}

// "just now" / "5m ago" / "2h ago" / "3d ago" / "2w ago" / "Mar 14" — past ISO time.
export function timeAgo(iso: string, now: Date): string {
  const ms = now.getTime() - new Date(iso).getTime()
  if (Number.isNaN(ms) || ms < 60_000) return 'just now'
  const mins = Math.floor(ms / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// Count of timestamps within the trailing `days` window (stat-card deltas).
export function createdWithin(
  dates: (string | null | undefined)[],
  days: number,
  now: Date,
): number {
  const cutoff = now.getTime() - days * 86_400_000
  return dates.filter((d) => {
    if (!d) return false
    const t = new Date(d).getTime()
    return !Number.isNaN(t) && t >= cutoff
  }).length
}

// Sessions started per local day over the trailing week, oldest → newest
// (index 6 = today). Feeds the weekly-progress sparkline.
export function sessionsPerDay(sessions: InterviewSession[], now: Date): number[] {
  const days = Array.from({ length: 7 }, (_, i) => addDays(startOfDay(now), i - 6))
  return days.map(
    (day) =>
      sessions.filter((s) => {
        const d = new Date(s.started_at)
        return !Number.isNaN(d.getTime()) && sameDay(d, day)
      }).length,
  )
}

export interface TypeStat {
  type: InterviewType
  avg: number // rounded 0–100
  n: number
}

// Strongest/weakest interview type from per-answer scores. Requires at least 2
// scored answers per type to count; one qualifying type yields only `best`.
export function typePerformance(pairs: { type: InterviewType; score: number }[]): {
  best?: TypeStat
  worst?: TypeStat
} {
  const byType = new Map<InterviewType, number[]>()
  for (const p of pairs) {
    const arr = byType.get(p.type) ?? []
    arr.push(p.score)
    byType.set(p.type, arr)
  }
  const stats: TypeStat[] = [...byType.entries()]
    .filter(([, scores]) => scores.length >= 2)
    .map(([type, scores]) => ({
      type,
      avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      n: scores.length,
    }))
    .sort((a, b) => b.avg - a.avg)
  if (stats.length === 0) return {}
  if (stats.length === 1) return { best: stats[0] }
  return { best: stats[0], worst: stats[stats.length - 1] }
}

export type ActivityKind = 'session' | 'interview' | 'application'

export interface ActivityItem {
  kind: ActivityKind
  id: number
  company: string
  title: string
  at: string
}

// Merged recent-activity feed: prep sessions (started_at), interviews and
// applications (created_at), newest first.
export function recentActivity(
  sessions: InterviewSession[],
  interviews: Interview[],
  applications: Application[],
  limit = 6,
): ActivityItem[] {
  const items: ActivityItem[] = [
    ...sessions.map((s) => ({
      kind: 'session' as const,
      id: s.id,
      company: s.company,
      title: s.job_title,
      at: s.started_at,
    })),
    ...interviews.map((i) => ({
      kind: 'interview' as const,
      id: i.id,
      company: i.company,
      title: i.job_title,
      at: i.created_at,
    })),
    ...applications.map((a) => ({
      kind: 'application' as const,
      id: a.id,
      company: a.company,
      title: a.job_title,
      at: a.created_at,
    })),
  ]
  return items
    .filter((x) => !Number.isNaN(new Date(x.at).getTime()))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit)
}
