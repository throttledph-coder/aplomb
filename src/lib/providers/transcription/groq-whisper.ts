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
    })
    return res.text
  }
}
