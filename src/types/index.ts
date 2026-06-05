// Domain types for Aplomb.
// Row types mirror the SQLite schema (docs/05-database-schema.md): booleans are
// stored as 0/1 integers, JSON columns as TEXT. queries.ts (de)serializes JSON
// fields, so the *parsed* shapes below are what the rest of the app consumes.

export type InterviewType =
  | 'technical'
  | 'behavioral'
  | 'mixed'
  | 'system_design'
  | 'other'

export type SessionStatus = 'active' | 'completed'

export type QuestionSource = 'manual' | 'auto-listen'

// ----- Resume parsed_data JSON shape -----
export interface ResumeExperience {
  company: string
  title: string
  duration: string
  bullets: string[]
}

export interface ResumeEducation {
  degree: string
  school: string
  year: string
}

export interface ResumeProject {
  name: string
  description: string
  technologies: string[]
}

export interface ParsedResumeData {
  skills: string[]
  experience: ResumeExperience[]
  education: ResumeEducation[]
  projects: ResumeProject[]
  summary: string
}

// ----- Job description parsed_jd JSON shape -----
export interface ParsedJobDescription {
  requirements: string[]
  keywords: string[]
  skills: string[]
}

// ----- Session keyword_matches JSON shape -----
export interface KeywordMatches {
  matched: string[]
  missed: string[]
}

// ===== Resumes =====
export interface Resume {
  id: number
  name: string
  file_name: string | null
  file_path: string | null
  raw_text: string
  parsed_data: ParsedResumeData
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface NewResume {
  name?: string
  file_name?: string | null
  file_path?: string | null
  raw_text: string
  parsed_data: ParsedResumeData
  is_default?: boolean
}

// ===== Interview sessions =====
export interface InterviewSession {
  id: number
  resume_id: number
  session_name: string | null
  company: string
  job_title: string
  interview_type: InterviewType
  job_description: string
  parsed_jd: ParsedJobDescription | null
  additional_info: string | null
  status: SessionStatus
  duration_sec: number
  started_at: string
  ended_at: string | null
  coaching_report: string | null
  keyword_matches: KeywordMatches | null
  created_at: string
}

export interface NewInterviewSession {
  resume_id: number
  session_name?: string | null
  company: string
  job_title: string
  interview_type?: InterviewType
  job_description: string
  parsed_jd?: ParsedJobDescription | null
  additional_info?: string | null
}

export interface UpdateInterviewSession {
  session_name?: string | null
  company?: string
  job_title?: string
  interview_type?: InterviewType
  job_description?: string
  parsed_jd?: ParsedJobDescription | null
  status?: SessionStatus
  duration_sec?: number
  ended_at?: string | null
  coaching_report?: string | null
  keyword_matches?: KeywordMatches | null
}

// ===== Q&A pairs =====
export interface QAPair {
  id: number
  session_id: number
  question: string
  question_source: QuestionSource
  answer: string
  answer_version: number
  prompt_used: string | null
  model_used: string | null
  latency_ms: number | null
  was_copied: boolean
  user_rating: number | null
  sequence_order: number
  created_at: string
}

export interface NewQAPair {
  session_id: number
  question: string
  question_source?: QuestionSource
  answer: string
  answer_version?: number
  prompt_used?: string | null
  model_used?: string | null
  latency_ms?: number | null
  sequence_order?: number
}

export interface UpdateQAPair {
  answer?: string
  answer_version?: number
  was_copied?: boolean
  user_rating?: number | null
}

// ===== Transcript chunks (premium auto-listen) =====
export interface TranscriptChunk {
  id: number
  session_id: number
  raw_text: string
  is_question: boolean
  was_used: boolean
  filter_reason: string | null
  confidence: number | null
  timestamp_sec: number
  created_at: string
}

export interface NewTranscriptChunk {
  session_id: number
  raw_text: string
  is_question?: boolean
  was_used?: boolean
  filter_reason?: string | null
  confidence?: number | null
  timestamp_sec: number
}

// ===== Settings =====
export interface Setting {
  id: number
  key: string
  value: string | null
  updated_at: string
}

// ===== Job applications (tracker) =====
export type ApplicationStatus =
  | 'wishlist'
  | 'applied'
  | 'screening'
  | 'interview'
  | 'offer'
  | 'rejected'

export interface Application {
  id: number
  company: string
  job_title: string
  job_url: string | null
  status: ApplicationStatus
  job_description: string | null
  notes: string | null
  session_id: number | null
  applied_at: string | null
  created_at: string
  updated_at: string
}

export interface NewApplication {
  company: string
  job_title: string
  job_url?: string | null
  status?: ApplicationStatus
  job_description?: string | null
  notes?: string | null
  session_id?: number | null
  applied_at?: string | null
}

export interface UpdateApplication {
  company?: string
  job_title?: string
  job_url?: string | null
  status?: ApplicationStatus
  job_description?: string | null
  notes?: string | null
  applied_at?: string | null
}
