import type { Interview } from '@/types'

// Local hour of the interview's day at which the "day-of" reminder becomes due.
// Kept conservative (08:00) so the morning-of nudge lands before a typical workday.
export const DAY_OF_HOUR = 8

export interface ReminderDue {
  dayOf: boolean
  before: boolean
}

// Pure: given an interview + the current time, decide which (if any) reminders
// are due right now. The scheduler calls this each tick and marks fired ones so
// they never repeat. Past / non-upcoming / already-notified cases return false.
export function computeReminderDue(iv: Interview, now: Date): ReminderDue {
  const due: ReminderDue = { dayOf: false, before: false }
  if (iv.status !== 'upcoming') return due

  const start = new Date(iv.scheduled_at)
  const startMs = start.getTime()
  if (Number.isNaN(startMs)) return due

  const nowMs = now.getTime()
  if (nowMs >= startMs) return due // interview has started / passed → nothing to nudge

  // Day-of: same local calendar date and at/after DAY_OF_HOUR.
  if (iv.remind_day_of && !iv.notified_day_of) {
    const sameDate =
      now.getFullYear() === start.getFullYear() &&
      now.getMonth() === start.getMonth() &&
      now.getDate() === start.getDate()
    if (sameDate && now.getHours() >= DAY_OF_HOUR) due.dayOf = true
  }

  // X minutes before: inside the lead window.
  const lead = iv.remind_mins_before ?? 0
  if (lead > 0 && !iv.notified_before && nowMs >= startMs - lead * 60_000) {
    due.before = true
  }

  return due
}
