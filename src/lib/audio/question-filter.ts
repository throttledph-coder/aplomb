// Smart noise filter for auto-listen (docs/06-prompting-system.md).
// Pure + deterministic — decides whether a transcript chunk is a real interview
// question worth answering, vs filler / nods / statements / Whisper artifacts.
//
// Recall-biased: in a live interview, missing a question is worse than an
// occasional extra (the user can Ignore, and auto-answer's quiet-window combine
// smooths bursts). So we catch questions with preambles ("So, why…"), short
// elicitations ("Tell me about yourself"), and ones Whisper renders without "?".

export interface FilterResult {
  isQuestion: boolean
  reason: string
  cleanedText: string
}

const FILLER_PATTERNS = [
  /^(uh+|um+|hmm+|ah+|er+)\s*$/i,
  /^(yeah|yep|yes|no|okay|ok|sure|right|alright|gotcha)\s*[.!]?\s*$/i,
  /^(so|well|and|but|i mean|you know|like)\s*$/i,
  /^(mm+|mhm|uh huh)\s*$/i,
]

// Whisper hallucinates these on silence / music / non-speech. Drop if the whole
// cleaned chunk is (or starts with) one of them.
const HALLUCINATIONS = [
  'thank you',
  'thank you.',
  'thanks for watching',
  'thank you for watching',
  'please subscribe',
  'see you next time',
  "i'll see you next time",
  'you',
  'bye',
  '.',
  '♪',
  '[music]',
  '[applause]',
  'subtitles by',
  'amara.org',
]

// Leading fillers / conjunctions that precede the real question.
const PREAMBLE = new Set([
  'so', 'okay', 'ok', 'alright', 'allright', 'well', 'now', 'and', 'but', 'um',
  'uh', 'yeah', 'yep', 'right', 'great', 'cool', 'perfect', 'awesome', 'hmm',
  'like', 'then', 'also', 'just',
])

// First-token signals (after preamble strip).
const WH_WORDS = new Set([
  'what', "what's", 'whats', 'where', "where's", 'when', "when's", 'who',
  "who's", 'whom', 'whose', 'why', 'how', "how's", 'which',
])
const AUX_WORDS = new Set([
  'do', 'does', 'did', 'can', 'could', 'would', 'should', 'will', 'shall',
  'is', 'are', 'was', 'were', 'have', 'has', 'had', 'may', 'might', 'am',
])

// Elicitation phrases — a question/prompt even without a WH-word or "?".
// Matched anywhere in the (preamble-stripped) text.
const ELICITATION = [
  'tell me',
  'describe',
  'explain',
  'walk me through',
  'walk us through',
  'give me',
  'give us',
  'share with',
  'talk about',
  'talk to me about',
  "let's talk",
  "i'd like to hear",
  "i'd like to know",
  'love to hear',
  'curious',
  'wondering',
  'any questions',
  'example of',
  'experience with',
  'your thoughts on',
  'how come',
  'what about',
]

function words(s: string): string[] {
  return s.split(/\s+/).filter(Boolean)
}

// Drop leading preamble tokens + stray punctuation so the WH/aux test sees the
// real first word and the answer prompt is clean.
function stripPreamble(tokens: string[]): string[] {
  let i = 0
  while (i < tokens.length) {
    const bare = tokens[i].replace(/^[,.!;:]+|[,.!;:]+$/g, '').toLowerCase()
    if (bare === '' || PREAMBLE.has(bare)) i++
    else break
  }
  return tokens.slice(i)
}

function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s
}

export function detectQuestion(text: string): FilterResult {
  const trimmed = text.trim()
  const lower = trimmed.toLowerCase().replace(/\s+/g, ' ')
  const wordCount = words(trimmed).length

  // Whisper silence/non-speech artifacts.
  const lowerNoPunctTail = lower.replace(/[.!?]+$/, '').trim()
  if (
    HALLUCINATIONS.includes(lower) ||
    HALLUCINATIONS.includes(lowerNoPunctTail) ||
    lower.startsWith('subtitles by') ||
    lower.includes('amara.org')
  ) {
    return { isQuestion: false, reason: 'hallucination', cleanedText: trimmed }
  }

  const core = stripPreamble(words(trimmed))
  const coreText = core.join(' ')
  const firstBare = (core[0] ?? '').replace(/^[,.!;:]+|[,.!;:]+$/g, '').toLowerCase()

  const cleanQuestion = () => {
    let out = capitalize(coreText || trimmed)
    if (!/[?.!]$/.test(out)) out += '?'
    // Normalize a trailing period to a question mark when we judged it a question.
    out = out.replace(/\.$/, '?')
    return out
  }

  // Strong signal: explicit question mark (covers short ones like "Why Aplomb?").
  if (/\?\s*$/.test(trimmed) && wordCount >= 2) {
    return { isQuestion: true, reason: 'question_pattern', cleanedText: cleanQuestion() }
  }

  // Too short to be a real, answerable question (and keeps 'right'/'yeah okay' out).
  if (wordCount < 3) {
    return { isQuestion: false, reason: 'too_short', cleanedText: trimmed }
  }

  for (const pattern of FILLER_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { isQuestion: false, reason: 'filler_word', cleanedText: trimmed }
    }
  }

  // WH or aux/modal as the first real word (after preamble strip).
  if (WH_WORDS.has(firstBare) || AUX_WORDS.has(firstBare)) {
    return { isQuestion: true, reason: 'question_pattern', cleanedText: cleanQuestion() }
  }

  // Elicitation phrase anywhere in the core text.
  const coreLower = coreText.toLowerCase()
  if (ELICITATION.some((p) => coreLower.includes(p))) {
    return { isQuestion: true, reason: 'question_pattern', cleanedText: cleanQuestion() }
  }

  return { isQuestion: false, reason: 'no_question_pattern', cleanedText: trimmed }
}
