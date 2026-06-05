// AI provider abstraction (roadmap 3.1). Implementations run in the main process.

export type AnswerLength = 'concise' | 'detailed' | 'comprehensive'

export interface CompletionRequest {
  system: string
  user: string
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface ConnectionResult {
  ok: boolean
  error?: string
}

export type TokenHandler = (token: string) => void

export interface AIProvider {
  readonly name: string
  /** Non-streaming completion → full answer text. */
  complete(req: CompletionRequest): Promise<string>
  /**
   * Streaming completion → calls onToken per delta, resolves with the full text.
   * If `signal` aborts mid-stream, resolves with the partial text (no throw).
   */
  stream(req: CompletionRequest, onToken: TokenHandler, signal?: AbortSignal): Promise<string>
  /** Lightweight reachability / auth check. */
  testConnection(): Promise<ConnectionResult>
}
