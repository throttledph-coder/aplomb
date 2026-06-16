import { describe, it, expect } from 'vitest'
import { CHANGELOG } from './changelog'

function cmpVersion(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0)
  }
  return 0
}

describe('CHANGELOG', () => {
  it('is non-empty and every entry has version, date, and items', () => {
    expect(CHANGELOG.length).toBeGreaterThan(0)
    for (const e of CHANGELOG) {
      expect(e.version).toMatch(/^\d+\.\d+\.\d+$/)
      expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(e.items.length).toBeGreaterThan(0)
    }
  })

  it('is ordered newest version first', () => {
    for (let i = 1; i < CHANGELOG.length; i++) {
      expect(cmpVersion(CHANGELOG[i - 1].version, CHANGELOG[i].version)).toBeGreaterThan(0)
    }
  })
})
