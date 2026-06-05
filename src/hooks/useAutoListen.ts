import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AudioRecorder } from '@/lib/audio/recorder'
import { detectQuestion } from '@/lib/audio/question-filter'

const CLIP_MS = 5000
const MAX_PENDING = 6

export interface PendingQuestion {
  id: string
  text: string
}

export interface UseAutoListenOptions {
  onQuestion: (text: string) => void
}

// Auto-listen via system audio → Groq Whisper (Web Speech isn't available in
// Electron). Detected questions accumulate as a manual pending queue — the user
// decides to use/edit/ignore/combine each one (no auto-confirm).
export function useAutoListen({ onQuestion }: UseAutoListenOptions) {
  const recorderRef = useRef<AudioRecorder | null>(null)
  const levelTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const erroredRef = useRef(false)
  const heardRef = useRef(false)
  const startedAtRef = useRef(0)

  const [isListening, setIsListening] = useState(false)
  const [pending, setPending] = useState<PendingQuestion[]>([])
  const [interim, setInterim] = useState('')
  const [level, setLevel] = useState(0)
  const [bars, setBars] = useState<number[]>([0, 0, 0, 0, 0])
  // True when the captured stream has stayed silent for a while — usually means
  // the user shared a screen/window WITHOUT ticking "share audio".
  const [silent, setSilent] = useState(false)

  const addPending = useCallback((text: string) => {
    setPending((prev) => {
      const last = prev[prev.length - 1]
      if (last && last.text.trim().toLowerCase() === text.trim().toLowerCase()) return prev
      const next = [...prev, { id: crypto.randomUUID(), text }]
      return next.length > MAX_PENDING ? next.slice(next.length - MAX_PENDING) : next
    })
  }, [])

  const usePending = useCallback(
    (id: string) => {
      setPending((prev) => {
        const item = prev.find((p) => p.id === id)
        if (item) onQuestion(item.text)
        return prev.filter((p) => p.id !== id)
      })
    },
    [onQuestion],
  )

  // Remove the item and hand its text back so the caller can load it into the composer.
  const editPending = useCallback((id: string): string | null => {
    const item = pending.find((p) => p.id === id)
    if (!item) return null
    setPending((prev) => prev.filter((p) => p.id !== id))
    return item.text
  }, [pending])

  const ignorePending = useCallback((id: string) => {
    setPending((prev) => prev.filter((p) => p.id !== id))
  }, [])

  // Merge this item into the one directly above it (the two questions join).
  const combinePending = useCallback((id: string) => {
    setPending((prev) => {
      const idx = prev.findIndex((p) => p.id === id)
      if (idx <= 0) return prev
      const merged = `${prev[idx - 1].text} ${prev[idx].text}`.trim()
      const next = [...prev]
      next[idx - 1] = { ...next[idx - 1], text: merged }
      next.splice(idx, 1)
      return next
    })
  }, [])

  const stopListening = useCallback(() => {
    recorderRef.current?.stop()
    recorderRef.current = null
    if (levelTimer.current !== null) {
      clearInterval(levelTimer.current)
      levelTimer.current = null
    }
    setIsListening(false)
    setPending([])
    setInterim('')
    setLevel(0)
    setBars([0, 0, 0, 0, 0])
    setSilent(false)
  }, [])

  const startListening = useCallback(async () => {
    if (!window.ai) {
      toast.error('Auto-listen only works in the desktop app.')
      return
    }
    erroredRef.current = false
    heardRef.current = false
    startedAtRef.current = Date.now()
    setSilent(false)
    const rec = new AudioRecorder()
    try {
      // system=true → capture loopback/system audio (the interviewer), not the mic.
      await rec.startClips(
        CLIP_MS,
        (clip) => {
          void (async () => {
            if (erroredRef.current) return
            try {
              const bytes = new Uint8Array(await clip.arrayBuffer())
              const text = (await window.ai.transcribe(bytes)).trim()
              if (!text) return
              setInterim(text)
              const { isQuestion, cleanedText } = detectQuestion(text)
              if (isQuestion) addPending(cleanedText)
            } catch (err) {
              if (!erroredRef.current) {
                erroredRef.current = true
                toast.error('Auto-listen needs a Groq API key (Settings → AI Provider).')
                stopListening()
              }
              void err
            }
          })()
        },
        true,
      )
    } catch (err) {
      toast.error(`Could not capture system audio: ${(err as Error).message}`)
      return
    }
    recorderRef.current = rec
    setIsListening(true)
    levelTimer.current = setInterval(() => {
      const lvl = rec.getAudioLevel()
      setLevel(lvl)
      setBars(rec.getBars(5))
      if (lvl > 0.02) {
        heardRef.current = true
        setSilent(false)
      } else if (!heardRef.current && Date.now() - startedAtRef.current > 6000) {
        setSilent(true)
      }
    }, 120)
  }, [addPending, stopListening])

  // Cleanup on unmount.
  useEffect(() => () => stopListening(), [stopListening])

  return {
    isListening,
    pending,
    interim,
    level,
    bars,
    silent,
    startListening,
    stopListening,
    usePending,
    editPending,
    ignorePending,
    combinePending,
  }
}
