import type Database from 'better-sqlite3'

// Full schema from docs/05-database-schema.md.
// CREATE TABLE IF NOT EXISTS so applySchema is idempotent on every app start.
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS resumes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL DEFAULT 'My Resume',
  file_name       TEXT,
  file_path       TEXT,
  raw_text        TEXT NOT NULL,
  parsed_data     TEXT NOT NULL,
  is_default      BOOLEAN DEFAULT FALSE,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS interview_sessions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  resume_id         INTEGER NOT NULL REFERENCES resumes(id),
  application_id    INTEGER REFERENCES applications(id) ON DELETE SET NULL,
  session_name      TEXT,
  company           TEXT NOT NULL,
  job_title         TEXT NOT NULL,
  interview_type    TEXT NOT NULL DEFAULT 'mixed',
  job_description   TEXT NOT NULL,
  parsed_jd         TEXT,
  additional_info   TEXT,
  status            TEXT NOT NULL DEFAULT 'active',
  duration_sec      INTEGER DEFAULT 0,
  started_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at          DATETIME,
  coaching_report   TEXT,
  keyword_matches   TEXT,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS qa_pairs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id      INTEGER NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  question        TEXT NOT NULL,
  question_source TEXT NOT NULL DEFAULT 'manual',
  answer          TEXT NOT NULL,
  answer_version  INTEGER DEFAULT 1,
  prompt_used     TEXT,
  model_used      TEXT,
  latency_ms      INTEGER,
  was_copied      BOOLEAN DEFAULT FALSE,
  user_rating     INTEGER,
  sequence_order  INTEGER NOT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transcript_chunks (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id        INTEGER NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  raw_text          TEXT NOT NULL,
  is_question       BOOLEAN DEFAULT FALSE,
  was_used          BOOLEAN DEFAULT FALSE,
  filter_reason     TEXT,
  confidence        REAL,
  timestamp_sec     INTEGER NOT NULL,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  key         TEXT NOT NULL UNIQUE,
  value       TEXT,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- JOB APPLICATIONS (tracker)
-- =============================================
CREATE TABLE IF NOT EXISTS applications (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  company       TEXT NOT NULL,
  job_title     TEXT NOT NULL,
  job_url       TEXT,
  status        TEXT NOT NULL DEFAULT 'wishlist',
  -- status: wishlist, applied, screening, interview, offer, rejected
  job_description TEXT,
  notes         TEXT,
  session_id    INTEGER REFERENCES interview_sessions(id) ON DELETE SET NULL,
  applied_at    DATETIME,
  salary_range  TEXT,
  location      TEXT,
  source        TEXT,
  deadline      DATETIME,
  excitement    INTEGER,
  -- Next-action engine: what to do next and when it's due; last_activity_at is
  -- touched by any meaningful change (status, session, interview) so staleness
  -- can be detected. notified_action prevents reminder re-fires.
  next_action      TEXT,
  next_action_at   DATETIME,
  last_activity_at DATETIME,
  notified_action  BOOLEAN DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- SCHEDULED INTERVIEWS (calendar)
-- =============================================
-- A dated interview event. Optionally linked to a tracked application and to the
-- live session that gets launched from it. Carries enough context (company, JD,
-- resume, type) to one-click-launch a session, skipping the setup wizard.
CREATE TABLE IF NOT EXISTS interviews (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id     INTEGER REFERENCES applications(id) ON DELETE SET NULL,
  resume_id          INTEGER REFERENCES resumes(id) ON DELETE SET NULL,
  session_id         INTEGER REFERENCES interview_sessions(id) ON DELETE SET NULL,
  company            TEXT NOT NULL,
  job_title          TEXT NOT NULL,
  interview_type     TEXT NOT NULL DEFAULT 'mixed',
  job_description    TEXT,
  round_name         TEXT,                            -- "Phone screen", "Technical", "Onsite"
  location           TEXT,                            -- room or meeting URL
  scheduled_at       DATETIME NOT NULL,               -- ISO; local start time
  duration_min       INTEGER DEFAULT 45,
  status             TEXT NOT NULL DEFAULT 'upcoming', -- upcoming|completed|cancelled
  notes              TEXT,
  additional_info    TEXT,                            -- personal context carried into a launched session
  remind_day_of      BOOLEAN DEFAULT 1,
  remind_mins_before INTEGER DEFAULT 30,              -- null/0 = off
  notified_day_of    BOOLEAN DEFAULT 0,
  notified_before    BOOLEAN DEFAULT 0,
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_resume ON interview_sessions(resume_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON interview_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_qa_session ON qa_pairs(session_id);
CREATE INDEX IF NOT EXISTS idx_qa_order ON qa_pairs(session_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_transcript_session ON transcript_chunks(session_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled ON interviews(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);
`

// Default settings seeded once (INSERT OR IGNORE keyed on the UNIQUE key column).
export const DEFAULT_SETTINGS: ReadonlyArray<readonly [string, string]> = [
  ['ai_provider', 'groq'],
  ['ai_model', 'llama-3.3-70b-versatile'],
  ['transcription_provider', 'web-speech'],
  ['groq_api_key', ''],
  ['openai_api_key', ''],
  ['anthropic_api_key', ''],
  ['answer_length', 'detailed'],
  ['auto_confirm_questions', 'false'],
  ['auto_confirm_delay_sec', '2'],
  ['theme', 'dark'],
  ['onboarding_complete', 'false'],
  ['plan', 'free'],
  ['stealth_mode_enabled', 'false'],
  ['overlay_position', 'top-right'],
  ['overlay_opacity', '0.92'],
  ['overlay_bounds', ''],
  ['interview_notes', ''],
  ['hotkey_toggle_overlay', 'CommandOrControl+Shift+H'],
  ['hotkey_copy_answer', 'CommandOrControl+Shift+C'],
  ['hotkey_toggle_stealth', 'CommandOrControl+Shift+S'],
  ['free_sessions_used', '0'],
  ['free_sessions_limit', '5'],
]

export function applySchema(db: Database.Database): void {
  db.exec(SCHEMA_SQL)
  const insert = db.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
  )
  const seed = db.transaction(() => {
    for (const [key, value] of DEFAULT_SETTINGS) insert.run(key, value)
  })
  seed()

  // Migrations: heal decommissioned Groq model on existing installs.
  db.prepare(
    "UPDATE settings SET value = 'llama-3.3-70b-versatile' WHERE key = 'ai_model' AND value = 'llama-3.1-70b-versatile'",
  ).run()

  // Additive columns (no ADD COLUMN IF NOT EXISTS in SQLite — ignore the
  // duplicate-column throw on already-migrated DBs).
  const addColumn = (sql: string) => {
    try {
      db.exec(sql)
    } catch {
      /* column already exists */
    }
  }
  addColumn('ALTER TABLE interview_sessions ADD COLUMN additional_info TEXT')
  // 0.14.0 — connect the pillars: sessions link to a tracked application; an
  // interview carries the personal context used when launching its session.
  addColumn('ALTER TABLE interview_sessions ADD COLUMN application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL')
  addColumn('ALTER TABLE interviews ADD COLUMN additional_info TEXT')
  // 0.19.0 — action-aware tracker: richer job fields + the next-action engine.
  addColumn('ALTER TABLE applications ADD COLUMN salary_range TEXT')
  addColumn('ALTER TABLE applications ADD COLUMN location TEXT')
  addColumn('ALTER TABLE applications ADD COLUMN source TEXT')
  addColumn('ALTER TABLE applications ADD COLUMN deadline DATETIME')
  addColumn('ALTER TABLE applications ADD COLUMN excitement INTEGER')
  addColumn('ALTER TABLE applications ADD COLUMN next_action TEXT')
  addColumn('ALTER TABLE applications ADD COLUMN next_action_at DATETIME')
  addColumn('ALTER TABLE applications ADD COLUMN last_activity_at DATETIME')
  addColumn('ALTER TABLE applications ADD COLUMN notified_action BOOLEAN DEFAULT 0')
}
