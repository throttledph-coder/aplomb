import type {
  AIProvider,
  CompletionRequest,
  ConnectionResult,
  TokenHandler,
} from '../types'

const DEFAULT_BASE_URL = 'http://localhost:11434'
const DEFAULT_MODEL = 'llama3.2:3b'

interface OllamaOptions {
  model?: string
  baseUrl?: string
}

export class OllamaProvider implements AIProvider {
  readonly name = 'ollama'
  private baseUrl: string
  private model: string

  constructor({ model, baseUrl }: OllamaOptions = {}) {
    this.baseUrl = (baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '')
    this.model = model || DEFAULT_MODEL
  }

  private body(req: CompletionRequest, stream: boolean) {
    return JSON.stringify({
      model: req.model || this.model,
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.user },
      ],
      stream,
      options: { temperature: req.temperature ?? 0.7 },
    })
  }

  private notRunningError(err: unknown): Error {
    return new Error(
      `Ollama is not running at ${this.baseUrl}. Start it with "ollama serve". (${
        (err as Error).message
      })`,
    )
  }

  async complete(req: CompletionRequest): Promise<string> {
    let res: Response
    try {
      res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: this.body(req, false),
      })
    } catch (err) {
      throw this.notRunningError(err)
    }
    if (!res.ok) throw new Error(`Ollama error ${res.status}: ${await res.text()}`)
    const data = (await res.json()) as { message?: { content?: string } }
    return data.message?.content ?? ''
  }

  async stream(
    req: CompletionRequest,
    onToken: TokenHandler,
    signal?: AbortSignal,
  ): Promise<string> {
    let res: Response
    try {
      res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: this.body(req, true),
        signal,
      })
    } catch (err) {
      if (signal?.aborted) return ''
      throw this.notRunningError(err)
    }
    if (!res.ok || !res.body) throw new Error(`Ollama error ${res.status}`)

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let full = ''
    try {
      for (;;) {
        if (signal?.aborted) break
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          const token = (JSON.parse(trimmed) as { message?: { content?: string } }).message?.content
          if (token) {
            full += token
            onToken(token)
          }
        }
      }
    } catch (err) {
      if (signal?.aborted) return full
      throw err
    }
    return full
  }

  async testConnection(): Promise<ConnectionResult> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`)
      if (!res.ok) return { ok: false, error: `Ollama responded ${res.status}.` }
      return { ok: true }
    } catch {
      return {
        ok: false,
        error: `Ollama is not running at ${this.baseUrl}. Start it with "ollama serve".`,
      }
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`)
      if (!res.ok) return []
      const data = (await res.json()) as { models?: { name?: string }[] }
      return (data.models ?? [])
        .map((m) => m.name)
        .filter((n): n is string => typeof n === 'string')
    } catch {
      return []
    }
  }
}
