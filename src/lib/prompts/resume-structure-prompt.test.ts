import { describe, it, expect } from 'vitest'
import { parseStructuredResume } from './resume-structure-prompt'

describe('parseStructuredResume', () => {
  it('parses valid JSON (even with surrounding prose)', () => {
    const raw = `Here you go:\n{
      "summary": "Engineer",
      "skills": ["ts", "react", 42],
      "experience": [{ "title": "Dev", "company": "X", "duration": "2021", "bullets": ["shipped"] }],
      "education": [{ "degree": "BS", "school": "U", "year": "2020" }],
      "projects": [{ "name": "P", "description": "d", "technologies": ["go"] }]
    }`
    const out = parseStructuredResume(raw)
    expect(out.summary).toBe('Engineer')
    expect(out.skills).toEqual(['ts', 'react']) // non-strings filtered
    expect(out.experience[0].company).toBe('X')
    expect(out.projects[0].technologies).toEqual(['go'])
  })

  it('returns empty shape on junk (never throws)', () => {
    const out = parseStructuredResume('not json at all')
    expect(out).toEqual({ summary: '', skills: [], experience: [], education: [], projects: [] })
  })
})
