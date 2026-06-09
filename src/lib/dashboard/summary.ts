import type {
  Application,
  ApplicationStatus,
  InterviewSession,
  InterviewType,
} from '@/types'

export interface DashboardSummary {
  appsByStatus: Record<ApplicationStatus, number>
  sessionsByType: Record<InterviewType, number>
  scoreBuckets: { strong: number; ok: number; weak: number } // >=75 / 50-74 / <50
  totalApps: number
  totalSessions: number
  scored: number
}

const APP_STATUSES: ApplicationStatus[] = [
  'wishlist',
  'applied',
  'screening',
  'interview',
  'offer',
  'rejected',
]
const TYPES: InterviewType[] = ['technical', 'behavioral', 'mixed', 'system_design', 'other']

// Pure dashboard aggregation for the stat breakdown popovers. `scoresPct` is one
// 0–100 value per scored answer.
export function summarize(
  apps: Application[],
  sessions: InterviewSession[],
  scoresPct: number[],
): DashboardSummary {
  const appsByStatus = Object.fromEntries(APP_STATUSES.map((s) => [s, 0])) as Record<
    ApplicationStatus,
    number
  >
  for (const a of apps) if (a.status in appsByStatus) appsByStatus[a.status]++

  const sessionsByType = Object.fromEntries(TYPES.map((t) => [t, 0])) as Record<
    InterviewType,
    number
  >
  for (const s of sessions) if (s.interview_type in sessionsByType) sessionsByType[s.interview_type]++

  const scoreBuckets = { strong: 0, ok: 0, weak: 0 }
  for (const p of scoresPct) {
    if (p >= 75) scoreBuckets.strong++
    else if (p >= 50) scoreBuckets.ok++
    else scoreBuckets.weak++
  }

  return {
    appsByStatus,
    sessionsByType,
    scoreBuckets,
    totalApps: apps.length,
    totalSessions: sessions.length,
    scored: scoresPct.length,
  }
}
