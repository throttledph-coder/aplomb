import type { InterviewSession, QAPair } from '../../types'

export interface ReportPromptInput {
  resumeContext: string
  session: InterviewSession
  qaPairs: QAPair[]
  durationMin: number
}

// End-of-session coaching report prompt (docs/06-prompting-system.md).
export function buildReportPrompt({
  resumeContext,
  session,
  qaPairs,
  durationMin,
}: ReportPromptInput): string {
  const qaLog = qaPairs
    .map((qa, i) => `${i + 1}. Q: ${qa.question}\n   A: ${qa.answer}`)
    .join('\n\n')

  return `${resumeContext}

TARGET ROLE: ${session.job_title} at ${session.company}
JOB DESCRIPTION: ${session.job_description}

INTERVIEW TYPE: ${session.interview_type}
SESSION DURATION: ${durationMin} minutes

COMPLETE Q&A LOG:
${qaLog}

Generate a coaching report with these exact sections:

## Overall Assessment
2-3 sentences on how the session went overall.

## What Went Well
Bullet list of 3-5 specific strengths shown in the answers.
Be specific — reference actual answers given.

## Areas to Improve
Bullet list of 2-4 specific weaknesses.
Be specific and actionable.

## Topics to Study Before Next Round
List technical topics or concepts that came up where the candidate showed uncertainty.
Only list topics that appeared in the session.

## JD Keyword Analysis
List keywords/technologies from the job description that:
- ✅ Were mentioned naturally in answers
- ⚠️ Were missed but should have been mentioned

## Recommended Practice Questions
3 questions the candidate should practice before the next interview round.
Base these on gaps you observed.

## One-Line Summary
A single sentence the candidate can remember: what is their biggest takeaway from this session.`
}
