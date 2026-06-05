import type {
  ParsedResumeData,
  ResumeEducation,
  ResumeExperience,
  ResumeProject,
} from '../../types'
import { extractPdfText } from './pdf-parser'
import { extractDocxText } from './docx-parser'

// Deterministic, heuristic resume structuring. No AI (providers arrive in step 3).
// Best-effort: always returns a ParsedResumeData, never throws. Users edit later.

type SectionKey = 'summary' | 'experience' | 'education' | 'projects' | 'skills'

const SECTION_PATTERNS: ReadonlyArray<[SectionKey, RegExp]> = [
  ['summary', /^(summary|professional summary|profile|objective|about me|about)\b/i],
  ['experience', /^(experience|work experience|professional experience|employment( history)?|work history)\b/i],
  ['education', /^(education|academic background|academics)\b/i],
  ['projects', /^(projects|personal projects|notable projects|side projects|selected projects)\b/i],
  ['skills', /^(skills|technical skills|core competencies|technologies|tech stack)\b/i],
]

// Small fallback vocabulary so skills are populated even without a Skills section.
const KNOWN_TECH = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#', 'Ruby',
  'PHP', 'Swift', 'Kotlin', 'Scala', 'React', 'Vue', 'Angular', 'Svelte', 'Next.js',
  'Node.js', 'Express', 'Django', 'Flask', 'FastAPI', 'Spring', 'Rails', '.NET',
  'GraphQL', 'REST', 'PostgreSQL', 'MySQL', 'SQLite', 'MongoDB', 'Redis', 'Elasticsearch',
  'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Terraform', 'Git', 'CI/CD', 'Kafka',
  'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'HTML', 'CSS', 'Tailwind', 'Electron',
]

const BULLET_RE = /^\s*[-–—•*▪◦‣·]\s+/
const NUMBERED_RE = /^\s*\d+[.)]\s+/
const DATE_RANGE_RE =
  /\(?\b((?:[A-Z][a-z]{2,8}\.?\s*)?(?:19|20)\d{2})\b\s*[-–—]+\s*\b(present|current|(?:[A-Z][a-z]{2,8}\.?\s*)?(?:19|20)\d{2})\b\)?/i
const YEAR_RE = /\b(?:19|20)\d{2}\b/
const DEGREE_RE =
  /\b(B\.?\s?S\.?(?:c)?|M\.?\s?S\.?(?:c)?|B\.?\s?A\.?|M\.?\s?A\.?|Ph\.?\s?D|MBA|Bachelor(?:'?s)?|Master(?:'?s)?|Associate(?:'?s)?)\b[^,|\n]*/i
const SCHOOL_RE = /\b[\w.&' ]*(University|College|Institute|School|Academy|Polytechnic)\b[\w.&' ]*/i
const CONTACT_RE = /(@|https?:\/\/|www\.|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b|linkedin|github)/i

function stripBullet(line: string): string {
  return line.replace(BULLET_RE, '').replace(NUMBERED_RE, '').trim()
}

function isBullet(line: string): boolean {
  return BULLET_RE.test(line) || NUMBERED_RE.test(line)
}

function matchSection(line: string): SectionKey | null {
  const cleaned = line.trim().replace(/:$/, '')
  if (cleaned.length > 40) return null
  for (const [key, re] of SECTION_PATTERNS) {
    if (re.test(cleaned)) return key
  }
  return null
}

interface Sections {
  preamble: string[]
  summary: string[]
  experience: string[]
  education: string[]
  projects: string[]
  skills: string[]
}

function splitSections(lines: string[]): Sections {
  const sections: Sections = {
    preamble: [],
    summary: [],
    experience: [],
    education: [],
    projects: [],
    skills: [],
  }
  let current: keyof Sections = 'preamble'
  for (const line of lines) {
    const header = matchSection(line)
    if (header) {
      current = header
      continue
    }
    sections[current].push(line)
  }
  return sections
}

function parseSkills(skillLines: string[], fullText: string): string[] {
  const out = new Set<string>()
  for (const raw of skillLines) {
    const line = stripBullet(raw)
    // strip leading "Category:" labels like "Languages: ..."
    const afterLabel = line.includes(':') ? line.slice(line.indexOf(':') + 1) : line
    for (const token of afterLabel.split(/[,/|•·;]+/)) {
      const t = token.trim()
      if (t.length >= 1 && t.length <= 40) out.add(t)
    }
  }
  if (out.size === 0) {
    for (const tech of KNOWN_TECH) {
      const re = new RegExp(`\\b${tech.replace(/[.+*?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      if (re.test(fullText)) out.add(tech)
    }
  }
  return [...out]
}

function parseExperience(lines: string[]): ResumeExperience[] {
  const entries: ResumeExperience[] = []
  let current: ResumeExperience | null = null
  for (const raw of lines) {
    if (!raw.trim()) continue
    if (isBullet(raw)) {
      if (current) current.bullets.push(stripBullet(raw))
      continue
    }
    // header line -> new entry
    if (current && current.title) entries.push(current)
    let line = raw.trim()
    let duration = ''
    const dateMatch = line.match(DATE_RANGE_RE)
    if (dateMatch) {
      duration = dateMatch[0].replace(/[()]/g, '').trim()
      line = line.replace(dateMatch[0], '').trim()
    }
    line = line.replace(/[•|]+\s*$/, '').replace(/\s{2,}/g, ' ').trim()
    const sep = line.match(/\s+(?:at|@|—|–|-|\|)\s+/)
    let title = line
    let company = ''
    if (sep && sep.index !== undefined) {
      title = line.slice(0, sep.index).trim()
      company = line.slice(sep.index + sep[0].length).trim()
    }
    current = { title, company, duration, bullets: [] }
  }
  if (current && current.title) entries.push(current)
  return entries.filter((e) => e.title.length > 0)
}

function parseEducation(lines: string[]): ResumeEducation[] {
  const out: ResumeEducation[] = []
  for (const raw of lines) {
    const line = stripBullet(raw)
    if (!line) continue
    const yearMatch = line.match(YEAR_RE)
    const degreeMatch = line.match(DEGREE_RE)
    const schoolMatch = line.match(SCHOOL_RE)
    const degree = degreeMatch ? degreeMatch[0].trim() : line.split(/[,|]/)[0].trim()
    let school = schoolMatch ? schoolMatch[0].trim() : ''
    if (!school) {
      const parts = line.split(/[,|]/).map((p) => p.trim())
      school = parts.length > 1 ? parts[1] : ''
    }
    if (!degree && !school) continue
    out.push({ degree, school, year: yearMatch ? yearMatch[0] : '' })
  }
  return out
}

function parseProjects(lines: string[]): ResumeProject[] {
  const out: ResumeProject[] = []
  let current: ResumeProject | null = null
  for (const raw of lines) {
    if (!raw.trim()) continue
    if (isBullet(raw) && current) {
      current.description = [current.description, stripBullet(raw)].filter(Boolean).join(' ')
      continue
    }
    if (current) out.push(current)
    let line = stripBullet(raw)
    const technologies: string[] = []
    const parenMatch = line.match(/\(([^)]+)\)\s*$/)
    if (parenMatch) {
      for (const t of parenMatch[1].split(/[,/|]/)) {
        const tt = t.trim()
        if (tt) technologies.push(tt)
      }
      line = line.replace(parenMatch[0], '').trim()
    }
    let name = line
    let description = ''
    if (line.includes(':')) {
      name = line.slice(0, line.indexOf(':')).trim()
      description = line.slice(line.indexOf(':') + 1).trim()
    } else if (line.includes(' - ') || line.includes(' — ')) {
      const m = line.split(/\s+[—-]\s+/)
      name = m[0].trim()
      description = m.slice(1).join(' - ').trim()
    }
    current = { name, description, technologies }
  }
  if (current) out.push(current)
  return out.filter((p) => p.name.length > 0)
}

function parseSummary(summaryLines: string[], preamble: string[]): string {
  const fromSection = summaryLines.map((l) => l.trim()).filter(Boolean).join(' ').trim()
  if (fromSection) return fromSection
  // fallback: first substantial non-contact paragraph from the preamble
  for (const line of preamble) {
    const t = line.trim()
    if (t.length >= 40 && !CONTACT_RE.test(t)) return t
  }
  return ''
}

export function parseResumeText(text: string): ParsedResumeData {
  const empty: ParsedResumeData = {
    skills: [],
    experience: [],
    education: [],
    projects: [],
    summary: '',
  }
  try {
    const lines = text
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map((l) => l.replace(/\s+$/, ''))
    const sections = splitSections(lines)
    return {
      skills: parseSkills(sections.skills, text),
      experience: parseExperience(sections.experience),
      education: parseEducation(sections.education),
      projects: parseProjects(sections.projects),
      summary: parseSummary(sections.summary, sections.preamble),
    }
  } catch {
    return empty
  }
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : ''
}

export async function parseResumeFile(
  fileName: string,
  data: Uint8Array,
): Promise<{ raw_text: string; parsed_data: ParsedResumeData }> {
  const ext = extensionOf(fileName)
  let raw_text: string
  if (ext === 'pdf') {
    raw_text = await extractPdfText(data)
  } else if (ext === 'docx' || ext === 'doc') {
    raw_text = await extractDocxText(data)
  } else {
    raw_text = new TextDecoder('utf-8').decode(data)
  }
  return { raw_text, parsed_data: parseResumeText(raw_text) }
}
