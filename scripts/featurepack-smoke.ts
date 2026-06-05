// Throwaway smoke for step-10 pure helpers. node via tsx.
import { parseQuestionList } from '../src/lib/prompts/questions-prompt'
import { parseExport } from '../src/lib/backup'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error('ASSERT FAILED: ' + msg)
  console.log('  ok: ' + msg)
}

// --- parseQuestionList ---
const ql = parseQuestionList('1. What is your weakness?\n2) Tell me about a time...\n- Why this role?\n\nWhat is your weakness?')
console.log('  questions:', JSON.stringify(ql))
assert(ql.length === 3, 'strips numbering/bullets + dedupes (3 unique)')
assert(ql[0] === 'What is your weakness?', 'numbering stripped')
assert(ql[2] === 'Why this role?', 'bullet stripped')
assert(parseQuestionList('a\nb\nc').length === 0, 'drops too-short lines')

// --- parseExport ---
const valid = JSON.stringify({
  resumes: [{ id: 1, name: 'R', parsed_data: { skills: [] } }],
  sessions: [{ id: 5, resume_id: 1, company: 'X' }],
  qa: { '5': [{ id: 9, question: 'Q', answer: 'A' }] },
})
const parsed = parseExport(valid)
assert(parsed.resumes.length === 1 && parsed.sessions.length === 1, 'parses resumes + sessions')
assert(parsed.qa['5'].length === 1, 'parses qa map')

let threw = false
try {
  parseExport('{"nope":true}')
} catch {
  threw = true
}
assert(threw, 'rejects malformed export')

let threw2 = false
try {
  parseExport('not json')
} catch {
  threw2 = true
}
assert(threw2, 'rejects non-JSON')

console.log('\nFEATUREPACK SMOKE TEST PASSED')
