// Pure, deterministic answer-quality scorer (renderer-safe, no model, no electron).
// A cheap regression net + nudge — encodes the rubric the prompts aim for.
import type { AnswerLength } from '../providers/types'
import { extractKeywords } from '../keywords'

export type AnswerFlag =
  | 'empty'
  | 'too_short'
  | 'too_long'
  | 'ai_disclaimer'
  | 'no_first_person'
  | 'preamble'
  | 'possibly_off_topic'

export interface ScoreInput {
  question: string
  length: AnswerLength
  jd?: string
}

export interface AnswerScore {
  score: number
  flags: AnswerFlag[]
  words: number
}

// Word-count bands per target length (spoken ~130 wpm).
const BANDS: Record<AnswerLength, [number, number]> = {
  concise: [25, 120],
  detailed: [90, 320],
  comprehensive: [260, 750],
}

const PENALTY: Record<AnswerFlag, number> = {
  empty: 1,
  ai_disclaimer: 0.5,
  possibly_off_topic: 0.3,
  too_short: 0.25,
  too_long: 0.2,
  no_first_person: 0.15,
  preamble: 0.1,
}

const AI_DISCLAIMER_RE = /\b(as an ai|language model|i'?m (just )?an ai|i am an ai|i cannot)\b/i
const FIRST_PERSON_RE = /\b(i|i'?m|i'?ve|i'?d|i'?ll|my|me)\b/i
const PREAMBLE_RE = /^\s*(sure|certainly|of course|absolutely|here'?s|great question)\b/i

const QUESTION_STOPWORDS = new Set([
  'what', 'when', 'where', 'which', 'while', 'would', 'could', 'should', 'about',
  'tell', 'give', 'your', 'have', 'with', 'this', 'that', 'they', 'them', 'from',
  'into', 'walk', 'through', 'describe', 'explain', 'share', 'talk',
])

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

// Significant question terms (4+ chars, not generic question words).
function questionTerms(question: string): string[] {
  const seen = new Set<string>()
  for (const tok of question.toLowerCase().match(/[a-z][a-z0-9+#.-]{3,}/g) ?? []) {
    if (QUESTION_STOPWORDS.has(tok)) continue
    seen.add(tok)
  }
  return [...seen]
}

export function scoreAnswer(answer: string, input: ScoreInput): AnswerScore {
  const text = answer.trim()
  const words = countWords(text)
  const flags: AnswerFlag[] = []

  if (words === 0) {
    return { score: 0, flags: ['empty'], words: 0 }
  }

  const [min, max] = BANDS[input.length] ?? BANDS.detailed
  if (words < min) flags.push('too_short')
  else if (words > max) flags.push('too_long')

  if (AI_DISCLAIMER_RE.test(text)) flags.push('ai_disclaimer')
  if (!FIRST_PERSON_RE.test(text)) flags.push('no_first_person')
  if (PREAMBLE_RE.test(text)) flags.push('preamble')

  // On-topic: at least one significant question term (or a JD keyword) appears.
  const terms = questionTerms(input.question)
  if (terms.length >= 2) {
    const haystack = text.toLowerCase()
    const jdTerms = input.jd ? extractKeywords(input.jd, 15).map((k) => k.toLowerCase()) : []
    const hit =
      terms.some((t) => haystack.includes(t)) || jdTerms.some((t) => haystack.includes(t))
    if (!hit) flags.push('possibly_off_topic')
  }

  let score = 1
  for (const f of flags) score -= PENALTY[f]
  return { score: Math.max(0, Math.min(1, Number(score.toFixed(2)))), flags, words }
}

// Friendly, speakable tips for the UI.
export const FLAG_TIPS: Record<AnswerFlag, string> = {
  empty: 'No answer generated.',
  too_short: 'Quite short — add a specific example.',
  too_long: 'Long for spoken delivery — consider trimming.',
  ai_disclaimer: 'Contains an AI-style disclaimer — regenerate.',
  no_first_person: 'Few “I” statements — make it personal.',
  preamble: 'Starts with filler — cut the preamble.',
  possibly_off_topic: 'May not directly address the question.',
}
