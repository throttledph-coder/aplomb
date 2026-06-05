// Throwaway smoke for the auto-listen question filter (build step 6a). Pure, node via tsx.
import { detectQuestion } from '../src/lib/audio/question-filter'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error('ASSERT FAILED: ' + msg)
  console.log('  ok: ' + msg)
}

const QUESTIONS = [
  'Can you walk me through a time you designed a system at scale?',
  'What is your greatest weakness as an engineer?',
  'Tell me about a project you are proud of.',
  'Why do you want to work at Google?',
  'How would you handle a disagreement with your manager?',
  'Describe your experience with distributed systems.',
  'Do you have experience leading a team before?',
]

const NOT_QUESTIONS = [
  'yeah',
  'um',
  'okay',
  'right, got it',
  'so',
  'uh huh',
  'mm hmm',
  'I see what you mean', // 5 words but no question pattern
  'that makes sense to me', // statement
]

let pass = 0
for (const q of QUESTIONS) {
  const r = detectQuestion(q)
  assert(r.isQuestion === true, `Q -> isQuestion: "${q.slice(0, 40)}"`)
  pass++
}
for (const s of NOT_QUESTIONS) {
  const r = detectQuestion(s)
  assert(r.isQuestion === false, `not-Q (${r.reason}): "${s}"`)
  pass++
}

// reason checks
assert(detectQuestion('yeah').reason === 'too_short', 'short filler -> too_short')
assert(
  detectQuestion('the system processes many requests daily').reason === 'no_question_pattern',
  'statement -> no_question_pattern',
)

console.log(`\nFILTER SMOKE TEST PASSED (${pass} phrases)`)
