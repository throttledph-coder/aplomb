// Smart noise filter for auto-listen (docs/06-prompting-system.md).
// Pure + deterministic — decides whether a transcript chunk is a real interview
// question worth answering, vs filler / nods / statements.

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

const QUESTION_INDICATORS = [
  /\?$/,
  /^(what|where|when|who|why|how|which|can|could|would|should|do|did|have|has|is|are|was|were)\s/i,
  /^(tell me|describe|explain|walk me through|give me|share|talk about)/i,
]

export function detectQuestion(text: string): FilterResult {
  const trimmed = text.trim()

  if (trimmed.split(/\s+/).filter(Boolean).length < 5) {
    return { isQuestion: false, reason: 'too_short', cleanedText: trimmed }
  }

  for (const pattern of FILLER_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { isQuestion: false, reason: 'filler_word', cleanedText: trimmed }
    }
  }

  for (const pattern of QUESTION_INDICATORS) {
    if (pattern.test(trimmed)) {
      return { isQuestion: true, reason: 'question_pattern', cleanedText: trimmed }
    }
  }

  return { isQuestion: false, reason: 'no_question_pattern', cleanedText: trimmed }
}
