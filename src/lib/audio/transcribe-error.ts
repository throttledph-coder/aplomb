// Classify a transcription failure so the UI can react usefully: an unusable
// API key is actionable (point to Settings), rate limits and transient network
// blips should keep the listen loop alive and offer a retry. The message comes
// across IPC from the Groq SDK, so we match on its text.

export type TranscribeErrorKind = 'key' | 'rate_limit' | 'transient'

export function classifyTranscribeError(message: string | null | undefined): TranscribeErrorKind {
  const m = (message ?? '').toLowerCase()
  if (/\b401\b|invalid api key|invalid_api_key|unauthor|missing.*key|no api key/.test(m)) return 'key'
  if (/\b429\b|rate limit|rate_limit|too many requests|quota|capacity/.test(m)) return 'rate_limit'
  return 'transient'
}

// User-facing one-liner for each kind (the strip pairs this with an action).
export function transcribeErrorMessage(kind: TranscribeErrorKind): string {
  switch (kind) {
    case 'key':
      return 'Transcription failed — add a valid Groq API key.'
    case 'rate_limit':
      return 'Groq is rate-limiting transcription. Try again in a moment.'
    default:
      return "Couldn't transcribe that clip."
  }
}
