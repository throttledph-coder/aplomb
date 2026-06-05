import Groq from 'groq-sdk'
import type {
  AIProvider,
  CompletionRequest,
  ConnectionResult,
  TokenHandler,
} from '../types'

const DEFAULT_MODEL = 'llama-3.3-70b-versatile'
const MAX_RETRIES = 3

interface GroqOptions {
  apiKey: string
  model?: string
}

function isRateLimit(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { status?: number }).status === 429
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export class GroqProvider implements AIProvider {
  readonly name = 'groq'
  private client: Groq
  private model: string

  constructor({ apiKey, model }: GroqOptions) {
    this.client = new Groq({ apiKey })
    this.model = model || DEFAULT_MODEL
  }

  private messages(req: CompletionRequest) {
    return [
      { role: 'system' as const, content: req.system },
      { role: 'user' as const, content: req.user },
    ]
  }

  // Retry with exponential backoff on 429 rate-limit responses.
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let attempt = 0
    for (;;) {
      try {
        return await fn()
      } catch (err) {
        if (isRateLimit(err) && attempt < MAX_RETRIES) {
          await sleep(2 ** attempt * 1000)
          attempt++
          continue
        }
        throw err
      }
    }
  }

  async complete(req: CompletionRequest): Promise<string> {
    return this.withRetry(async () => {
      const res = await this.client.chat.completions.create({
        model: req.model || this.model,
        messages: this.messages(req),
        temperature: req.temperature ?? 0.7,
        max_tokens: req.maxTokens,
        stream: false,
      })
      return res.choices[0]?.message?.content ?? ''
    })
  }

  async stream(
    req: CompletionRequest,
    onToken: TokenHandler,
    signal?: AbortSignal,
  ): Promise<string> {
    let full = ''
    try {
      return await this.withRetry(async () => {
        const streamed = await this.client.chat.completions.create(
          {
            model: req.model || this.model,
            messages: this.messages(req),
            temperature: req.temperature ?? 0.7,
            max_tokens: req.maxTokens,
            stream: true,
          },
          { signal },
        )
        for await (const chunk of streamed) {
          if (signal?.aborted) break
          const token = chunk.choices[0]?.delta?.content ?? ''
          if (token) {
            full += token
            onToken(token)
          }
        }
        return full
      })
    } catch (err) {
      // A user-initiated abort resolves with whatever streamed so far.
      if (signal?.aborted || (err as Error)?.name === 'APIUserAbortError') return full
      throw err
    }
  }

  async testConnection(): Promise<ConnectionResult> {
    try {
      await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
        stream: false,
      })
      return { ok: true }
    } catch (err) {
      const status = (err as { status?: number }).status
      if (status === 401) return { ok: false, error: 'Invalid Groq API key.' }
      if (status === 429) return { ok: false, error: 'Groq rate limit reached. Try again shortly.' }
      return { ok: false, error: (err as Error).message || 'Groq request failed.' }
    }
  }
}
