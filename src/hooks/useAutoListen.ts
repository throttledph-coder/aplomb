import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AudioRecorder } from '@/lib/audio/recorder'
import { detectQuestion } from '@/lib/audio/question-filter'
import {
  classifyTranscribeError,
  transcribeErrorMessage,
  type TranscribeErrorKind,
} from '@/lib/audio/transcribe-error'

const MAX_PENDING = 6
const FLUSH_MS = 3500 // quiet window after the last detected question before auto-answering
const RETRY_MS = 700 // re-check interval while a previous answer is still streaming

export interface PendingQuestion {
  id: string
  text: string
}

// Join all currently-pending detected questions into one prompt (trim + drop blanks).
export function combineQuestionTexts(items: { text: string }[]): string {
  return items
    .map((i) => i.text.trim())
    .filter(Boolean)
    .join(' ')
}

export interface UseAutoListenOptions {
  onQuestion: (text: string) => void
  // When true, detected questions auto-combine after a quiet window and answer
  // hands-free (no Use/Combine clicks). Experimental.
  autoAnswer?: boolean
  // True while an answer is currently streaming — auto-flush waits for it.
  isBusy?: boolean
}

// Auto-listen via system audio → Groq Whisper (Web Speech isn't available in
// Electron). Detected questions accumulate as a manual pending queue — the user
// decides to use/edit/ignore/combine each one (no auto-confirm).
export function useAutoListen({ onQuestion, autoAnswer = false, isBusy = false }: UseAutoListenOptions) {
  const recorderRef = useRef<AudioRecorder | null>(null)
  const levelTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const heardRef = useRef(false)
  const startedAtRef = useRef(0)

  // Transcription resilience: in-flight count drives the "Transcribing…" state;
  // the last failed clip is retained for Retry; a key error pauses attempts
  // (no point hammering Whisper) and shows its actionable toast only once.
  const inFlightRef = useRef(0)
  const lastFailedClipRef = useRef<Blob | null>(null)
  const keyErrorRef = useRef(false)
  const keyToastShownRef = useRef(false)
  const retryTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())

  // Latest-value refs so the auto-flush timer never runs on stale closures.
  const onQuestionRef = useRef(onQuestion)
  const autoAnswerRef = useRef(autoAnswer)
  const isBusyRef = useRef(isBusy)
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    onQuestionRef.current = onQuestion
    autoAnswerRef.current = autoAnswer
    isBusyRef.current = isBusy
  }, [onQuestion, autoAnswer, isBusy])

  const [isListening, setIsListening] = useState(false)
  const [pending, setPending] = useState<PendingQuestion[]>([])
  const [lastTranscript, setLastTranscript] = useState('')
  const [transcribing, setTranscribing] = useState(false)
  const [lastError, setLastError] = useState<{ kind: TranscribeErrorKind; message: string } | null>(
    null,
  )
  const [level, setLevel] = useState(0)
  const [bars, setBars] = useState<number[]>([0, 0, 0, 0, 0])
  // True when the captured stream has stayed silent for a while — usually means
  // the user shared a screen/window WITHOUT ticking "share audio".
  const [silent, setSilent] = useState(false)

  // ---- auto-answer flush (debounced, busy-aware) ----
  const clearFlush = useCallback(() => {
    if (flushTimer.current) {
      clearTimeout(flushTimer.current)
      flushTimer.current = null
    }
  }, [])

  const attemptFlush = useCallback(() => {
    flushTimer.current = null
    if (!autoAnswerRef.current) return
    // A previous answer is still streaming — try again shortly.
    if (isBusyRef.current) {
      flushTimer.current = setTimeout(attemptFlush, RETRY_MS)
      return
    }
    setPending((prev) => {
      if (prev.length === 0) return prev
      const combined = combineQuestionTexts(prev)
      if (combined) onQuestionRef.current(combined)
      return []
    })
  }, [])

  const armFlush = useCallback(
    (ms: number) => {
      if (flushTimer.current) clearTimeout(flushTimer.current)
      flushTimer.current = setTimeout(attemptFlush, ms)
    },
    [attemptFlush],
  )

  const addPending = useCallback(
    (text: string) => {
      setPending((prev) => {
        const last = prev[prev.length - 1]
        if (last && last.text.trim().toLowerCase() === text.trim().toLowerCase()) return prev
        const next = [...prev, { id: crypto.randomUUID(), text }]
        return next.length > MAX_PENDING ? next.slice(next.length - MAX_PENDING) : next
      })
      // Re-arm the quiet window on every new detected question so a multi-part
      // question waits for a pause, then answers once.
      if (autoAnswerRef.current) armFlush(FLUSH_MS)
    },
    [armFlush],
  )

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

  // Transcribe one VAD clip. Failures never stop the loop: a transient/rate
  // error auto-retries the same clip once, then surfaces a Retry chip; a key
  // error pauses attempts and points the user to Settings.
  const transcribeClip = useCallback(
    async (clip: Blob, isRetry = false) => {
      if (!window.ai) return
      if (keyErrorRef.current && !isRetry) return // don't hammer Whisper with a bad key
      inFlightRef.current += 1
      setTranscribing(true)
      try {
        const bytes = new Uint8Array(await clip.arrayBuffer())
        const text = (await window.ai.transcribe(bytes)).trim()
        // Success — clear any error state and process the transcript.
        lastFailedClipRef.current = null
        keyErrorRef.current = false
        setLastError(null)
        if (text) {
          setLastTranscript(text)
          const { isQuestion, cleanedText } = detectQuestion(text)
          if (isQuestion) addPending(cleanedText)
        }
      } catch (err) {
        const message = (err as Error)?.message ?? String(err)
        const kind = classifyTranscribeError(message)
        if (kind === 'key') {
          lastFailedClipRef.current = clip
          keyErrorRef.current = true
          setLastError({ kind, message: transcribeErrorMessage(kind) })
          if (!keyToastShownRef.current) {
            keyToastShownRef.current = true
            toast.error('Auto-listen: add a valid Groq API key in Settings → AI Provider.')
          }
        } else if (!isRetry) {
          // One automatic retry for transient/rate-limit blips — keep listening.
          const delay = kind === 'rate_limit' ? 1500 : 700
          const t = setTimeout(() => {
            retryTimers.current.delete(t)
            void transcribeClip(clip, true)
          }, delay)
          retryTimers.current.add(t)
        } else {
          // The retry also failed — offer a manual Retry, keep the clip.
          lastFailedClipRef.current = clip
          setLastError({ kind, message: transcribeErrorMessage(kind) })
        }
      } finally {
        inFlightRef.current = Math.max(0, inFlightRef.current - 1)
        setTranscribing(inFlightRef.current > 0)
      }
    },
    [addPending],
  )

  // Manual retry of the last failed clip (from the status strip).
  const retry = useCallback(() => {
    const clip = lastFailedClipRef.current
    keyErrorRef.current = false
    keyToastShownRef.current = false
    setLastError(null)
    if (clip) void transcribeClip(clip, true)
  }, [transcribeClip])

  // Use the latest raw transcript even if the question-filter dropped it
  // (view-raw / submit-anyway).
  const submitLastTranscript = useCallback(() => {
    const t = lastTranscript.trim()
    if (t) onQuestionRef.current(t)
    setLastTranscript('')
  }, [lastTranscript])

  // Dismiss whatever the status strip is showing (an error or the last-heard
  // snippet) and clear the retained failed clip / key-error gate.
  const dismissError = useCallback(() => {
    setLastError(null)
    setLastTranscript('')
    lastFailedClipRef.current = null
    keyErrorRef.current = false
    keyToastShownRef.current = false
  }, [])

  const stopListening = useCallback(() => {
    recorderRef.current?.stop()
    recorderRef.current = null
    if (levelTimer.current !== null) {
      clearInterval(levelTimer.current)
      levelTimer.current = null
    }
    for (const t of retryTimers.current) clearTimeout(t)
    retryTimers.current.clear()
    clearFlush()
    inFlightRef.current = 0
    keyErrorRef.current = false
    keyToastShownRef.current = false
    lastFailedClipRef.current = null
    setIsListening(false)
    setPending([])
    setLastTranscript('')
    setTranscribing(false)
    setLastError(null)
    setLevel(0)
    setBars([0, 0, 0, 0, 0])
    setSilent(false)
  }, [clearFlush])

  // Track pending count without re-triggering the busy effect on every detection.
  const pendingCountRef = useRef(0)
  useEffect(() => {
    pendingCountRef.current = pending.length
  }, [pending])

  // React to auto-answer toggling + generation finishing: if auto-answer is on,
  // not busy, and questions are waiting, schedule a near-term flush. Turning
  // auto-answer off cancels any pending flush.
  useEffect(() => {
    if (!autoAnswer) {
      clearFlush()
      return
    }
    if (!isBusy && pendingCountRef.current > 0) armFlush(RETRY_MS)
  }, [autoAnswer, isBusy, armFlush, clearFlush])

  const startListening = useCallback(async () => {
    if (!window.ai) {
      toast.error('Auto-listen only works in the desktop app.')
      return
    }
    heardRef.current = false
    startedAtRef.current = Date.now()
    keyErrorRef.current = false
    keyToastShownRef.current = false
    setSilent(false)
    setLastError(null)
    setLastTranscript('')
    const rec = new AudioRecorder()
    try {
      // system=true → capture loopback/system audio (the interviewer), not the mic.
      // VAD segments each complete utterance so questions aren't split mid-sentence.
      // Each clip is transcribed independently; a failure never stops the loop.
      await rec.startVadClips((clip) => {
        void transcribeClip(clip)
      }, true)
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
  }, [transcribeClip])

  // Cleanup on unmount.
  useEffect(() => () => stopListening(), [stopListening])

  return {
    isListening,
    pending,
    lastTranscript,
    transcribing,
    lastError,
    level,
    bars,
    silent,
    startListening,
    stopListening,
    usePending,
    editPending,
    ignorePending,
    combinePending,
    retry,
    submitLastTranscript,
    dismissError,
  }
}
