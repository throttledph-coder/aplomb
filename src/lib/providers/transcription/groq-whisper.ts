import Groq, { toFile } from 'groq-sdk'
import type { AudioTranscriber } from './types'

const WHISPER_MODEL = 'whisper-large-v3'

// Premium transcription via Groq Whisper. Main-process only (uses the API key).
export class GroqWhisperTranscriber implements AudioTranscriber {
  readonly name = 'groq-whisper'
  private client: Groq

  constructor(apiKey: string) {
    this.client = new Groq({ apiKey })
  }

  async transcribe(audio: Uint8Array): Promise<string> {
    const file = await toFile(Buffer.from(audio), 'audio.webm')
    const res = await this.client.audio.transcriptions.create({
      file,
      model: WHISPER_MODEL,
      // Tuned for live interview audio: fix the language (avoids misdetection on
      // short clips), greedy decode for determinism, and a domain prompt that
      // nudges Whisper to keep question punctuation ("?") the filter relies on.
      language: 'en',
      temperature: 0,
      prompt: "Transcribe the interviewer's question verbatim, with correct punctuation.",
    })
    return res.text
  }
}
