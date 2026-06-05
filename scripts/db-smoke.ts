// Throwaway smoke test for the data layer (build step 1).
// Bundled with esbuild and run under Electron so it exercises the actual
// Electron-ABI better-sqlite3 binary. Exits 0 on success, 1 on failure.
import { existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { initDatabase, closeDatabase } from '../src/lib/database/db'
import * as q from '../src/lib/database/queries'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error('ASSERT FAILED: ' + msg)
  console.log('  ok: ' + msg)
}

const dbPath = join(tmpdir(), `clarity-smoke-${Date.now()}.db`)

function cleanup(): void {
  closeDatabase()
  for (const f of [dbPath, dbPath + '-wal', dbPath + '-shm']) {
    if (existsSync(f)) rmSync(f, { force: true })
  }
}

try {
  initDatabase(dbPath)
  console.log('db initialized at', dbPath)

  // --- settings seeded ---
  assert(q.getSetting('plan') === 'free', "default setting plan === 'free'")
  assert(q.getSetting('free_sessions_limit') === '5', 'free_sessions_limit seeded')
  assert(q.getPlan() === 'free', 'getPlan() === free')

  // --- resume round-trip (JSON + boolean) ---
  const resume = q.createResume({
    name: 'Test Resume',
    raw_text: 'Senior engineer with 5 years experience.',
    parsed_data: {
      skills: ['React', 'Node.js', 'SQLite'],
      experience: [
        { company: 'Acme', title: 'SWE', duration: '2021-Present', bullets: ['Built X'] },
      ],
      education: [{ degree: 'BS CS', school: 'State U', year: '2019' }],
      projects: [{ name: 'Tool', description: 'A tool', technologies: ['TS'] }],
      summary: '5 yrs backend',
    },
    is_default: true,
  })
  assert(resume.id > 0, 'createResume returns id')
  const fetched = q.getResume(resume.id)
  assert(fetched !== null, 'getResume finds row')
  assert(fetched!.parsed_data.skills.length === 3, 'parsed_data JSON round-trips')
  assert(fetched!.is_default === true, 'is_default maps 1 -> true')
  assert(q.getDefaultResume()?.id === resume.id, 'getDefaultResume returns default')

  // setDefault flips exclusively
  const resume2 = q.createResume({
    raw_text: 'second',
    parsed_data: { skills: [], experience: [], education: [], projects: [], summary: '' },
  })
  q.setDefaultResume(resume2.id)
  assert(q.getDefaultResume()?.id === resume2.id, 'setDefaultResume switches default')
  assert(q.getResume(resume.id)!.is_default === false, 'previous default cleared')
  assert(q.listResumes().length === 2, 'listResumes returns 2')

  // --- session with parsed_jd JSON ---
  const session = q.createSession({
    resume_id: resume.id,
    company: 'Google',
    job_title: 'L5 SWE',
    interview_type: 'technical',
    job_description: 'Build distributed systems.',
    parsed_jd: { requirements: ['5y exp'], keywords: ['distributed'], skills: ['Go'] },
  })
  assert(session.status === 'active', 'new session is active')
  assert(q.getSession(session.id)!.parsed_jd?.keywords[0] === 'distributed', 'parsed_jd round-trips')

  // --- qa pairs: sequence + ordering + update ---
  const qa1 = q.createQAPair({ session_id: session.id, question: 'Q1?', answer: 'A1' })
  const qa2 = q.createQAPair({ session_id: session.id, question: 'Q2?', answer: 'A2' })
  assert(qa1.sequence_order === 1 && qa2.sequence_order === 2, 'sequence_order auto-increments')
  assert(q.nextSequenceOrder(session.id) === 3, 'nextSequenceOrder === 3')
  const list = q.listQAPairs(session.id)
  assert(list.length === 2 && list[0].sequence_order === 1, 'listQAPairs ordered')
  const updated = q.updateQAPair(qa1.id, { was_copied: true, user_rating: 5 })
  assert(updated!.was_copied === true && updated!.user_rating === 5, 'updateQAPair maps bool + rating')

  // --- transcript chunk ---
  const chunk = q.createTranscriptChunk({
    session_id: session.id,
    raw_text: 'Tell me about yourself',
    is_question: true,
    confidence: 0.91,
    timestamp_sec: 12,
  })
  assert(chunk.is_question === true, 'transcript is_question maps to bool')
  assert(q.listTranscriptChunks(session.id).length === 1, 'listTranscriptChunks returns 1')

  // --- endSession ---
  const ended = q.endSession(session.id, 1800, 'Good job', { matched: ['Go'], missed: ['k8s'] })
  assert(ended!.status === 'completed' && ended!.duration_sec === 1800, 'endSession completes')
  assert(ended!.keyword_matches?.missed[0] === 'k8s', 'keyword_matches round-trips')

  // --- FK cascade: deleting session removes its qa + chunks ---
  q.deleteSession(session.id)
  assert(q.listQAPairs(session.id).length === 0, 'ON DELETE CASCADE removed qa_pairs')
  assert(q.listTranscriptChunks(session.id).length === 0, 'ON DELETE CASCADE removed chunks')

  // --- settings upsert + counter ---
  q.setSetting('theme', 'light')
  assert(q.getSetting('theme') === 'light', 'setSetting upserts')
  assert(q.incrementFreeSessionsUsed() === 1, 'incrementFreeSessionsUsed 0 -> 1')
  assert(q.getFreeSessionsUsed() === 1, 'getFreeSessionsUsed === 1')

  console.log('\nSMOKE TEST PASSED')
  cleanup()
  process.exit(0)
} catch (err) {
  console.error('\nSMOKE TEST FAILED:', (err as Error).message)
  cleanup()
  process.exit(1)
}
