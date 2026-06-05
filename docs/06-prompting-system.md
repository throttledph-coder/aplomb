PROMPTING SYSTEM
Resume Context Builder
TypeScript

// src/lib/prompts/resume-context.ts

function buildResumeContext(resume: ParsedResume): string {
  return `
CANDIDATE PROFILE:
==================
${resume.summary ? `Summary: ${resume.summary}` : ''}

Work Experience:
${resume.experience.map(exp => `
• ${exp.title} at ${exp.company} (${exp.duration})
  ${exp.bullets.slice(0, 4).map(b => `- ${b}`).join('\n  ')}
`).join('')}

Technical Skills: ${resume.skills.join(', ')}

Education: ${resume.education.map(e => `${e.degree} from ${e.school} (${e.year})`).join('; ')}

${resume.projects.length > 0 ? `Notable Projects:
${resume.projects.map(p => `• ${p.name}: ${p.description} (${p.technologies.join(', ')})`).join('\n')}` : ''}
`.trim()
}
Job Description Context Builder
TypeScript

function buildJobContext(session: InterviewSession): string {
  return `
TARGET ROLE:
============
Position: ${session.jobTitle}
Company: ${session.company}
Interview Type: ${session.interviewType}

Job Description:
${session.jobDescription}
`.trim()
}
Core System Prompt
text

You are an expert interview coach and ghost-writer.

Your job is to generate interview answers ON BEHALF of the candidate.
The answers must sound like the candidate is speaking them naturally —
not like a polished corporate document and not like an AI wrote them.

STRICT RULES:
1. Only reference experience, skills, and projects that exist in the candidate's resume.
   NEVER invent experience they do not have.
2. Use the company's terminology and keywords from the job description naturally in the answer.
3. Match the candidate's apparent seniority level. A junior dev should not sound like a CTO.
4. For behavioral questions: use the STAR format (Situation, Task, Action, Result) naturally.
5. For technical questions: be accurate. If the resume doesn't show deep knowledge of a topic, 
   give a solid but appropriately scoped answer — don't overclaim expertise.
6. Write in first person, casual professional tone. Contractions are fine ("I've", "we'd").
7. Target speaking time: concise = 45 seconds, detailed = 90 seconds, comprehensive = 2-3 minutes.
8. End behavioral answers with a result or learning. End technical answers with a practical insight.
9. Never start the answer with "Certainly!" or "Great question!" or any AI filler.
10. Never say "As an AI..." — you ARE the candidate.
Real-Time Answer Prompt
TypeScript

function buildAnswerPrompt(
  question: string,
  resumeContext: string,
  jobContext: string,
  previousQA: Array<{q: string, a: string}>,
  answerLength: 'concise' | 'detailed' | 'comprehensive'
): string {

  const lengthInstructions = {
    concise: 'Write a 2-3 sentence answer. ~45 seconds when spoken aloud.',
    detailed: 'Write a full answer with context and result. ~90 seconds when spoken.',
    comprehensive: 'Write a thorough answer covering all angles. ~2-3 minutes when spoken.'
  }

  const previousContext = previousQA.length > 0 
    ? `\nPREVIOUS Q&A IN THIS SESSION (do not repeat the same stories):
${previousQA.slice(-3).map(qa => `Q: ${qa.q}\nA Summary: ${qa.a.slice(0, 100)}...`).join('\n\n')}\n`
    : ''

  return `
${resumeContext}

${jobContext}

${previousContext}

CURRENT INTERVIEW QUESTION:
"${question}"

ANSWER LENGTH: ${lengthInstructions[answerLength]}

Generate the answer the candidate should speak. 
Start directly with the answer — no preamble.
Write naturally, as if speaking. Use "I" statements.
Only reference what is in the candidate's resume.
`.trim()
}
Question Detection Filter (Smart Noise Filter)
TypeScript

// src/lib/audio/question-filter.ts

interface FilterResult {
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
  /\?$/,                                          // Ends with question mark
  /^(what|where|when|who|why|how|which|can|could|would|should|do|did|have|has|is|are|was|were)\s/i,
  /^(tell me|describe|explain|walk me through|give me|share|talk about)/i,
]

function detectQuestion(text: string): FilterResult {
  const trimmed = text.trim()
  
  // Too short to be a real question
  if (trimmed.split(' ').length < 5) {
    return { isQuestion: false, reason: 'too_short', cleanedText: trimmed }
  }
  
  // Check for filler patterns
  for (const pattern of FILLER_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { isQuestion: false, reason: 'filler_word', cleanedText: trimmed }
    }
  }
  
  // Check for question indicators
  for (const pattern of QUESTION_INDICATORS) {
    if (pattern.test(trimmed)) {
      return { isQuestion: true, reason: 'question_pattern', cleanedText: trimmed }
    }
  }
  
  // Longer statement — might still be relevant context
  // Send to AI for classification if ambiguous
  return { isQuestion: false, reason: 'no_question_pattern', cleanedText: trimmed }
}

// Optional: AI-based classification for edge cases
async function classifyWithAI(text: string, aiProvider: AIProvider): Promise<boolean> {
  const response = await aiProvider.complete(
    'You are a classifier. Answer only YES or NO.',
    `Is this text an interview question being asked of a candidate? 
     Text: "${text}"
     Answer YES if it's a question directed at the candidate.
     Answer NO if it's a statement, acknowledgment, filler, or internal thought.`
  )
  return response.trim().toUpperCase().startsWith('YES')
}
End-of-Session Report Prompt
text

You are an expert interview coach reviewing a completed interview session.

CANDIDATE PROFILE:
{resumeContext}

TARGET ROLE: {jobTitle} at {company}
JOB DESCRIPTION: {jobDescription}

INTERVIEW TYPE: {interviewType}
SESSION DURATION: {duration} minutes

COMPLETE Q&A LOG:
{allQAPairs}

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
A single sentence the candidate can remember: what is their biggest takeaway from this session.