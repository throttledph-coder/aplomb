import { describe, it, expect } from 'vitest'
import { classifyTranscribeError, transcribeErrorMessage } from './transcribe-error'

describe('classifyTranscribeError', () => {
  it('detects key problems', () => {
    expect(classifyTranscribeError('401 Unauthorized')).toBe('key')
    expect(classifyTranscribeError('Invalid API Key provided')).toBe('key')
    expect(classifyTranscribeError('No API key set')).toBe('key')
  })

  it('detects rate limits', () => {
    expect(classifyTranscribeError('429 Too Many Requests')).toBe('rate_limit')
    expect(classifyTranscribeError('Rate limit reached for whisper')).toBe('rate_limit')
    expect(classifyTranscribeError('quota exceeded')).toBe('rate_limit')
  })

  it('falls back to transient for everything else', () => {
    expect(classifyTranscribeError('fetch failed')).toBe('transient')
    expect(classifyTranscribeError('ECONNRESET')).toBe('transient')
    expect(classifyTranscribeError('')).toBe('transient')
    expect(classifyTranscribeError(null)).toBe('transient')
  })
})

describe('transcribeErrorMessage', () => {
  it('gives a distinct message per kind', () => {
    expect(transcribeErrorMessage('key')).toMatch(/key/i)
    expect(transcribeErrorMessage('rate_limit')).toMatch(/rate/i)
    expect(transcribeErrorMessage('transient')).toMatch(/transcribe/i)
  })
})
