import type { ContinuousRecognizer, TranscriptResult } from './types'

// Free-tier transcription via the browser SpeechRecognition API (renderer).
type SpeechRecognitionCtor = { new (): SpeechRecognition }

function getCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function isWebSpeechAvailable(): boolean {
  return getCtor() !== null
}

export class WebSpeechRecognizer implements ContinuousRecognizer {
  readonly name = 'web-speech'
  private recognition: SpeechRecognition | null = null

  start(onResult: (r: TranscriptResult) => void, onError?: (msg: string) => void): void {
    const Ctor = getCtor()
    if (!Ctor) {
      onError?.('Web Speech API is not available in this environment.')
      return
    }
    const rec = new Ctor()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        onResult({ text: result[0].transcript, isFinal: result.isFinal })
      }
    }
    rec.onerror = (event: SpeechRecognitionErrorEvent) => onError?.(event.error)
    // Auto-restart so "continuous" survives engine timeouts.
    rec.onend = () => {
      if (this.recognition) rec.start()
    }

    this.recognition = rec
    rec.start()
  }

  stop(): void {
    const rec = this.recognition
    this.recognition = null
    rec?.stop()
  }
}
