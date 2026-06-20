// Responsive sizing for the overlay Notes side panel. The overlay window can be
// as narrow as 320px, so the notes width must follow the window and never crush
// the chat column below CHAT_MIN.

export const NOTES_MIN = 180
export const NOTES_MAX = 480
export const CHAT_MIN = 220
// Below this overlay width, side-by-side can't fit → notes renders as a
// full-width sheet over the chat instead of squeezing it.
export const NOTES_STACK_BELOW = CHAT_MIN + NOTES_MIN // 400

// Clamp the user's desired notes width to what the current window can show while
// keeping at least CHAT_MIN for the chat.
export function notesWidthFor(winWidth: number, desired: number): number {
  const max = Math.min(NOTES_MAX, Math.max(NOTES_MIN, winWidth - CHAT_MIN))
  return Math.round(Math.min(Math.max(desired, NOTES_MIN), max))
}
