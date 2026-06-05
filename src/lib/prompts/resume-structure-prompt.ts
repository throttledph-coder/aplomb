import type { ParsedResumeData } from '../../types'

// AI-based resume structuring — turns messy extracted text into clean JSON.
export function buildResumeStructurePrompt(rawText: string): string {
  return `Extract the following resume into STRICT JSON. Output ONLY the JSON object, no prose, no
markdown fences.

Schema:
{
  "summary": string,                       // 1-2 sentence professional summary
  "skills": string[],                      // individual skills/technologies
  "experience": [
    { "title": string, "company": string, "duration": string, "bullets": string[] }
  ],
  "education": [ { "degree": string, "school": string, "year": string } ],
  "projects": [ { "name": string, "description": string, "technologies": string[] } ]
}

Rules:
- Use "" for unknown strings and [] for unknown arrays. Never invent facts.
- "duration" like "Jan 2021 - Present". Put achievement lines in "bullets".
- Keep company and title separate and correct.

RESUME TEXT:
${rawText}`
}

const EMPTY: ParsedResumeData = {
  skills: [],
  experience: [],
  education: [],
  projects: [],
  summary: '',
}

function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

// Parse the AI response into a safe ParsedResumeData (never throws).
export function parseStructuredResume(raw: string): ParsedResumeData {
  try {
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start === -1 || end === -1) return EMPTY
    const obj = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>
    const expRaw = Array.isArray(obj.experience) ? obj.experience : []
    const eduRaw = Array.isArray(obj.education) ? obj.education : []
    const projRaw = Array.isArray(obj.projects) ? obj.projects : []
    return {
      summary: typeof obj.summary === 'string' ? obj.summary : '',
      skills: strArray(obj.skills),
      experience: expRaw.map((e) => {
        const o = (e ?? {}) as Record<string, unknown>
        return {
          title: typeof o.title === 'string' ? o.title : '',
          company: typeof o.company === 'string' ? o.company : '',
          duration: typeof o.duration === 'string' ? o.duration : '',
          bullets: strArray(o.bullets),
        }
      }),
      education: eduRaw.map((e) => {
        const o = (e ?? {}) as Record<string, unknown>
        return {
          degree: typeof o.degree === 'string' ? o.degree : '',
          school: typeof o.school === 'string' ? o.school : '',
          year: typeof o.year === 'string' ? o.year : '',
        }
      }),
      projects: projRaw.map((e) => {
        const o = (e ?? {}) as Record<string, unknown>
        return {
          name: typeof o.name === 'string' ? o.name : '',
          description: typeof o.description === 'string' ? o.description : '',
          technologies: strArray(o.technologies),
        }
      }),
    }
  } catch {
    return EMPTY
  }
}
