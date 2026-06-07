import { describe, expect, it } from 'vitest'
import { combineQuestionTexts } from './useAutoListen'

describe('combineQuestionTexts', () => {
  it('joins multiple questions with a single space', () => {
    expect(
      combineQuestionTexts([
        { text: 'Why do you want to work here?' },
        { text: 'Where do you see yourself in 3 years?' },
      ]),
    ).toBe('Why do you want to work here? Where do you see yourself in 3 years?')
  })

  it('trims each part and drops blanks', () => {
    expect(
      combineQuestionTexts([{ text: '  Tell me about yourself.  ' }, { text: '   ' }, { text: '' }]),
    ).toBe('Tell me about yourself.')
  })

  it('returns empty string for no items', () => {
    expect(combineQuestionTexts([])).toBe('')
  })
})
