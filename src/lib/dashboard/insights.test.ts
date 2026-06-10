import { describe, it, expect } from 'vitest'
import {
  countdownLabel,
  timeAgo,
  createdWithin,
  sessionsPerDay,
  typePerformance,
  recentActivity,
} from './insights'
import type { Application, Interview, InterviewSession } from '@/types'

const NOW = new Date(2026, 5, 10, 12, 0, 0) // Wed Jun 10 2026, noon local

function session(overrides: Partial<InterviewSession> = {}): InterviewSession {
  return {
    id: 1,
    resume_id: 1,
    application_id: null,
    session_name: null,
    company: 'Acme',
    job_title: 'Engineer',
    interview_type: 'mixed',
    job_description: '',
    parsed_jd: null,
    additional_info: null,
    status: 'completed',
    duration_sec: 0,
    started_at: '2026-06-10T09:00:00',
    ended_at: null,
    coaching_report: null,
    keyword_matches: null,
    created_at: '2026-06-10T09:00:00',
    ...overrides,
  }
}

function interview(overrides: Partial<Interview> = {}): Interview {
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
    scheduled_at: '2026-06-12T10:00:00',
    duration_min: 45,
    status: 'upcoming',
    notes: null,
    additional_info: null,
    remind_day_of: true,
    remind_mins_before: 30,
    notified_day_of: false,
    notified_before: false,
    created_at: '2026-06-09T08:00:00',
    updated_at: '2026-06-09T08:00:00',
    ...overrides,
  }
}

function application(overrides: Partial<Application> = {}): Application {
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
    created_at: '2026-06-08T08:00:00',
    updated_at: '2026-06-08T08:00:00',
    ...overrides,
  }
}

describe('countdownLabel', () => {
  it('formats days+hours, hours+minutes, and minutes', () => {
    expect(countdownLabel('2026-06-12T22:30:00', NOW)).toBe('in 2d 10h')
    expect(countdownLabel('2026-06-10T15:12:00', NOW)).toBe('in 3h 12m')
    expect(countdownLabel('2026-06-10T12:45:00', NOW)).toBe('in 45m')
  })

  it('returns "now" for past or invalid times', () => {
    expect(countdownLabel('2026-06-10T11:00:00', NOW)).toBe('now')
    expect(countdownLabel('not-a-date', NOW)).toBe('now')
  })
})

describe('timeAgo', () => {
  it('buckets into minutes, hours, days, weeks', () => {
    expect(timeAgo('2026-06-10T11:59:30', NOW)).toBe('just now')
    expect(timeAgo('2026-06-10T11:55:00', NOW)).toBe('5m ago')
    expect(timeAgo('2026-06-10T10:00:00', NOW)).toBe('2h ago')
    expect(timeAgo('2026-06-07T12:00:00', NOW)).toBe('3d ago')
    expect(timeAgo('2026-05-27T12:00:00', NOW)).toBe('2w ago')
  })
})

describe('createdWithin', () => {
  it('counts timestamps inside the trailing window, skipping null/invalid', () => {
    const dates = ['2026-06-09T00:00:00', '2026-06-01T00:00:00', null, 'bad']
    expect(createdWithin(dates, 7, NOW)).toBe(1)
    expect(createdWithin(dates, 30, NOW)).toBe(2)
  })
})

describe('sessionsPerDay', () => {
  it('returns 7 buckets oldest→newest with today last', () => {
    const list = [
      session({ id: 1, started_at: '2026-06-10T09:00:00' }), // today
      session({ id: 2, started_at: '2026-06-10T15:00:00' }), // today
      session({ id: 3, started_at: '2026-06-04T09:00:00' }), // 6 days ago (first bucket)
      session({ id: 4, started_at: '2026-06-03T09:00:00' }), // outside window
    ]
    const out = sessionsPerDay(list, NOW)
    expect(out).toHaveLength(7)
    expect(out[6]).toBe(2)
    expect(out[0]).toBe(1)
    expect(out.reduce((a, b) => a + b, 0)).toBe(3)
  })
})

describe('typePerformance', () => {
  it('requires 2+ scored answers per type and orders best/worst', () => {
    const out = typePerformance([
      { type: 'behavioral', score: 80 },
      { type: 'behavioral', score: 84 },
      { type: 'system_design', score: 50 },
      { type: 'system_design', score: 58 },
      { type: 'technical', score: 95 }, // only 1 → excluded
    ])
    expect(out.best?.type).toBe('behavioral')
    expect(out.best?.avg).toBe(82)
    expect(out.worst?.type).toBe('system_design')
    expect(out.worst?.avg).toBe(54)
  })

  it('yields only best with a single qualifying type, empty when none', () => {
    const one = typePerformance([
      { type: 'mixed', score: 60 },
      { type: 'mixed', score: 70 },
    ])
    expect(one.best?.type).toBe('mixed')
    expect(one.worst).toBeUndefined()
    expect(typePerformance([])).toEqual({})
  })
})

describe('recentActivity', () => {
  it('merges kinds, sorts newest first, and caps at the limit', () => {
    const out = recentActivity(
      [session({ id: 10, started_at: '2026-06-10T09:00:00' })],
      [interview({ id: 20, created_at: '2026-06-09T08:00:00' })],
      [application({ id: 30, created_at: '2026-06-10T10:00:00' })],
    )
    expect(out.map((x) => `${x.kind}:${x.id}`)).toEqual([
      'application:30',
      'session:10',
      'interview:20',
    ])
  })

  it('caps at the limit', () => {
    const sessions = Array.from({ length: 10 }, (_, i) =>
      session({ id: i, started_at: `2026-06-0${(i % 9) + 1}T09:00:00` }),
    )
    expect(recentActivity(sessions, [], [])).toHaveLength(6)
  })
})
