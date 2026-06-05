import { describe, it, expect } from 'vitest'
import { parseQuestionList } from './questions-prompt'

describe('parseQuestionList', () => {
  it('strips numbering/bullets and dedupes', () => {
    const raw = '1. What is your weakness?\n- Tell me about yourself\n2. What is your weakness?'
    expect(parseQuestionList(raw)).toEqual(['What is your weakness?', 'Tell me about yourself'])
  })

  it('drops too-short lines', () => {
    expect(parseQuestionList('ok\n* A real question here?')).toEqual(['A real question here?'])
  })

  it('caps at 10', () => {
    const raw = Array.from({ length: 15 }, (_, i) => `Question number ${i}?`).join('\n')
    expect(parseQuestionList(raw)).toHaveLength(10)
  })
})
