import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioRecorder, type ChunkHandler } from '@/lib/audio/recorder'

export function useAudioRecorder() {
  const recorderRef = useRef<AudioRecorder | null>(null)
  const levelTimer = useRef<number | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [level, setLevel] = useState(0)

  const stop = useCallback(() => {
    recorderRef.current?.stop()
    recorderRef.current = null
    if (levelTimer.current !== null) {
      clearInterval(levelTimer.current)
      levelTimer.current = null
    }
    setIsRecording(false)
    setLevel(0)
  }, [])

  const start = useCallback(async (onChunk: ChunkHandler) => {
    const rec = new AudioRecorder()
    await rec.start(onChunk)
    recorderRef.current = rec
    setIsRecording(true)
    levelTimer.current = window.setInterval(() => setLevel(rec.getAudioLevel()), 150)
  }, [])

  // Clean up on unmount.
  useEffect(() => stop, [stop])

  return { isRecording, level, start, stop }
}
