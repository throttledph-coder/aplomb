import { describe, it, expect } from 'vitest'
import { matchKey, nextStatus } from './link'

describe('matchKey', () => {
  it('normalizes case and whitespace', () => {
    expect(matchKey('Google ', 'Senior  Engineer')).toBe(matchKey('google', 'senior engineer'))
  })

  it('distinguishes different jobs', () => {
    expect(matchKey('Google', 'Engineer')).not.toBe(matchKey('Google', 'Manager'))
    expect(matchKey('Google', 'Engineer')).not.toBe(matchKey('Meta', 'Engineer'))
  })
})

describe('nextStatus', () => {
  it('bumps early stages to interview', () => {
    expect(nextStatus('wishlist')).toBe('interview')
    expect(nextStatus('applied')).toBe('interview')
  })

  it('never downgrades later stages', () => {
    expect(nextStatus('screening')).toBe('screening')
    expect(nextStatus('interview')).toBe('interview')
    expect(nextStatus('offer')).toBe('offer')
    expect(nextStatus('rejected')).toBe('rejected')
  })
})
