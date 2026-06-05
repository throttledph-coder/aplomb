import type { AnswerLength } from '../providers/types'

// Small reference dataset for the manual eval runner (scripts/eval.ts).
// Plain context strings — no DB / electron needed.
export interface EvalFixture {
  name: string
  resumeContext: string
  jobContext: string
  question: string
  length: AnswerLength
}

export const FIXTURES: EvalFixture[] = [
  {
    name: 'behavioral-escalation',
    resumeContext:
      'CANDIDATE: Customer support professional, 4 years. Skills: troubleshooting, billing, ' +
      'de-escalation, Zendesk. Handled refunds, account issues, and SLA-bound tickets.',
    jobContext:
      'TARGET ROLE: Senior Support Specialist at a SaaS company. Needs strong de-escalation, ' +
      'ownership, and clear written communication.',
    question: 'Tell me about a time you resolved a difficult customer escalation.',
    length: 'detailed',
  },
  {
    name: 'strength-weakness',
    resumeContext: 'CANDIDATE: Frontend engineer, React + TypeScript, 3 years, shipped 2 products.',
    jobContext: 'TARGET ROLE: Frontend Engineer building dashboards in React.',
    question: 'What is your greatest weakness and how do you manage it?',
    length: 'concise',
  },
  {
    name: 'technical-tradeoff',
    resumeContext: 'CANDIDATE: Backend engineer, Node.js, Postgres, designed REST + queue systems.',
    jobContext: 'TARGET ROLE: Backend Engineer scaling an API platform.',
    question: 'How would you design a rate limiter for a public API, and what tradeoffs matter?',
    length: 'comprehensive',
  },
  {
    name: 'motivation',
    resumeContext: 'CANDIDATE: Career-changer into data analysis; SQL, Python, dashboards.',
    jobContext: 'TARGET ROLE: Data Analyst supporting a marketing team.',
    question: 'Why are you interested in this role and our company?',
    length: 'concise',
  },
  {
    name: 'conflict',
    resumeContext: 'CANDIDATE: Product manager, led cross-functional teams, shipped roadmap items.',
    jobContext: 'TARGET ROLE: Product Manager owning a B2B product line.',
    question: 'Describe a disagreement with an engineer and how you handled it.',
    length: 'detailed',
  },
]
