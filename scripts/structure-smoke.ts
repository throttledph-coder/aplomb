// Throwaway smoke for parseStructuredResume (batch-1). Pure, node via tsx.
import { parseStructuredResume } from '../src/lib/prompts/resume-structure-prompt'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error('ASSERT FAILED: ' + msg)
  console.log('  ok: ' + msg)
}

const good = `Here is the JSON:
{"summary":"Senior support engineer.","skills":["Troubleshooting","Networking"],
"experience":[{"title":"Technical Support","company":"Foundever","duration":"Nov 2022 - Present","bullets":["Resolved modem/router issues"]}],
"education":[{"degree":"BS Computer Science","school":"State U","year":"2019"}],
"projects":[]}`
const p = parseStructuredResume(good)
assert(p.summary.includes('support'), 'summary parsed')
assert(p.skills.length === 2, 'skills parsed')
assert(p.experience[0].company === 'Foundever' && p.experience[0].title === 'Technical Support', 'experience title/company correct')
assert(p.education[0].year === '2019', 'education parsed')

const junk = parseStructuredResume('no json here at all')
assert(junk.skills.length === 0 && junk.experience.length === 0, 'junk -> empty, no throw')

const partial = parseStructuredResume('{"skills":["X"],"experience":"notarray"}')
assert(partial.skills.length === 1 && partial.experience.length === 0, 'shape-guards bad fields')

console.log('\nSTRUCTURE SMOKE TEST PASSED')
