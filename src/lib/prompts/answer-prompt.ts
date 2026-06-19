import type { AnswerLength } from '../providers/types'

export interface PreviousQA {
  q: string
  a: string
}

export interface CandidateContext {
  preferredName?: string
  pronouns?: string
  age?: number
}

function buildCandidateContext(c?: CandidateContext): string {
  if (!c) return ''
  const parts: string[] = []
  if (c.preferredName) parts.push(`Goes by: ${c.preferredName}`)
  if (c.pronouns) parts.push(`Pronouns: ${c.pronouns}`)
  if (c.age) parts.push(`Age: ${c.age}`)
  if (parts.length === 0) return ''
  return `\nABOUT THE CANDIDATE (for tone/pronouns only — keep answers first-person):\n${parts.join(' · ')}\n`
}

const LENGTH_INSTRUCTIONS: Record<AnswerLength, string> = {
  concise: 'Keep it tight — 2-3 sentences, about 45 seconds spoken. Get to the point fast.',
  detailed:
    'A full answer of about 5-7 sentences (~90 seconds spoken): a brief situation, the action you took, ' +
    'and a clear result. Tell the whole arc — do not cut it short.',
  comprehensive: 'A thorough answer that covers the angles without rambling, about 2-3 minutes spoken.',
}

// Combine resume + JD + recent Q&A + question into the final user prompt (docs/06).
export function buildAnswerPrompt(
  question: string,
  resumeContext: string,
  jobContext: string,
  previousQA: PreviousQA[],
  answerLength: AnswerLength,
  candidate?: CandidateContext,
): string {
  const previousContext =
    previousQA.length > 0
      ? `\nPREVIOUS Q&A IN THIS SESSION (do not repeat the same stories):
${previousQA
  .slice(-3)
  .map((qa) => `Q: ${qa.q}\nA Summary: ${qa.a.slice(0, 100)}...`)
  .join('\n\n')}\n`
      : ''

  return `
${resumeContext}

${jobContext}
${buildCandidateContext(candidate)}
${previousContext}

CURRENT INTERVIEW QUESTION:
"${question}"

ANSWER LENGTH: ${LENGTH_INSTRUCTIONS[answerLength]}

Write what the candidate should actually say out loud — natural, confident, conversational, like a real
person in the room. No buzzwords, no clichés, no AI filler. Open with one bold hook line (in **double
asterisks**), then a blank line, then the spoken answer; no other bold text and no preamble. First person,
and only what's grounded in the resume.
`.trim()
}
