import { describe, it, expect } from 'vitest'
import {
  monthMatrix,
  weekDays,
  sameDay,
  addDays,
  addMonths,
  eventsForDay,
  startOfWeek,
} from './grid'
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

describe('monthMatrix', () => {
  const view = new Date(2026, 5, 15) // June 2026

  it('is a 6×7 grid (42 cells)', () => {
    const m = monthMatrix(view)
    expect(m).toHaveLength(6)
    m.forEach((row) => expect(row).toHaveLength(7))
    expect(m.flat()).toHaveLength(42)
  })

  it('starts on a Sunday on/before the 1st and covers the whole month', () => {
    const flat = monthMatrix(view).flat()
    expect(flat[0].getDay()).toBe(0) // Sunday
    expect(flat[0].getTime()).toBeLessThanOrEqual(new Date(2026, 5, 1).getTime())
    expect(flat.some((d) => d.getMonth() === 5 && d.getDate() === 1)).toBe(true)
    expect(flat.some((d) => d.getMonth() === 5 && d.getDate() === 30)).toBe(true)
  })
})

describe('weekDays', () => {
  it('returns 7 days starting Sunday and includes the view date', () => {
    const view = new Date(2026, 5, 10) // Wed Jun 10
    const days = weekDays(view)
    expect(days).toHaveLength(7)
    expect(days[0].getDay()).toBe(0)
    expect(days.some((d) => sameDay(d, view))).toBe(true)
  })
})

describe('date math', () => {
  it('addDays crosses month boundaries', () => {
    const d = addDays(new Date(2026, 5, 30), 2)
    expect(d.getMonth()).toBe(6) // July
    expect(d.getDate()).toBe(2)
  })

  it('addMonths crosses year boundaries', () => {
    const d = addMonths(new Date(2026, 11, 15), 1)
    expect(d.getFullYear()).toBe(2027)
    expect(d.getMonth()).toBe(0)
  })

  it('startOfWeek is the preceding Sunday at midnight', () => {
    const s = startOfWeek(new Date(2026, 5, 10, 14, 30))
    expect(s.getDay()).toBe(0)
    expect(s.getHours()).toBe(0)
  })
})

describe('eventsForDay', () => {
  it('filters to the day and sorts by time', () => {
    const list = [
      makeInterview({ id: 1, scheduled_at: '2026-06-10T15:00:00' }),
      makeInterview({ id: 2, scheduled_at: '2026-06-10T09:00:00' }),
      makeInterview({ id: 3, scheduled_at: '2026-06-11T09:00:00' }),
    ]
    const out = eventsForDay(list, new Date(2026, 5, 10))
    expect(out.map((i) => i.id)).toEqual([2, 1])
  })
})
