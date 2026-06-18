import { describe, it, expect } from 'vitest'
import { computePassEnd, PASS_DAYS } from './pass'

const NOW = new Date('2026-06-17T12:00:00.000Z')
const DAY_MS = 86_400_000

describe('computePassEnd', () => {
  it('starts 30 days from now on a fresh purchase (no existing pass)', () => {
    const end = computePassEnd(null, NOW)
    expect(new Date(end).getTime()).toBe(NOW.getTime() + PASS_DAYS * DAY_MS)
  })

  it('stacks onto remaining time when bought before expiry', () => {
    const existing = new Date(NOW.getTime() + 10 * DAY_MS).toISOString() // 10 days left
    const end = computePassEnd(existing, NOW)
    expect(new Date(end).getTime()).toBe(new Date(existing).getTime() + PASS_DAYS * DAY_MS)
  })

  it('starts fresh from now when the existing pass already expired', () => {
    const expired = new Date(NOW.getTime() - 5 * DAY_MS).toISOString()
    const end = computePassEnd(expired, NOW)
    expect(new Date(end).getTime()).toBe(NOW.getTime() + PASS_DAYS * DAY_MS)
  })

  it('handles a custom day count and bad input', () => {
    expect(new Date(computePassEnd(null, NOW, 7)).getTime()).toBe(NOW.getTime() + 7 * DAY_MS)
    expect(new Date(computePassEnd('not-a-date', NOW)).getTime()).toBe(
      NOW.getTime() + PASS_DAYS * DAY_MS,
    )
  })
})
