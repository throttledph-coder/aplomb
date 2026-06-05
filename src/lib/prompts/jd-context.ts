import type { InterviewSession } from '../../types'

// Format job/session data into prompt context (docs/06-prompting-system.md).
// Adapts the snake_case InterviewSession fields.
export function buildJobContext(session: InterviewSession): string {
  const extra = session.additional_info?.trim()
  return `
TARGET ROLE:
============
Position: ${session.job_title}
Company: ${session.company}
Interview Type: ${session.interview_type}

Job Description:
${session.job_description}
${
    extra
      ? `\nADDITIONAL CANDIDATE CONTEXT (use to make answers personal + natural):\n${extra}`
      : ''
  }`.trim()
}
