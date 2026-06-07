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

  it('catches questions with a preamble before the WH-word (no "?")', () => {
    const qs = [
      'So, why do you want to work here',
      'Okay so tell me about yourself',
      'And where do you see yourself in three years',
      'Alright, what makes you a good fit',
    ]
    for (const q of qs) {
      expect(detectQuestion(q).isQuestion, q).toBe(true)
    }
  })

  it('catches short elicitations and aux-led questions without "?"', () => {
    const qs = [
      'Walk me through your resume',
      "What's your biggest weakness",
      "I'm curious what makes you a good fit",
      'Are you comfortable owning the roadmap',
      'Give me an example of handling conflict',
      'Describe your ideal team',
    ]
    for (const q of qs) {
      expect(detectQuestion(q).isQuestion, q).toBe(true)
    }
  })

  it('catches a short explicit question', () => {
    expect(detectQuestion('Why Aplomb?').isQuestion).toBe(true)
  })

  it('normalizes cleanedText (strips preamble, adds "?")', () => {
    const r = detectQuestion('So why did you leave your last job')
    expect(r.isQuestion).toBe(true)
    expect(r.cleanedText).toBe('Why did you leave your last job?')
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

  it('keeps statements that merely contain a WH-word mid-sentence as statements', () => {
    expect(detectQuestion('I know how to scale systems').isQuestion).toBe(false)
    expect(detectQuestion('Let me tell you how we work here').isQuestion).toBe(false)
  })

  it('drops Whisper silence hallucinations', () => {
    for (const h of ['Thank you.', 'Thanks for watching!', 'you', 'Bye']) {
      const r = detectQuestion(h)
      expect(r.isQuestion, h).toBe(false)
    }
    expect(detectQuestion('Thank you.').reason).toBe('hallucination')
  })
})
