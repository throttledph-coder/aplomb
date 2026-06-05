import { describe, it, expect } from 'vitest'
import { parseExport } from './backup'

const valid = JSON.stringify({
  exported_at: '2026-01-01',
  settings: { theme: 'dark' },
  resumes: [{ id: 1, name: 'R' }],
  sessions: [{ id: 1, company: 'A' }],
  qa: { '1': [{ id: 1, question: 'q', answer: 'a' }] },
})

describe('parseExport', () => {
  it('round-trips a valid export', () => {
    const out = parseExport(valid)
    expect(out.resumes).toHaveLength(1)
    expect(out.sessions).toHaveLength(1)
    expect(out.qa['1']).toHaveLength(1)
  })

  it('defaults qa to {} when absent', () => {
    const out = parseExport(JSON.stringify({ resumes: [], sessions: [] }))
    expect(out.qa).toEqual({})
  })

  it('throws on invalid JSON', () => {
    expect(() => parseExport('{not json')).toThrow()
  })

  it('throws when resumes/sessions missing', () => {
    expect(() => parseExport(JSON.stringify({ foo: 1 }))).toThrow()
  })
})
