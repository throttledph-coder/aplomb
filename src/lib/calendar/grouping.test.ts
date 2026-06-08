import { describe, it, expect } from 'vitest'
import { groupByWhen, relativeWhen } from './grouping'
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

describe('groupByWhen', () => {
  const now = new Date(2026, 5, 10, 9, 0, 0) // Wed Jun 10 2026, 9am

  it('buckets by today / this week / later / past', () => {
    const list = [
      makeInterview({ id: 1, scheduled_at: '2026-06-08T10:00:00' }), // past
      makeInterview({ id: 2, scheduled_at: '2026-06-10T15:00:00' }), // today
      makeInterview({ id: 3, scheduled_at: '2026-06-12T11:00:00' }), // this week
      makeInterview({ id: 4, scheduled_at: '2026-06-25T11:00:00' }), // later
    ]
    const g = groupByWhen(list, now)
    expect(g.today.map((i) => i.id)).toEqual([2])
    expect(g.thisWeek.map((i) => i.id)).toEqual([3])
    expect(g.later.map((i) => i.id)).toEqual([4])
    expect(g.past.map((i) => i.id)).toEqual([1])
  })

  it('sends completed/cancelled to past regardless of date', () => {
    const list = [
      makeInterview({ id: 5, status: 'completed', scheduled_at: '2026-06-10T15:00:00' }),
      makeInterview({ id: 6, status: 'cancelled', scheduled_at: '2026-06-12T11:00:00' }),
    ]
    const g = groupByWhen(list, now)
    expect(g.today).toEqual([])
    expect(g.thisWeek).toEqual([])
    expect(g.past.map((i) => i.id).sort()).toEqual([5, 6])
  })
})

describe('relativeWhen', () => {
  const now = new Date(2026, 5, 10, 9, 0, 0)

  it('shows minutes when within the hour', () => {
    expect(relativeWhen('2026-06-10T09:25:00', now)).toBe('in 25 min')
  })

  it('labels today / tomorrow / yesterday', () => {
    expect(relativeWhen('2026-06-10T16:00:00', now)).toMatch(/^Today /)
    expect(relativeWhen('2026-06-11T10:00:00', now)).toMatch(/^Tomorrow /)
    expect(relativeWhen('2026-06-09T10:00:00', now)).toMatch(/^Yesterday /)
  })

  it('counts days within the week', () => {
    expect(relativeWhen('2026-06-13T10:00:00', now)).toMatch(/^in 3 days · /)
  })
})
