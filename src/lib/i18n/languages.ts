// Languages offered for transcription + answers. `auto` lets Whisper detect the
// spoken language and the model match the question's language. Codes are ISO-639-1
// (what Groq Whisper's `language` param expects).

export interface Language {
  code: string
  label: string
}

export const LANGUAGES: readonly Language[] = [
  { code: 'auto', label: 'Auto-detect' },
  { code: 'en', label: 'English' },
  { code: 'tl', label: 'Filipino' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'it', label: 'Italian' },
  { code: 'nl', label: 'Dutch' },
  { code: 'hi', label: 'Hindi' },
  { code: 'id', label: 'Indonesian' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'ar', label: 'Arabic' },
]

// Human label for a code (falls back to Auto-detect for unknown/empty/'auto').
export function languageLabel(code: string | null | undefined): string {
  return LANGUAGES.find((l) => l.code === code)?.label ?? 'Auto-detect'
}

// True when a real (non-auto) language is selected.
export function isFixedLanguage(code: string | null | undefined): boolean {
  return !!code && code !== 'auto'
}
