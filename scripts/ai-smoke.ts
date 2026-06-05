// Throwaway smoke test for AI providers + prompts (build step 3).
// Runs under Electron so the DB-backed factory + provider classes are real.
import { existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { initDatabase, closeDatabase } from '../src/lib/database/db'
import { setSetting } from '../src/lib/database/queries'
import { buildResumeContext } from '../src/lib/prompts/resume-context'
import { buildJobContext } from '../src/lib/prompts/jd-context'
import { buildAnswerPrompt } from '../src/lib/prompts/answer-prompt'
import { buildReportPrompt } from '../src/lib/prompts/report-prompt'
import { getAIProvider } from '../src/lib/providers'
import { OllamaProvider } from '../src/lib/providers/ai/ollama'
import type { InterviewSession, ParsedResumeData, QAPair } from '../src/types'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error('ASSERT FAILED: ' + msg)
  console.log('  ok: ' + msg)
}

const resume: ParsedResumeData = {
  skills: ['TypeScript', 'React', 'PostgreSQL'],
  experience: [
    { company: 'Acme Corp', title: 'Senior Engineer', duration: '2021-Present', bullets: ['Cut latency 40%'] },
  ],
  education: [{ degree: 'BS CS', school: 'State University', year: '2018' }],
  projects: [{ name: 'Tool', description: 'A CLI', technologies: ['Node.js'] }],
  summary: 'Senior engineer, 6 years building web platforms.',
}

const session: InterviewSession = {
  id: 1,
  resume_id: 1,
  session_name: null,
  company: 'Globex',
  job_title: 'Staff Engineer',
  interview_type: 'technical',
  job_description: 'Design distributed systems with Go and Kubernetes.',
  parsed_jd: null,
  status: 'active',
  duration_sec: 1800,
  started_at: '',
  ended_at: null,
  coaching_report: null,
  keyword_matches: null,
  created_at: '',
}

const dbPath = join(tmpdir(), `clarity-ai-smoke-${Date.now()}.db`)
function cleanup(): void {
  closeDatabase()
  for (const f of [dbPath, dbPath + '-wal', dbPath + '-shm']) {
    if (existsSync(f)) rmSync(f, { force: true })
  }
}

async function main(): Promise<void> {
  // ---- prompt builders (pure) ----
  const resumeCtx = buildResumeContext(resume)
  const jobCtx = buildJobContext(session)
  assert(resumeCtx.includes('Senior engineer, 6 years'), 'resume context has summary')
  assert(resumeCtx.includes('TypeScript'), 'resume context has skills')
  assert(jobCtx.includes('Globex') && jobCtx.includes('Staff Engineer'), 'job context has role/company')

  const answerPrompt = buildAnswerPrompt(
    'Tell me about a hard bug you fixed.',
    resumeCtx,
    jobCtx,
    [{ q: 'Intro?', a: 'I am a senior engineer who...' }],
    'concise',
  )
  assert(answerPrompt.includes('Tell me about a hard bug'), 'answer prompt has the question')
  assert(answerPrompt.includes('Globex'), 'answer prompt injects JD')
  assert(answerPrompt.includes('~45 seconds'), 'answer prompt uses concise length')
  assert(answerPrompt.includes('PREVIOUS Q&A'), 'answer prompt includes previous Q&A')

  const qaPairs: QAPair[] = [
    {
      id: 1, session_id: 1, question: 'Why distributed systems?', question_source: 'manual',
      answer: 'Because scale.', answer_version: 1, prompt_used: null, model_used: null,
      latency_ms: null, was_copied: false, user_rating: null, sequence_order: 1, created_at: '',
    },
  ]
  const reportPrompt = buildReportPrompt({ resumeContext: resumeCtx, session, qaPairs, durationMin: 30 })
  assert(reportPrompt.includes('Why distributed systems?'), 'report prompt has Q&A log')
  assert(reportPrompt.includes('## JD Keyword Analysis'), 'report prompt has sections')

  // ---- factory selection (DB-backed) ----
  initDatabase(dbPath)
  setSetting('ai_provider', 'ollama')
  assert(getAIProvider().name === 'ollama', 'factory selects ollama from settings')
  setSetting('ai_provider', 'groq')
  assert(getAIProvider().name === 'groq', 'factory selects groq from settings')
  assert(getAIProvider({ provider: 'ollama' }).name === 'ollama', 'override bypasses settings')

  // ---- ollama running-check (deterministic; ollama is down this session) ----
  const conn = await new OllamaProvider().testConnection()
  console.log('  ollama testConnection:', JSON.stringify(conn))
  assert(typeof conn.ok === 'boolean', 'testConnection returns a boolean ok')
  if (!conn.ok) assert(/not running|responded/i.test(conn.error ?? ''), 'clear not-running message')

  // ---- optional live generation ----
  if (conn.ok) {
    const text = await new OllamaProvider().complete({ system: 'Reply briefly.', user: 'Say OK.' })
    assert(text.length > 0, 'live ollama completion non-empty')
  } else if (process.env.GROQ_API_KEY) {
    const { GroqProvider } = await import('../src/lib/providers/ai/groq')
    const text = await new GroqProvider({ apiKey: process.env.GROQ_API_KEY }).complete({
      system: 'Reply briefly.', user: 'Say OK.',
    })
    assert(text.length > 0, 'live groq completion non-empty')
  } else {
    console.log('  (live generation skipped — no Ollama running, no GROQ_API_KEY)')
  }

  console.log('\nAI SMOKE TEST PASSED')
}

main().then(
  () => { cleanup(); process.exit(0) },
  (err) => { console.error('\nAI SMOKE TEST FAILED:', (err as Error).message); cleanup(); process.exit(1) },
)
