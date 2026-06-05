import { describe, it, expect } from 'vitest'
import { scoreAnswer } from './answer-scorer'

const Q = 'Tell me about a time you resolved a difficult customer escalation'

describe('scoreAnswer', () => {
  it('scores a strong on-topic first-person in-band answer high with no flags', () => {
    const answer =
      'I handled a difficult customer escalation when a billing error doubled a client invoice. ' +
      'I owned the issue, walked the customer through the refund, coordinated with finance, and ' +
      'followed up the next day. The customer stayed on and later upgraded their plan.'
    const r = scoreAnswer(answer, { question: Q, length: 'concise' })
    expect(r.flags).toEqual([])
    expect(r.score).toBe(1)
  })

  it('flags an AI disclaimer and scores low', () => {
    const r = scoreAnswer(
      'As an AI language model, I cannot have personal experience with customers.',
      { question: Q, length: 'concise' },
    )
    expect(r.flags).toContain('ai_disclaimer')
    expect(r.score).toBeLessThan(0.6)
  })

  it('flags too-short answers', () => {
    const r = scoreAnswer('I fixed it.', { question: Q, length: 'detailed' })
    expect(r.flags).toContain('too_short')
  })

  it('flags off-topic answers', () => {
    const answer =
      'My favorite programming language is TypeScript and I enjoy building desktop apps ' +
      'with Electron and React on the weekends for fun and learning new frameworks.'
    const r = scoreAnswer(answer, { question: Q, length: 'concise' })
    expect(r.flags).toContain('possibly_off_topic')
  })

  it('returns empty flag for blank answer', () => {
    expect(scoreAnswer('   ', { question: Q, length: 'detailed' })).toEqual({
      score: 0,
      flags: ['empty'],
      words: 0,
    })
  })
})
