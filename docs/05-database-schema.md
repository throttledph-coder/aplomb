DATABASE SCHEMA
Complete Schema
SQL

-- =============================================
-- RESUMES
-- =============================================
CREATE TABLE resumes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL DEFAULT 'My Resume',
  file_name       TEXT,                    -- Original filename
  file_path       TEXT,                    -- Path to stored file
  raw_text        TEXT NOT NULL,           -- Full extracted text
  parsed_data     TEXT NOT NULL,           -- JSON: skills, experience, education, projects
  is_default      BOOLEAN DEFAULT FALSE,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- parsed_data JSON structure:
-- {
--   "skills": ["React", "Node.js", "Python"],
--   "experience": [
--     {
--       "company": "Acme Corp",
--       "title": "Senior Software Engineer",
--       "duration": "2021 - Present",
--       "bullets": ["Led migration of...", "Reduced latency by..."]
--     }
--   ],
--   "education": [
--     { "degree": "BS Computer Science", "school": "State University", "year": "2019" }
--   ],
--   "projects": [
--     { "name": "Open Source Tool", "description": "...", "technologies": ["React"] }
--   ],
--   "summary": "5 years of experience in backend..."
-- }

-- =============================================
-- INTERVIEW SESSIONS
-- =============================================
CREATE TABLE interview_sessions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  resume_id         INTEGER NOT NULL REFERENCES resumes(id),
  session_name      TEXT,                  -- Auto-generated: "Google L5 SWE - Nov 12"
  company           TEXT NOT NULL,
  job_title         TEXT NOT NULL,
  interview_type    TEXT NOT NULL DEFAULT 'mixed',
  -- types: 'technical', 'behavioral', 'mixed', 'system_design', 'other'
  job_description   TEXT NOT NULL,         -- Full pasted job description
  parsed_jd         TEXT,                  -- JSON: key requirements, keywords, skills
  status            TEXT NOT NULL DEFAULT 'active',
  -- status: 'active', 'completed'
  duration_sec      INTEGER DEFAULT 0,
  started_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at          DATETIME,
  coaching_report   TEXT,                  -- AI-generated end-of-session report
  keyword_matches   TEXT,                  -- JSON: matched and missed keywords
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- QUESTIONS AND ANSWERS
-- =============================================
CREATE TABLE qa_pairs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id      INTEGER NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  question        TEXT NOT NULL,           -- The interview question
  question_source TEXT NOT NULL DEFAULT 'manual',
  -- source: 'manual' (typed by user) or 'auto-listen' (caught by mic)
  answer          TEXT NOT NULL,           -- The AI-generated answer
  answer_version  INTEGER DEFAULT 1,       -- Increments on regenerate
  prompt_used     TEXT,                    -- Full prompt sent to AI (for debugging)
  model_used      TEXT,                    -- e.g., 'groq/llama-3.1-70b'
  latency_ms      INTEGER,                 -- API response time
  was_copied      BOOLEAN DEFAULT FALSE,
  user_rating     INTEGER,                 -- 1-5 or NULL
  sequence_order  INTEGER NOT NULL,        -- 1, 2, 3... order in session
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TRANSCRIPT CHUNKS (Premium Auto-Listen)
-- =============================================
CREATE TABLE transcript_chunks (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id        INTEGER NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  raw_text          TEXT NOT NULL,         -- Raw transcription
  is_question       BOOLEAN DEFAULT FALSE, -- Did filter classify this as a question?
  was_used          BOOLEAN DEFAULT FALSE, -- Was this used to trigger Q&A?
  filter_reason     TEXT,                  -- Why it was filtered (if filtered)
  confidence        REAL,                  -- Whisper confidence 0-1
  timestamp_sec     INTEGER NOT NULL,      -- Seconds from session start
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- SETTINGS
-- =============================================
CREATE TABLE settings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  key         TEXT NOT NULL UNIQUE,
  value       TEXT,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default settings:
INSERT INTO settings (key, value) VALUES
  ('ai_provider', 'groq'),
  ('ai_model', 'llama-3.1-70b-versatile'),
  ('transcription_provider', 'web-speech'),
  ('groq_api_key', ''),
  ('openai_api_key', ''),
  ('anthropic_api_key', ''),
  ('answer_length', 'detailed'),
  ('auto_confirm_questions', 'false'),
  ('auto_confirm_delay_sec', '2'),
  ('theme', 'dark'),
  ('onboarding_complete', 'false'),
  ('plan', 'free'),
  ('stealth_mode_enabled', 'false'),
  ('overlay_position', 'top-right'),
  ('overlay_opacity', '0.92'),
  ('hotkey_toggle_overlay', 'CommandOrControl+Shift+H'),
  ('hotkey_copy_answer', 'CommandOrControl+Shift+C'),
  ('hotkey_toggle_stealth', 'CommandOrControl+Shift+S'),
  ('free_sessions_used', '0'),
  ('free_sessions_limit', '5');

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_sessions_resume ON interview_sessions(resume_id);
CREATE INDEX idx_sessions_started ON interview_sessions(started_at);
CREATE INDEX idx_qa_session ON qa_pairs(session_id);
CREATE INDEX idx_qa_order ON qa_pairs(session_id, sequence_order);
CREATE INDEX idx_transcript_session ON transcript_chunks(session_id);