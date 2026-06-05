// Throwaway smoke for plan-limit gates (build step 8a). Pure, node via tsx.
import { checkSessionLimit, canAddResume, checkFeatureAccess } from '../src/lib/plan'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error('ASSERT FAILED: ' + msg)
  console.log('  ok: ' + msg)
}

assert(checkSessionLimit(4, 'free') === true, 'free 4/5 allowed')
assert(checkSessionLimit(5, 'free') === false, 'free 5/5 blocked')
assert(checkSessionLimit(99, 'premium') === true, 'premium unlimited')
assert(canAddResume(0, 'free') === true, 'free first resume allowed')
assert(canAddResume(1, 'free') === false, 'free second resume blocked')
assert(canAddResume(5, 'premium') === true, 'premium resumes unlimited')
assert(checkFeatureAccess('autoListenEnabled', 'free') === false, 'free no auto-listen')
assert(checkFeatureAccess('autoListenEnabled', 'premium') === true, 'premium auto-listen')

console.log('\nLIMIT SMOKE TEST PASSED')
