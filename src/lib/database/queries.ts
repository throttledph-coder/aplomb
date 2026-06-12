import { safeStorage } from 'electron'
import { getDb } from './db'
import { matchKey, nextStatus } from '../applications/link'
import type {
  Application,
  ApplicationStatus,
  Interview,
  InterviewScheduleStatus,
  InterviewSession,
  KeywordMatches,
  NewApplication,
  NewInterview,
  NewInterviewSession,
  NewQAPair,
  NewResume,
  NewTranscriptChunk,
  ParsedJobDescription,
  ParsedResumeData,
  QAPair,
  Resume,
  TranscriptChunk,
  UpdateApplication,
  UpdateInterview,
  UpdateInterviewSession,
  UpdateQAPair,
} from '../../types'

// ---------- helpers ----------
const bit = (v: boolean | undefined): number => (v ? 1 : 0)
const json = (v: unknown): string => JSON.stringify(v)

// ---------- secret-at-rest helpers (API keys) ----------
// Any `*_api_key` setting is encrypted at rest via Electron safeStorage (OS
// keychain). Legacy plaintext values keep working (read returns them as-is).
const ENC_PREFIX = 'enc:'
const isSecretKey = (key: string): boolean => key.endsWith('_api_key')

function encodeSecret(value: string | null): string | null {
  if (value == null || value === '') return value
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return ENC_PREFIX + safeStorage.encryptString(value).toString('base64')
    }
  } catch {
    /* encryption unavailable — fall back to plaintext */
  }
  return value
}

function decodeSecret(value: string | null): string | null {
  if (value == null || !value.startsWith(ENC_PREFIX)) return value
  try {
    return safeStorage.decryptString(Buffer.from(value.slice(ENC_PREFIX.length), 'base64'))
  } catch {
    return value
  }
}

function parse<T>(text: string | null): T | null {
  if (text == null) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

// Raw row shapes (SQLite: booleans as 0/1, JSON columns as TEXT).
interface RawResume {
  id: number
  name: string
  file_name: string | null
  file_path: string | null
  raw_text: string
  parsed_data: string
  is_default: number
  created_at: string
  updated_at: string
}

interface RawSession {
  id: number
  resume_id: number
  application_id: number | null
  session_name: string | null
  company: string
  job_title: string
  interview_type: string
  job_description: string
  parsed_jd: string | null
  additional_info: string | null
  status: string
  duration_sec: number
  started_at: string
  ended_at: string | null
  coaching_report: string | null
  keyword_matches: string | null
  created_at: string
}

interface RawQAPair {
  id: number
  session_id: number
  question: string
  question_source: string
  answer: string
  answer_version: number
  prompt_used: string | null
  model_used: string | null
  latency_ms: number | null
  was_copied: number
  user_rating: number | null
  sequence_order: number
  created_at: string
}

interface RawTranscriptChunk {
  id: number
  session_id: number
  raw_text: string
  is_question: number
  was_used: number
  filter_reason: string | null
  confidence: number | null
  timestamp_sec: number
  created_at: string
}

// ---------- mappers ----------
function mapResume(r: RawResume): Resume {
  return {
    ...r,
    parsed_data: (parse<ParsedResumeData>(r.parsed_data) ?? {
      skills: [],
      experience: [],
      education: [],
      projects: [],
      summary: '',
    }),
    is_default: !!r.is_default,
  }
}

function mapSession(r: RawSession): InterviewSession {
  return {
    ...r,
    interview_type: r.interview_type as InterviewSession['interview_type'],
    status: r.status as InterviewSession['status'],
    parsed_jd: parse<ParsedJobDescription>(r.parsed_jd),
    keyword_matches: parse<KeywordMatches>(r.keyword_matches),
  }
}

function mapQAPair(r: RawQAPair): QAPair {
  return {
    ...r,
    question_source: r.question_source as QAPair['question_source'],
    was_copied: !!r.was_copied,
  }
}

function mapChunk(r: RawTranscriptChunk): TranscriptChunk {
  return {
    ...r,
    is_question: !!r.is_question,
    was_used: !!r.was_used,
  }
}

// =====================================================================
// RESUMES
// =====================================================================
export function createResume(input: NewResume): Resume {
  const db = getDb()
  const info = db
    .prepare(
      `INSERT INTO resumes (name, file_name, file_path, raw_text, parsed_data, is_default)
       VALUES (@name, @file_name, @file_path, @raw_text, @parsed_data, @is_default)`,
    )
    .run({
      name: input.name ?? 'My Resume',
      file_name: input.file_name ?? null,
      file_path: input.file_path ?? null,
      raw_text: input.raw_text,
      parsed_data: json(input.parsed_data),
      is_default: bit(input.is_default),
    })
  return getResume(Number(info.lastInsertRowid))!
}

export function getResume(id: number): Resume | null {
  const row = getDb().prepare('SELECT * FROM resumes WHERE id = ?').get(id) as
    | RawResume
    | undefined
  return row ? mapResume(row) : null
}

export function listResumes(): Resume[] {
  const rows = getDb()
    .prepare('SELECT * FROM resumes ORDER BY created_at DESC')
    .all() as RawResume[]
  return rows.map(mapResume)
}

export function getDefaultResume(): Resume | null {
  const row = getDb()
    .prepare('SELECT * FROM resumes WHERE is_default = 1 ORDER BY updated_at DESC LIMIT 1')
    .get() as RawResume | undefined
  return row ? mapResume(row) : null
}

export function setDefaultResume(id: number): void {
  const db = getDb()
  const tx = db.transaction((resumeId: number) => {
    db.prepare("UPDATE resumes SET is_default = 0, updated_at = datetime('now')").run()
    db.prepare(
      "UPDATE resumes SET is_default = 1, updated_at = datetime('now') WHERE id = ?",
    ).run(resumeId)
  })
  tx(id)
}

export function updateResume(
  id: number,
  patch: Partial<NewResume>,
): Resume | null {
  const sets: string[] = []
  const params: Record<string, unknown> = { id }
  if (patch.name !== undefined) {
    sets.push('name = @name')
    params.name = patch.name
  }
  if (patch.file_name !== undefined) {
    sets.push('file_name = @file_name')
    params.file_name = patch.file_name
  }
  if (patch.file_path !== undefined) {
    sets.push('file_path = @file_path')
    params.file_path = patch.file_path
  }
  if (patch.raw_text !== undefined) {
    sets.push('raw_text = @raw_text')
    params.raw_text = patch.raw_text
  }
  if (patch.parsed_data !== undefined) {
    sets.push('parsed_data = @parsed_data')
    params.parsed_data = json(patch.parsed_data)
  }
  if (patch.is_default !== undefined) {
    sets.push('is_default = @is_default')
    params.is_default = bit(patch.is_default)
  }
  if (sets.length > 0) {
    sets.push("updated_at = datetime('now')")
    getDb()
      .prepare(`UPDATE resumes SET ${sets.join(', ')} WHERE id = @id`)
      .run(params)
  }
  return getResume(id)
}

export function deleteResume(id: number): void {
  getDb().prepare('DELETE FROM resumes WHERE id = ?').run(id)
}

// =====================================================================
// INTERVIEW SESSIONS
// =====================================================================
export function createSession(input: NewInterviewSession): InterviewSession {
  const db = getDb()
  const info = db
    .prepare(
      `INSERT INTO interview_sessions
         (resume_id, application_id, session_name, company, job_title, interview_type, job_description, parsed_jd, additional_info)
       VALUES
         (@resume_id, @application_id, @session_name, @company, @job_title, @interview_type, @job_description, @parsed_jd, @additional_info)`,
    )
    .run({
      resume_id: input.resume_id,
      application_id: input.application_id ?? null,
      session_name: input.session_name ?? null,
      company: input.company,
      job_title: input.job_title,
      interview_type: input.interview_type ?? 'mixed',
      job_description: input.job_description,
      parsed_jd: input.parsed_jd ? json(input.parsed_jd) : null,
      additional_info: input.additional_info ?? null,
    })
  // A prep/live session for a tracked job counts as activity on it.
  if (input.application_id != null) touchApplicationActivity(input.application_id)
  return getSession(Number(info.lastInsertRowid))!
}

export function getSession(id: number): InterviewSession | null {
  const row = getDb()
    .prepare('SELECT * FROM interview_sessions WHERE id = ?')
    .get(id) as RawSession | undefined
  return row ? mapSession(row) : null
}

export function listSessions(): InterviewSession[] {
  const rows = getDb()
    .prepare('SELECT * FROM interview_sessions ORDER BY started_at DESC')
    .all() as RawSession[]
  return rows.map(mapSession)
}

export function listSessionsByResume(resumeId: number): InterviewSession[] {
  const rows = getDb()
    .prepare('SELECT * FROM interview_sessions WHERE resume_id = ? ORDER BY started_at DESC')
    .all(resumeId) as RawSession[]
  return rows.map(mapSession)
}

export function listSessionsByApplication(applicationId: number): InterviewSession[] {
  const rows = getDb()
    .prepare('SELECT * FROM interview_sessions WHERE application_id = ? ORDER BY started_at DESC')
    .all(applicationId) as RawSession[]
  return rows.map(mapSession)
}

export function updateSession(
  id: number,
  patch: UpdateInterviewSession,
): InterviewSession | null {
  const sets: string[] = []
  const params: Record<string, unknown> = { id }
  const set = (col: string, value: unknown) => {
    sets.push(`${col} = @${col}`)
    params[col] = value
  }
  if (patch.application_id !== undefined) set('application_id', patch.application_id)
  if (patch.session_name !== undefined) set('session_name', patch.session_name)
  if (patch.company !== undefined) set('company', patch.company)
  if (patch.job_title !== undefined) set('job_title', patch.job_title)
  if (patch.interview_type !== undefined) set('interview_type', patch.interview_type)
  if (patch.job_description !== undefined) set('job_description', patch.job_description)
  if (patch.parsed_jd !== undefined)
    set('parsed_jd', patch.parsed_jd ? json(patch.parsed_jd) : null)
  if (patch.status !== undefined) set('status', patch.status)
  if (patch.duration_sec !== undefined) set('duration_sec', patch.duration_sec)
  if (patch.ended_at !== undefined) set('ended_at', patch.ended_at)
  if (patch.coaching_report !== undefined) set('coaching_report', patch.coaching_report)
  if (patch.keyword_matches !== undefined)
    set('keyword_matches', patch.keyword_matches ? json(patch.keyword_matches) : null)
  if (sets.length > 0) {
    getDb()
      .prepare(`UPDATE interview_sessions SET ${sets.join(', ')} WHERE id = @id`)
      .run(params)
  }
  return getSession(id)
}

export function endSession(
  id: number,
  durationSec: number,
  coachingReport?: string | null,
  keywordMatches?: KeywordMatches | null,
): InterviewSession | null {
  return updateSession(id, {
    status: 'completed',
    duration_sec: durationSec,
    ended_at: new Date().toISOString(),
    coaching_report: coachingReport ?? null,
    keyword_matches: keywordMatches ?? null,
  })
}

export function deleteSession(id: number): void {
  getDb().prepare('DELETE FROM interview_sessions WHERE id = ?').run(id)
}

// =====================================================================
// Q&A PAIRS
// =====================================================================
export function nextSequenceOrder(sessionId: number): number {
  const row = getDb()
    .prepare(
      'SELECT COALESCE(MAX(sequence_order), 0) AS max FROM qa_pairs WHERE session_id = ?',
    )
    .get(sessionId) as { max: number }
  return row.max + 1
}

export function createQAPair(input: NewQAPair): QAPair {
  const db = getDb()
  const sequence = input.sequence_order ?? nextSequenceOrder(input.session_id)
  const info = db
    .prepare(
      `INSERT INTO qa_pairs
         (session_id, question, question_source, answer, answer_version,
          prompt_used, model_used, latency_ms, sequence_order)
       VALUES
         (@session_id, @question, @question_source, @answer, @answer_version,
          @prompt_used, @model_used, @latency_ms, @sequence_order)`,
    )
    .run({
      session_id: input.session_id,
      question: input.question,
      question_source: input.question_source ?? 'manual',
      answer: input.answer,
      answer_version: input.answer_version ?? 1,
      prompt_used: input.prompt_used ?? null,
      model_used: input.model_used ?? null,
      latency_ms: input.latency_ms ?? null,
      sequence_order: sequence,
    })
  const row = db
    .prepare('SELECT * FROM qa_pairs WHERE id = ?')
    .get(Number(info.lastInsertRowid)) as RawQAPair
  return mapQAPair(row)
}

export function listQAPairs(sessionId: number): QAPair[] {
  const rows = getDb()
    .prepare('SELECT * FROM qa_pairs WHERE session_id = ? ORDER BY sequence_order ASC')
    .all(sessionId) as RawQAPair[]
  return rows.map(mapQAPair)
}

export function updateQAPair(id: number, patch: UpdateQAPair): QAPair | null {
  const sets: string[] = []
  const params: Record<string, unknown> = { id }
  if (patch.answer !== undefined) {
    sets.push('answer = @answer')
    params.answer = patch.answer
  }
  if (patch.answer_version !== undefined) {
    sets.push('answer_version = @answer_version')
    params.answer_version = patch.answer_version
  }
  if (patch.was_copied !== undefined) {
    sets.push('was_copied = @was_copied')
    params.was_copied = bit(patch.was_copied)
  }
  if (patch.user_rating !== undefined) {
    sets.push('user_rating = @user_rating')
    params.user_rating = patch.user_rating
  }
  if (sets.length > 0) {
    getDb().prepare(`UPDATE qa_pairs SET ${sets.join(', ')} WHERE id = @id`).run(params)
  }
  const row = getDb().prepare('SELECT * FROM qa_pairs WHERE id = ?').get(id) as
    | RawQAPair
    | undefined
  return row ? mapQAPair(row) : null
}

// =====================================================================
// TRANSCRIPT CHUNKS
// =====================================================================
export function createTranscriptChunk(input: NewTranscriptChunk): TranscriptChunk {
  const db = getDb()
  const info = db
    .prepare(
      `INSERT INTO transcript_chunks
         (session_id, raw_text, is_question, was_used, filter_reason, confidence, timestamp_sec)
       VALUES
         (@session_id, @raw_text, @is_question, @was_used, @filter_reason, @confidence, @timestamp_sec)`,
    )
    .run({
      session_id: input.session_id,
      raw_text: input.raw_text,
      is_question: bit(input.is_question),
      was_used: bit(input.was_used),
      filter_reason: input.filter_reason ?? null,
      confidence: input.confidence ?? null,
      timestamp_sec: input.timestamp_sec,
    })
  const row = db
    .prepare('SELECT * FROM transcript_chunks WHERE id = ?')
    .get(Number(info.lastInsertRowid)) as RawTranscriptChunk
  return mapChunk(row)
}

export function listTranscriptChunks(sessionId: number): TranscriptChunk[] {
  const rows = getDb()
    .prepare('SELECT * FROM transcript_chunks WHERE session_id = ? ORDER BY timestamp_sec ASC')
    .all(sessionId) as RawTranscriptChunk[]
  return rows.map(mapChunk)
}

// =====================================================================
// SETTINGS
// =====================================================================
export function getSetting(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string | null }
    | undefined
  if (!row) return null
  return isSecretKey(key) ? decodeSecret(row.value) : row.value
}

export function getAllSettings(): Record<string, string | null> {
  const rows = getDb().prepare('SELECT key, value FROM settings').all() as {
    key: string
    value: string | null
  }[]
  const out: Record<string, string | null> = {}
  for (const { key, value } of rows) out[key] = isSecretKey(key) ? decodeSecret(value) : value
  return out
}

export function setSetting(key: string, value: string | null): void {
  const stored = isSecretKey(key) ? encodeSecret(value) : value
  getDb()
    .prepare(
      `INSERT INTO settings (key, value, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    )
    .run(key, stored)
}

// ----- plan helpers (consumed later by src/lib/plan.ts) -----
export function getPlan(): string {
  return getSetting('plan') ?? 'free'
}

export function getFreeSessionsUsed(): number {
  return Number(getSetting('free_sessions_used') ?? '0')
}

export function incrementFreeSessionsUsed(): number {
  const next = getFreeSessionsUsed() + 1
  setSetting('free_sessions_used', String(next))
  return next
}

// =====================================================================
// JOB APPLICATIONS (tracker)
// =====================================================================
interface RawApplication {
  id: number
  company: string
  job_title: string
  job_url: string | null
  status: string
  job_description: string | null
  notes: string | null
  session_id: number | null
  applied_at: string | null
  salary_range: string | null
  location: string | null
  source: string | null
  deadline: string | null
  excitement: number | null
  next_action: string | null
  next_action_at: string | null
  last_activity_at: string | null
  notified_action: number
  created_at: string
  updated_at: string
}

function mapApplication(r: RawApplication): Application {
  return {
    ...r,
    status: r.status as ApplicationStatus,
    notified_action: !!r.notified_action,
  }
}

export function createApplication(input: NewApplication): Application {
  const db = getDb()
  const info = db
    .prepare(
      `INSERT INTO applications
         (company, job_title, job_url, status, job_description, notes, session_id, applied_at,
          salary_range, location, source, deadline, excitement, next_action, next_action_at,
          last_activity_at)
       VALUES
         (@company, @job_title, @job_url, @status, @job_description, @notes, @session_id, @applied_at,
          @salary_range, @location, @source, @deadline, @excitement, @next_action, @next_action_at,
          datetime('now'))`,
    )
    .run({
      company: input.company,
      job_title: input.job_title,
      job_url: input.job_url ?? null,
      status: input.status ?? 'wishlist',
      job_description: input.job_description ?? null,
      notes: input.notes ?? null,
      session_id: input.session_id ?? null,
      applied_at: input.applied_at ?? null,
      salary_range: input.salary_range ?? null,
      location: input.location ?? null,
      source: input.source ?? null,
      deadline: input.deadline ?? null,
      excitement: input.excitement ?? null,
      next_action: input.next_action ?? null,
      next_action_at: input.next_action_at ?? null,
    })
  return getApplication(Number(info.lastInsertRowid))!
}

// Mark meaningful movement on an application (session started, interview round
// changed, status edits) so the staleness rules in lib/applications/actions.ts
// have a trustworthy clock.
export function touchApplicationActivity(id: number): void {
  getDb()
    .prepare(
      "UPDATE applications SET last_activity_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
    )
    .run(id)
}

export function getApplication(id: number): Application | null {
  const row = getDb().prepare('SELECT * FROM applications WHERE id = ?').get(id) as
    | RawApplication
    | undefined
  return row ? mapApplication(row) : null
}

export function listApplications(): Application[] {
  const rows = getDb()
    .prepare('SELECT * FROM applications ORDER BY created_at DESC')
    .all() as RawApplication[]
  return rows.map(mapApplication)
}

export function updateApplication(id: number, patch: UpdateApplication): Application | null {
  const sets: string[] = []
  const params: Record<string, unknown> = { id }
  const set = (col: string, value: unknown) => {
    sets.push(`${col} = @${col}`)
    params[col] = value
  }
  if (patch.company !== undefined) set('company', patch.company)
  if (patch.job_title !== undefined) set('job_title', patch.job_title)
  if (patch.job_url !== undefined) set('job_url', patch.job_url)
  if (patch.status !== undefined) set('status', patch.status)
  if (patch.job_description !== undefined) set('job_description', patch.job_description)
  if (patch.notes !== undefined) set('notes', patch.notes)
  if (patch.applied_at !== undefined) set('applied_at', patch.applied_at)
  if (patch.salary_range !== undefined) set('salary_range', patch.salary_range)
  if (patch.location !== undefined) set('location', patch.location)
  if (patch.source !== undefined) set('source', patch.source)
  if (patch.deadline !== undefined) set('deadline', patch.deadline)
  if (patch.excitement !== undefined) set('excitement', patch.excitement)
  if (patch.next_action !== undefined) set('next_action', patch.next_action)
  if (patch.next_action_at !== undefined) {
    set('next_action_at', patch.next_action_at)
    // A new due time means the old notification no longer applies.
    sets.push('notified_action = 0')
  }
  if (sets.length > 0) {
    // Real movement (not planning fields) refreshes the staleness clock.
    const activity =
      patch.status !== undefined ||
      patch.notes !== undefined ||
      patch.applied_at !== undefined ||
      patch.job_description !== undefined
    if (activity) sets.push("last_activity_at = datetime('now')")
    sets.push("updated_at = datetime('now')")
    getDb().prepare(`UPDATE applications SET ${sets.join(', ')} WHERE id = @id`).run(params)
  }
  return getApplication(id)
}

// Active applications for the action engine (Home queue + reminder scheduler).
export function listApplicationsWithActions(): Application[] {
  const rows = getDb()
    .prepare("SELECT * FROM applications WHERE status != 'rejected' ORDER BY created_at DESC")
    .all() as RawApplication[]
  return rows.map(mapApplication)
}

export function markApplicationActionNotified(id: number): void {
  getDb().prepare('UPDATE applications SET notified_action = 1 WHERE id = ?').run(id)
}

export function deleteApplication(id: number): void {
  getDb().prepare('DELETE FROM applications WHERE id = ?').run(id)
}

// Find-or-create the application for a job (case-insensitive company+title match),
// so every session started for a job feeds the tracker. Bumps an early-stage
// match to 'interview' (never downgrades later stages) and fills an empty JD.
export function upsertApplicationForJob(input: {
  company: string
  job_title: string
  job_description?: string | null
}): Application {
  const key = matchKey(input.company, input.job_title)
  const existing = listApplications().find((a) => matchKey(a.company, a.job_title) === key)
  if (existing) {
    const patch: UpdateApplication = {}
    const bumped = nextStatus(existing.status)
    if (bumped !== existing.status) patch.status = bumped
    if (!existing.job_description && input.job_description) patch.job_description = input.job_description
    if (Object.keys(patch).length > 0) return updateApplication(existing.id, patch)!
    // No field change, but starting a session for this job is still activity.
    touchApplicationActivity(existing.id)
    return getApplication(existing.id)!
  }
  return createApplication({
    company: input.company,
    job_title: input.job_title,
    job_description: input.job_description ?? null,
    status: 'interview',
    applied_at: new Date().toISOString(),
  })
}

// ---------- scheduled interviews (calendar) ----------
interface RawInterview {
  id: number
  application_id: number | null
  resume_id: number | null
  session_id: number | null
  company: string
  job_title: string
  interview_type: string
  job_description: string | null
  round_name: string | null
  location: string | null
  scheduled_at: string
  duration_min: number
  status: string
  notes: string | null
  additional_info: string | null
  remind_day_of: number
  remind_mins_before: number | null
  notified_day_of: number
  notified_before: number
  created_at: string
  updated_at: string
}

function mapInterview(r: RawInterview): Interview {
  return {
    ...r,
    interview_type: r.interview_type as Interview['interview_type'],
    status: r.status as InterviewScheduleStatus,
    remind_day_of: !!r.remind_day_of,
    notified_day_of: !!r.notified_day_of,
    notified_before: !!r.notified_before,
  }
}

export function createInterview(input: NewInterview): Interview {
  const db = getDb()
  const info = db
    .prepare(
      `INSERT INTO interviews
         (application_id, resume_id, session_id, company, job_title, interview_type,
          job_description, round_name, location, scheduled_at, duration_min, status,
          notes, additional_info, remind_day_of, remind_mins_before)
       VALUES
         (@application_id, @resume_id, @session_id, @company, @job_title, @interview_type,
          @job_description, @round_name, @location, @scheduled_at, @duration_min, @status,
          @notes, @additional_info, @remind_day_of, @remind_mins_before)`,
    )
    .run({
      application_id: input.application_id ?? null,
      resume_id: input.resume_id ?? null,
      session_id: input.session_id ?? null,
      company: input.company,
      job_title: input.job_title,
      interview_type: input.interview_type ?? 'mixed',
      job_description: input.job_description ?? null,
      round_name: input.round_name ?? null,
      location: input.location ?? null,
      scheduled_at: input.scheduled_at,
      duration_min: input.duration_min ?? 45,
      status: input.status ?? 'upcoming',
      notes: input.notes ?? null,
      additional_info: input.additional_info ?? null,
      remind_day_of: bit(input.remind_day_of ?? true),
      remind_mins_before: input.remind_mins_before ?? null,
    })
  // Scheduling a round for a tracked job counts as activity on it.
  if (input.application_id != null) touchApplicationActivity(input.application_id)
  return getInterview(Number(info.lastInsertRowid))!
}

export function getInterview(id: number): Interview | null {
  const row = getDb().prepare('SELECT * FROM interviews WHERE id = ?').get(id) as
    | RawInterview
    | undefined
  return row ? mapInterview(row) : null
}

export function listInterviews(): Interview[] {
  const rows = getDb()
    .prepare('SELECT * FROM interviews ORDER BY scheduled_at ASC')
    .all() as RawInterview[]
  return rows.map(mapInterview)
}

// Upcoming events the reminder scheduler still needs to consider.
export function listUpcomingInterviews(): Interview[] {
  const rows = getDb()
    .prepare("SELECT * FROM interviews WHERE status = 'upcoming' ORDER BY scheduled_at ASC")
    .all() as RawInterview[]
  return rows.map(mapInterview)
}

export function updateInterview(id: number, patch: UpdateInterview): Interview | null {
  const sets: string[] = []
  const params: Record<string, unknown> = { id }
  const set = (col: string, value: unknown) => {
    sets.push(`${col} = @${col}`)
    params[col] = value
  }
  if (patch.application_id !== undefined) set('application_id', patch.application_id)
  if (patch.resume_id !== undefined) set('resume_id', patch.resume_id)
  if (patch.session_id !== undefined) set('session_id', patch.session_id)
  if (patch.company !== undefined) set('company', patch.company)
  if (patch.job_title !== undefined) set('job_title', patch.job_title)
  if (patch.interview_type !== undefined) set('interview_type', patch.interview_type)
  if (patch.job_description !== undefined) set('job_description', patch.job_description)
  if (patch.round_name !== undefined) set('round_name', patch.round_name)
  if (patch.location !== undefined) set('location', patch.location)
  if (patch.scheduled_at !== undefined) set('scheduled_at', patch.scheduled_at)
  if (patch.duration_min !== undefined) set('duration_min', patch.duration_min)
  if (patch.status !== undefined) set('status', patch.status)
  if (patch.notes !== undefined) set('notes', patch.notes)
  if (patch.additional_info !== undefined) set('additional_info', patch.additional_info)
  if (patch.remind_day_of !== undefined) set('remind_day_of', bit(patch.remind_day_of))
  if (patch.remind_mins_before !== undefined) set('remind_mins_before', patch.remind_mins_before)
  if (patch.notified_day_of !== undefined) set('notified_day_of', bit(patch.notified_day_of))
  if (patch.notified_before !== undefined) set('notified_before', bit(patch.notified_before))
  if (sets.length > 0) {
    sets.push("updated_at = datetime('now')")
    getDb()
      .prepare(`UPDATE interviews SET ${sets.join(', ')} WHERE id = @id`)
      .run(params)
    // A round outcome (completed/cancelled/rescheduled) is activity on the job.
    if (patch.status !== undefined || patch.scheduled_at !== undefined) {
      const iv = getInterview(id)
      if (iv?.application_id != null) touchApplicationActivity(iv.application_id)
    }
  }
  return getInterview(id)
}

// Mark a reminder as sent so the scheduler never re-fires it.
export function markInterviewNotified(
  id: number,
  flags: { day_of?: boolean; before?: boolean },
): void {
  const sets: string[] = []
  if (flags.day_of) sets.push('notified_day_of = 1')
  if (flags.before) sets.push('notified_before = 1')
  if (sets.length === 0) return
  getDb()
    .prepare(`UPDATE interviews SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`)
    .run(id)
}

export function deleteInterview(id: number): void {
  getDb().prepare('DELETE FROM interviews WHERE id = ?').run(id)
}
