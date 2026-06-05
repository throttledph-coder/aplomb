// Throwaway smoke for the JD keyword analysis (build step 4e). Pure, node via tsx.
import { extractKeywords, analyzeKeywords } from '../src/lib/keywords'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error('ASSERT FAILED: ' + msg)
  console.log('  ok: ' + msg)
}

const JD =
  'Design distributed systems with Kubernetes and Terraform. Strong Python experience required.'
const ANSWERS = 'I built distributed systems in Python at scale.'

const kws = extractKeywords(JD)
console.log('  keywords:', kws.join(', '))
assert(kws.includes('Kubernetes') && kws.includes('Python'), 'extractKeywords finds tech terms')
assert(!kws.includes('Strong') && !kws.includes('experience'), 'stopwords excluded')

const km = analyzeKeywords(JD, ANSWERS)
console.log('  matched:', km.matched.join(', '))
console.log('  missed:', km.missed.join(', '))
assert(
  km.matched.includes('distributed') && km.matched.includes('Python') && km.matched.includes('systems'),
  'matched keywords detected in answers',
)
assert(km.missed.includes('Kubernetes') && km.missed.includes('Terraform'), 'missed keywords detected')

console.log('\nKEYWORD SMOKE TEST PASSED')
