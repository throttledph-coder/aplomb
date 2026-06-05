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
  concise: 'Write a 2-3 sentence answer. ~45 seconds when spoken aloud.',
  detailed: 'Write a full answer with context and result. ~90 seconds when spoken.',
  comprehensive: 'Write a thorough answer covering all angles. ~2-3 minutes when spoken.',
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

Generate the answer the candidate should speak.
Start directly with the answer — no preamble.
Write naturally, as if speaking. Use "I" statements.
Only reference what is in the candidate's resume.
`.trim()
}
