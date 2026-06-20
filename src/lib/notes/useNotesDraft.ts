import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/store/app-store'

const SAVE_MS = 600

// Shared editor state for the global `interview_notes` cheat-sheet, reused by the
// overlay Notes panel and the main-app Notes page. Debounced autosave, a flush on
// unmount (so closing the panel never drops the last keystrokes), and live sync
// from edits made in the OTHER window (the 0.24.0 settings broadcast updates the
// store, which this picks up — unless the user is mid-edit here).
export function useNotesDraft() {
  const remote = useAppStore((s) => s.settings.interview_notes) ?? ''
  const updateSetting = useAppStore((s) => s.updateSetting)

  const [text, setText] = useState(remote)
  const textRef = useRef(text)
  const lastSaved = useRef(remote)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback(
    (v: string) => {
      lastSaved.current = v
      void updateSetting('interview_notes', v)
    },
    [updateSetting],
  )

  const onChange = useCallback(
    (v: string) => {
      setText(v)
      textRef.current = v
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        timer.current = null
        save(v)
      }, SAVE_MS)
    },
    [save],
  )

  // Pull in edits from the other window. Skip while a local edit is pending
  // (don't clobber active typing) and ignore our own echoed write.
  useEffect(() => {
    if (timer.current) return
    if (remote !== lastSaved.current) {
      lastSaved.current = remote
      textRef.current = remote
      setText(remote)
    }
  }, [remote])

  // Flush any pending save when the editor unmounts (panel closed / route left).
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current)
        timer.current = null
        if (textRef.current !== lastSaved.current) save(textRef.current)
      }
    },
    [save],
  )

  return { text, onChange }
}
