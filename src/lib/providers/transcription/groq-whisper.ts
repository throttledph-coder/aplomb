import Groq, { toFile } from 'groq-sdk'
import type { AudioTranscriber } from './types'

// large-v3-turbo: ~2-4x faster than large-v3 with near-identical accuracy — the
// balanced "fast + accurate" pick for live interview audio.
const WHISPER_MODEL = 'whisper-large-v3-turbo'

// Premium transcription via Groq Whisper. Main-process only (uses the API key).
export class GroqWhisperTranscriber implements AudioTranscriber {
  readonly name = 'groq-whisper'
  private client: Groq

  constructor(apiKey: string) {
    this.client = new Groq({ apiKey })
  }

  async transcribe(audio: Uint8Array, language?: string): Promise<string> {
    const file = await toFile(Buffer.from(audio), 'audio.webm')
    // Greedy decode for determinism. Fix the language when the user picked one
    // (avoids misdetection on short clips); omit it for 'auto' so Whisper detects.
    // The English punctuation hint only helps English/auto — skip it for other
    // languages so it doesn't bias the transcript.
    const fixed = language && language !== 'auto' ? language : undefined
    const params: Record<string, unknown> = {
      file,
      model: WHISPER_MODEL,
      temperature: 0,
    }
    if (fixed) params.language = fixed
    if (!fixed || fixed === 'en') {
      params.prompt = "Transcribe the interviewer's question verbatim, with correct punctuation."
    }
    const run = () => this.client.audio.transcriptions.create(params as never)
    try {
      return (await run()).text
    } catch (err) {
      // One short backoff on rate limits — Groq's free tier spikes during a
      // live session; a single retry absorbs most transient 429s.
      if ((err as { status?: number })?.status === 429) {
        await new Promise((r) => setTimeout(r, 1200))
        return (await run()).text
      }
      throw err
    }
  }
}
