// Transcription provider abstraction (roadmap 6.2).

export interface TranscriptResult {
  text: string
  isFinal: boolean
}

// Continuous (streaming) recognizer — Web Speech API (free, renderer).
export interface ContinuousRecognizer {
  readonly name: string
  start(onResult: (r: TranscriptResult) => void, onError?: (msg: string) => void): void
  stop(): void
}

// One-shot transcription of an audio blob — Groq Whisper (premium, main process).
// `language` is an ISO-639-1 code; omit/undefined → Whisper auto-detects.
export interface AudioTranscriber {
  readonly name: string
  transcribe(audio: Uint8Array, language?: string): Promise<string>
}
