import { describe, it, expect } from 'vitest'
import { computeReminderDue, DAY_OF_HOUR } from './reminders'
import type { Interview } from '@/types'

function makeInterview(overrides: Partial<Interview> = {}): Interview {
  return {
    id: 1,
    application_id: null,
    resume_id: null,
    session_id: null,
    company: 'Acme',
    job_title: 'Engineer',
    interview_type: 'mixed',
    job_description: null,
    round_name: null,
    location: null,
    scheduled_at: '2026-06-10T14:00:00',
    duration_min: 45,
    status: 'upcoming',
    notes: null,
    remind_day_of: true,
    remind_mins_before: 30,
    notified_day_of: false,
    notified_before: false,
    created_at: '2026-06-01T00:00:00',
    updated_at: '2026-06-01T00:00:00',
    ...overrides,
  }
}

describe('computeReminderDue', () => {
  it('fires the day-of reminder same day at/after DAY_OF_HOUR', () => {
    const iv = makeInterview({ scheduled_at: '2026-06-10T14:00:00' })
    const now = new Date(2026, 5, 10, DAY_OF_HOUR, 0, 0) // 8:00 same day
    expect(computeReminderDue(iv, now).dayOf).toBe(true)
  })

  it('does not fire day-of before DAY_OF_HOUR', () => {
    const iv = makeInterview({ scheduled_at: '2026-06-10T14:00:00' })
    const now = new Date(2026, 5, 10, DAY_OF_HOUR - 1, 30, 0) // 7:30
    expect(computeReminderDue(iv, now).dayOf).toBe(false)
  })

  it('does not fire day-of on a prior day', () => {
    const iv = makeInterview({ scheduled_at: '2026-06-10T14:00:00' })
    const now = new Date(2026, 5, 9, 20, 0, 0) // night before
    expect(computeReminderDue(iv, now).dayOf).toBe(false)
  })

  it('fires the before reminder inside the lead window', () => {
    const iv = makeInterview({ scheduled_at: '2026-06-10T14:00:00', remind_mins_before: 30 })
    const now = new Date(2026, 5, 10, 13, 35, 0) // 25 min out
    expect(computeReminderDue(iv, now).before).toBe(true)
  })

  it('does not fire before reminder outside the lead window', () => {
    const iv = makeInterview({ scheduled_at: '2026-06-10T14:00:00', remind_mins_before: 30 })
    const now = new Date(2026, 5, 10, 13, 0, 0) // 60 min out
    expect(computeReminderDue(iv, now).before).toBe(false)
  })

  it('never fires once the interview has started', () => {
    const iv = makeInterview({ scheduled_at: '2026-06-10T14:00:00' })
    const now = new Date(2026, 5, 10, 14, 1, 0)
    const due = computeReminderDue(iv, now)
    expect(due.dayOf).toBe(false)
    expect(due.before).toBe(false)
  })

  it('respects already-notified flags', () => {
    const iv = makeInterview({
      scheduled_at: '2026-06-10T14:00:00',
      notified_day_of: true,
      notified_before: true,
    })
    const now = new Date(2026, 5, 10, 13, 50, 0)
    const due = computeReminderDue(iv, now)
    expect(due.dayOf).toBe(false)
    expect(due.before).toBe(false)
  })

  it('respects disabled reminders', () => {
    const iv = makeInterview({
      scheduled_at: '2026-06-10T14:00:00',
      remind_day_of: false,
      remind_mins_before: 0,
    })
    const now = new Date(2026, 5, 10, 13, 55, 0)
    const due = computeReminderDue(iv, now)
    expect(due.dayOf).toBe(false)
    expect(due.before).toBe(false)
  })

  it('never fires for non-upcoming interviews', () => {
    const iv = makeInterview({ status: 'cancelled', scheduled_at: '2026-06-10T14:00:00' })
    const now = new Date(2026, 5, 10, 13, 50, 0)
    const due = computeReminderDue(iv, now)
    expect(due.dayOf).toBe(false)
    expect(due.before).toBe(false)
  })
})
