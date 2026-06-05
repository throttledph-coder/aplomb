import { describe, it, expect } from 'vitest'
import { checkSessionLimit, checkFeatureAccess, canAddResume } from './plan'

describe('checkSessionLimit', () => {
  it('is unlimited for free (prep is free) and premium', () => {
    expect(checkSessionLimit(4, 'free')).toBe(true)
    expect(checkSessionLimit(999, 'free')).toBe(true)
    expect(checkSessionLimit(99, 'premium')).toBe(true)
  })
})

describe('checkFeatureAccess', () => {
  it('gates premium features', () => {
    expect(checkFeatureAccess('autoListenEnabled', 'free')).toBe(false)
    expect(checkFeatureAccess('autoListenEnabled', 'premium')).toBe(true)
    expect(checkFeatureAccess('stealthModeEnabled', 'free')).toBe(false)
    expect(checkFeatureAccess('stealthModeEnabled', 'premium')).toBe(true)
  })
})

describe('canAddResume', () => {
  it('is unlimited for free and premium', () => {
    expect(canAddResume(0, 'free')).toBe(true)
    expect(canAddResume(5, 'free')).toBe(true)
    expect(canAddResume(50, 'premium')).toBe(true)
  })
})
