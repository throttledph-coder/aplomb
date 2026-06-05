import { describe, it, expect } from 'vitest'
import { detectQuestion } from './question-filter'

describe('detectQuestion', () => {
  it('flags real interview questions', () => {
    const qs = [
      'What is your greatest weakness as an engineer?',
      'Can you walk me through a hard project you shipped?',
      'Tell me about a time you handled conflict on a team',
      'How would you design a rate limiter for our API?',
    ]
    for (const q of qs) {
      const r = detectQuestion(q)
      expect(r.isQuestion, q).toBe(true)
      expect(r.reason).toBe('question_pattern')
    }
  })

  it('rejects fillers / too-short chunks', () => {
    expect(detectQuestion('um').isQuestion).toBe(false)
    expect(detectQuestion('yeah okay').reason).toBe('too_short')
    expect(detectQuestion('right').reason).toBe('too_short')
  })

  it('rejects statements with no question pattern', () => {
    const r = detectQuestion('I worked at Google for several years on infra')
    expect(r.isQuestion).toBe(false)
    expect(r.reason).toBe('no_question_pattern')
  })
})
