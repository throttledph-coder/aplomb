// Prompts for the Application Assistant: resume↔JD fit analysis + cover letter.

export const FIT_SYSTEM_PROMPT =
  'You are a sharp technical recruiter and career coach. Be concrete and honest.'

export function buildGapPrompt(resumeContext: string, jobDescription: string): string {
  return `${resumeContext}

TARGET JOB DESCRIPTION:
${jobDescription}

Analyze how well this candidate fits the role. Output Markdown with these exact sections:

## Fit Score
A single line: X/10 with one sentence why.

## Strong Matches
Bullet list of the candidate's experience/skills that directly match the JD requirements.

## Gaps & Missing Keywords
Bullet list of JD requirements/keywords the resume does NOT clearly cover. Be specific.

## Talking Points
3-5 things the candidate should emphasize in interviews to bridge the gaps.

## Suggested Resume Bullets
2-4 rewritten or new resume bullets (quantified, using the JD's keywords) the candidate could
truthfully add based on their existing experience.`
}

export const COVER_LETTER_SYSTEM_PROMPT =
  'You write concise, genuine cover letters in the candidate\'s voice — no clichés, no "I am writing to apply".'

export function buildCoverLetterPrompt(
  resumeContext: string,
  company: string,
  jobTitle: string,
  jobDescription: string,
): string {
  return `${resumeContext}

ROLE: ${jobTitle} at ${company}
JOB DESCRIPTION:
${jobDescription}

Write a cover letter for this role. Rules:
- 3 short paragraphs, under 250 words total.
- Open with a specific hook about the company/role, not a template.
- Use 1-2 concrete achievements from the resume that match the JD.
- First person, warm but professional. No "Dear Hiring Manager" clichés are required —
  start naturally.
- Only reference real experience from the resume. End with a brief, confident close.
Output only the letter text.`
}
