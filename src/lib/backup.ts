import type { InterviewSession, QAPair, Resume } from '@/types'

// Validated shape of an Aplomb export (written by Settings → Export).
export interface ClarityExport {
  resumes: Resume[]
  sessions: InterviewSession[]
  qa: Record<string, QAPair[]>
}

// Parse + validate an export JSON string. Throws on malformed input.
export function parseExport(json: string): ClarityExport {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error('Not valid JSON.')
  }
  if (typeof data !== 'object' || data === null) {
    throw new Error('Unexpected file format.')
  }
  const obj = data as Record<string, unknown>
  if (!Array.isArray(obj.resumes) || !Array.isArray(obj.sessions)) {
    throw new Error('Missing resumes or sessions — not an Aplomb export.')
  }
  const qa = (obj.qa && typeof obj.qa === 'object' ? obj.qa : {}) as Record<string, QAPair[]>
  return {
    resumes: obj.resumes as Resume[],
    sessions: obj.sessions as InterviewSession[],
    qa,
  }
}
