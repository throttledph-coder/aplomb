// "Likely interview questions" prep prompt (docs/08 pre-analysis).

export function buildQuestionsPrompt(resumeContext: string, jobContext: string): string {
  return `${resumeContext}

${jobContext}

Based on this candidate's background and the target role, list the 10 interview questions they are
most likely to be asked. Mix behavioral, technical, and role-specific questions relevant to the job
description. Output ONLY the questions, one per line, no numbering or commentary.`
}

// Clean an AI response into a deduped list of questions (strip numbering/bullets, cap 10).
export function parseQuestionList(raw: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of raw.split('\n')) {
    const q = line
      .replace(/^\s*\d+[.)]\s*/, '')
      .replace(/^\s*[-*•]\s*/, '')
      .trim()
    if (q.length < 5) continue
    const key = q.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(q)
    if (out.length >= 10) break
  }
  return out
}
