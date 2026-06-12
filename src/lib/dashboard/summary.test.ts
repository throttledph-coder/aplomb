import { describe, it, expect } from 'vitest'
import { summarize } from './summary'
import type { Application, InterviewSession } from '@/types'

function app(status: Application['status']): Application {
  return {
    id: Math.random(),
    company: 'C',
    job_title: 'T',
    job_url: null,
    status,
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
    last_activity_at: null,
    notified_action: false,
    created_at: '',
    updated_at: '',
  }
}

function session(interview_type: InterviewSession['interview_type']): InterviewSession {
  return {
    id: Math.random(),
    resume_id: 1,
    application_id: null,
    session_name: null,
    company: 'C',
    job_title: 'T',
    interview_type,
    job_description: '',
    parsed_jd: null,
    additional_info: null,
    status: 'completed',
    duration_sec: 0,
    started_at: '',
    ended_at: null,
    coaching_report: null,
    keyword_matches: null,
    created_at: '',
  }
}

describe('summarize', () => {
  it('counts applications by status', () => {
    const s = summarize([app('applied'), app('applied'), app('offer')], [], [])
    expect(s.appsByStatus.applied).toBe(2)
    expect(s.appsByStatus.offer).toBe(1)
    expect(s.appsByStatus.wishlist).toBe(0)
    expect(s.totalApps).toBe(3)
  })

  it('counts sessions by type', () => {
    const s = summarize([], [session('technical'), session('behavioral'), session('technical')], [])
    expect(s.sessionsByType.technical).toBe(2)
    expect(s.sessionsByType.behavioral).toBe(1)
    expect(s.totalSessions).toBe(3)
  })

  it('buckets scores at the 50 and 75 thresholds', () => {
    const s = summarize([], [], [90, 75, 74, 50, 49, 10])
    expect(s.scoreBuckets.strong).toBe(2) // 90, 75
    expect(s.scoreBuckets.ok).toBe(2) // 74, 50
    expect(s.scoreBuckets.weak).toBe(2) // 49, 10
    expect(s.scored).toBe(6)
  })
})
