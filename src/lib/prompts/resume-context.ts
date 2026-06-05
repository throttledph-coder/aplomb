import type { ParsedResumeData } from '../../types'

// Format parsed resume data into prompt context (docs/06-prompting-system.md).
export function buildResumeContext(resume: ParsedResumeData): string {
  return `
CANDIDATE PROFILE:
==================
${resume.summary ? `Summary: ${resume.summary}` : ''}

Work Experience:
${resume.experience
  .map(
    (exp) => `
• ${exp.title} at ${exp.company} (${exp.duration})
  ${exp.bullets.slice(0, 4).map((b) => `- ${b}`).join('\n  ')}
`,
  )
  .join('')}

Technical Skills: ${resume.skills.join(', ')}

Education: ${resume.education.map((e) => `${e.degree} from ${e.school} (${e.year})`).join('; ')}

${
  resume.projects.length > 0
    ? `Notable Projects:
${resume.projects.map((p) => `• ${p.name}: ${p.description} (${p.technologies.join(', ')})`).join('\n')}`
    : ''
}
`.trim()
}
