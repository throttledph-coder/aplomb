import { describe, it, expect } from 'vitest'
import { notesWidthFor, NOTES_MIN, NOTES_MAX, CHAT_MIN } from './notes-width'

describe('notesWidthFor', () => {
  it('keeps the desired width on a wide window', () => {
    expect(notesWidthFor(900, 260)).toBe(260)
  })

  it('caps at NOTES_MAX', () => {
    expect(notesWidthFor(2000, 999)).toBe(NOTES_MAX)
  })

  it('floors at NOTES_MIN', () => {
    expect(notesWidthFor(900, 50)).toBe(NOTES_MIN)
  })

  it('shrinks notes so the chat keeps CHAT_MIN', () => {
    // window 500 → max notes = 500 - 220 = 280
    expect(notesWidthFor(500, 400)).toBe(280)
  })

  it('never returns below NOTES_MIN even on a tiny window', () => {
    expect(notesWidthFor(320, 260)).toBe(NOTES_MIN)
  })

  it('leaves at least CHAT_MIN whenever the window can afford it', () => {
    const w = 600
    const notes = notesWidthFor(w, 480)
    expect(w - notes).toBeGreaterThanOrEqual(CHAT_MIN)
  })
})
