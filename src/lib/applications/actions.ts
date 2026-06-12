import type { Application, ApplicationStatus, Interview } from '@/types'

// Pure next-action rules for the tracker. Suggestions power the Home action
// queue and Kanban chips; ONLY explicit user-set next_action_at values drive
// native notifications (heuristics never spam).

const DAY_MS = 86_400_000

const ACTIVE_STATUSES: ApplicationStatus[] = ['applied', 'screening', 'interview', 'offer']

function dateOf(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS)
}

// Last meaningful movement on the application (falls back to creation).
export function lastActivity(app: Application): Date {
  return dateOf(app.last_activity_at) ?? dateOf(app.created_at) ?? new Date(0)
}

export function daysSinceActivity(app: Application, now: Date): number {
  return Math.floor((now.getTime() - lastActivity(app).getTime()) / DAY_MS)
}

export interface SuggestedAction {
  action: string
  due: Date
}

// What the user should do next for this application, or null when nothing is
// called for. An explicit user-set next_action always wins over heuristics.
export function suggestNextAction(
  app: Application,
  interviews: Interview[],
  now: Date,
): SuggestedAction | null {
  if (app.next_action?.trim()) {
    return { action: app.next_action.trim(), due: dateOf(app.next_action_at) ?? now }
  }

  if (app.status === 'offer') {
    return { action: 'Respond to the offer', due: dateOf(app.deadline) ?? now }
  }

  if (app.status === 'wishlist') {
    const deadline = dateOf(app.deadline)
    if (deadline && deadline.getTime() > now.getTime() - DAY_MS) {
      return { action: 'Apply before the deadline', due: deadline }
    }
    return null
  }

  if (app.status === 'interview') {
    // A recently finished round deserves a thank-you note.
    const lastDone = interviews
      .filter((i) => i.application_id === app.id && i.status === 'completed')
      .map((i) => dateOf(i.scheduled_at))
      .filter((d): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0]
    if (lastDone && now.getTime() - lastDone.getTime() <= 2 * DAY_MS) {
      return { action: 'Send a thank-you note', due: addDays(lastDone, 1) }
    }
    return null
  }

  const idle = daysSinceActivity(app, now)
  if (app.status === 'applied' && idle >= 5) {
    return { action: 'Follow up on your application', due: addDays(lastActivity(app), 5) }
  }
  if (app.status === 'screening' && idle >= 7) {
    return { action: 'Check in with the recruiter', due: addDays(lastActivity(app), 7) }
  }
  return null
}

// True when the user's explicit next action is due and hasn't been notified.
export function actionDue(app: Application, now: Date): boolean {
  if (app.notified_action) return false
  if (!app.next_action?.trim()) return false
  const due = dateOf(app.next_action_at)
  return due !== null && due.getTime() <= now.getTime()
}

// Active application with no movement for 2+ weeks.
export function isStale(app: Application, now: Date): boolean {
  return ACTIVE_STATUSES.includes(app.status) && daysSinceActivity(app, now) >= 14
}
