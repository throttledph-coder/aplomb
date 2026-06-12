import { describe, it, expect } from 'vitest'
import { suggestNextAction, actionDue, isStale, daysSinceActivity } from './actions'
import type { Application, Interview } from '@/types'

const NOW = new Date(2026, 5, 11, 12, 0, 0) // Thu Jun 11 2026, noon local

function app(overrides: Partial<Application> = {}): Application {
  return {
    id: 1,
    company: 'Acme',
    job_title: 'Engineer',
    job_url: null,
    status: 'applied',
    job_description: null,
    notes: null,
    session_id: null,
    applied_at: null,
    salary_range: null,
    location: null,
    source: null,
    deadline: null,
    excitement: null,
    next_action: null,
    next_action_at: null,
    last_activity_at: '2026-06-10T12:00:00',
    notified_action: false,
    created_at: '2026-06-01T00:00:00',
    updated_at: '2026-06-01T00:00:00',
    ...overrides,
  }
}

function interview(overrides: Partial<Interview> = {}): Interview {
  return {
    id: 1,
    application_id: 1,
    resume_id: null,
    session_id: null,
    company: 'Acme',
    job_title: 'Engineer',
    interview_type: 'mixed',
    job_description: null,
    round_name: null,
    location: null,
    scheduled_at: '2026-06-10T10:00:00',
    duration_min: 45,
    status: 'completed',
    notes: null,
    additional_info: null,
    remind_day_of: true,
    remind_mins_before: 30,
    notified_day_of: false,
    notified_before: false,
    created_at: '2026-06-01T00:00:00',
    updated_at: '2026-06-01T00:00:00',
    ...overrides,
  }
}

describe('suggestNextAction', () => {
  it('explicit user-set action always wins', () => {
    const a = app({
      status: 'interview',
      next_action: 'Email the hiring manager',
      next_action_at: '2026-06-12T09:00:00',
    })
    const out = suggestNextAction(a, [], NOW)
    expect(out?.action).toBe('Email the hiring manager')
    expect(out?.due.getDate()).toBe(12)
  })

  it('applied + idle 5d → follow up; fresh applied → nothing', () => {
    const idle = app({ last_activity_at: '2026-06-05T12:00:00' }) // 6d idle
    expect(suggestNextAction(idle, [], NOW)?.action).toMatch(/follow up/i)
    const fresh = app({ last_activity_at: '2026-06-10T12:00:00' }) // 1d idle
    expect(suggestNextAction(fresh, [], NOW)).toBeNull()
  })

  it('screening + idle 7d → check in', () => {
    const a = app({ status: 'screening', last_activity_at: '2026-06-03T12:00:00' }) // 8d
    expect(suggestNextAction(a, [], NOW)?.action).toMatch(/check in/i)
  })

  it('interview with a round completed yesterday → thank-you note', () => {
    const a = app({ status: 'interview' })
    const rounds = [interview({ scheduled_at: '2026-06-10T15:00:00', status: 'completed' })]
    expect(suggestNextAction(a, rounds, NOW)?.action).toMatch(/thank-you/i)
  })

  it('offer → respond, due at the deadline', () => {
    const a = app({ status: 'offer', deadline: '2026-06-15T17:00:00' })
    const out = suggestNextAction(a, [], NOW)
    expect(out?.action).toMatch(/respond/i)
    expect(out?.due.getDate()).toBe(15)
  })

  it('wishlist with a future deadline → apply before it', () => {
    const a = app({ status: 'wishlist', deadline: '2026-06-20T00:00:00' })
    expect(suggestNextAction(a, [], NOW)?.action).toMatch(/apply/i)
    expect(suggestNextAction(app({ status: 'wishlist' }), [], NOW)).toBeNull()
  })
})

describe('actionDue', () => {
  it('due only for explicit, past-due, un-notified actions', () => {
    const due = app({ next_action: 'Follow up', next_action_at: '2026-06-11T09:00:00' })
    expect(actionDue(due, NOW)).toBe(true)
    expect(actionDue({ ...due, notified_action: true }, NOW)).toBe(false)
    expect(actionDue(app({ next_action_at: '2026-06-11T09:00:00' }), NOW)).toBe(false) // no text
    expect(
      actionDue(app({ next_action: 'Follow up', next_action_at: '2026-06-12T09:00:00' }), NOW),
    ).toBe(false) // future
  })
})

describe('isStale / daysSinceActivity', () => {
  it('active app idle 14d+ is stale; wishlist and fresh are not', () => {
    const stale = app({ last_activity_at: '2026-05-25T12:00:00' }) // 17d
    expect(daysSinceActivity(stale, NOW)).toBe(17)
    expect(isStale(stale, NOW)).toBe(true)
    expect(isStale(app({ ...stale, status: 'wishlist' }), NOW)).toBe(false)
    expect(isStale(app(), NOW)).toBe(false)
  })
})
