/* Manual answer-quality eval runner (free — uses your own Groq key).
 * Usage:  GROQ_API_KEY=gsk_... npm run eval
 * No key → prints a hint and exits 0. Generates an answer per fixture, scores it
 * with the pure rubric, and prints a table + average. No DB / electron needed.
 */
import { GroqProvider } from '../src/lib/providers/ai/groq'
import { CORE_SYSTEM_PROMPT } from '../src/lib/prompts/system-prompt'
import { buildAnswerPrompt } from '../src/lib/prompts/answer-prompt'
import { scoreAnswer } from '../src/lib/eval/answer-scorer'
import { FIXTURES } from '../src/lib/eval/fixtures'

async function main() {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    console.log('No GROQ_API_KEY set. Run:  GROQ_API_KEY=gsk_... npm run eval')
    return
  }
  const model = process.env.EVAL_MODEL || 'llama-3.3-70b-versatile'
  const provider = new GroqProvider({ apiKey, model })

  console.log(`\nAnswer-quality eval — model: ${model}\n`)
  let total = 0
  for (const fx of FIXTURES) {
    const user = buildAnswerPrompt(fx.question, fx.resumeContext, fx.jobContext, [], fx.length)
    let answer = ''
    try {
      answer = await provider.complete({ system: CORE_SYSTEM_PROMPT, user })
    } catch (err) {
      console.log(`✖ ${fx.name}: generation failed — ${(err as Error).message}`)
      continue
    }
    const r = scoreAnswer(answer, { question: fx.question, length: fx.length, jd: fx.jobContext })
    total += r.score
    const flags = r.flags.length ? r.flags.join(', ') : 'none'
    console.log(
      `• ${fx.name.padEnd(22)} score ${r.score.toFixed(2)}  words ${String(r.words).padStart(3)}  flags: ${flags}`,
    )
  }
  console.log(`\nAverage score: ${(total / FIXTURES.length).toFixed(2)}\n`)
}

void main()
