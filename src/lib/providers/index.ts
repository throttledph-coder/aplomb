import type { ExtractedJob, InterviewSession, ParsedResumeData, QAPair } from '../../types'
import { getSetting } from '../database/queries'
import { buildResumeContext } from '../prompts/resume-context'
import { buildJobContext } from '../prompts/jd-context'
import { buildAnswerPrompt, type PreviousQA, type CandidateContext } from '../prompts/answer-prompt'
import { buildReportPrompt } from '../prompts/report-prompt'
import { buildQuestionsPrompt, parseQuestionList } from '../prompts/questions-prompt'
import {
  buildResumeStructurePrompt,
  parseStructuredResume,
} from '../prompts/resume-structure-prompt'
import {
  FIT_SYSTEM_PROMPT,
  COVER_LETTER_SYSTEM_PROMPT,
  buildGapPrompt,
  buildCoverLetterPrompt,
} from '../prompts/apply-prompts'
import {
  EXTRACT_JOB_SYSTEM_PROMPT,
  buildExtractJobPrompt,
} from '../prompts/extract-job-prompt'
import { CORE_SYSTEM_PROMPT, REPORT_SYSTEM_PROMPT } from '../prompts/system-prompt'
import { SOLVE_SYSTEM_PROMPT, buildSolvePrompt } from '../prompts/solve-prompt'
import { languageLabel, isFixedLanguage } from '../i18n/languages'
import { GroqProvider } from './ai/groq'
import { OllamaProvider } from './ai/ollama'
import { GroqWhisperTranscriber } from './transcription/groq-whisper'
import type { AIProvider, AnswerLength, ConnectionResult } from './types'

// CLAUDE.md: this factory is the ONLY entry point to AI providers.

export interface ProviderOverride {
  provider?: string
  apiKey?: string
  model?: string
  baseUrl?: string
}

export function getAIProvider(override: ProviderOverride = {}): AIProvider {
  const provider = override.provider ?? getSetting('ai_provider') ?? 'groq'
  if (provider === 'ollama') {
    return new OllamaProvider({
      model: override.model ?? getSetting('ollama_model') ?? undefined,
      baseUrl: override.baseUrl ?? getSetting('ollama_base_url') ?? undefined,
    })
  }
  // default: groq
  const apiKey = override.apiKey ?? getSetting('groq_api_key') ?? ''
  const model = override.model ?? getSetting('ai_model') ?? undefined
  return new GroqProvider({ apiKey, model })
}

function resolveLength(length?: AnswerLength): AnswerLength {
  if (length) return length
  const s = getSetting('answer_length')
  if (s === 'concise' || s === 'detailed' || s === 'comprehensive') return s
  return 'detailed'
}

// The interview language (one setting drives both transcription + answers).
// Returns a human label to write answers in, or undefined for 'auto' (match the
// question's own language).
function resolveAnswerLanguage(): string | undefined {
  const code = getSetting('interview_language')
  return isFixedLanguage(code) ? languageLabel(code) : undefined
}

export interface GenerateAnswerInput {
  question: string
  resume: ParsedResumeData
  session: InterviewSession
  previousQA?: PreviousQA[]
  answerLength?: AnswerLength
  candidate?: CandidateContext
}

function buildAnswerUserPrompt(input: GenerateAnswerInput): string {
  return buildAnswerPrompt(
    input.question,
    buildResumeContext(input.resume),
    buildJobContext(input.session),
    input.previousQA ?? [],
    resolveLength(input.answerLength),
    input.candidate,
    resolveAnswerLanguage(),
  )
}

export async function generateAnswer(input: GenerateAnswerInput): Promise<string> {
  return getAIProvider().complete({
    system: CORE_SYSTEM_PROMPT,
    user: buildAnswerUserPrompt(input),
  })
}

export async function streamAnswer(
  input: GenerateAnswerInput,
  onToken: (token: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  return getAIProvider().stream(
    { system: CORE_SYSTEM_PROMPT, user: buildAnswerUserPrompt(input) },
    onToken,
    signal,
  )
}

// Groq vision model for the coding-interview "solve from screenshot" feature.
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

// Stream a coding-interview solution from a screenshot of the candidate's screen.
// Vision needs Groq, so this always uses the saved Groq key + a vision model (the
// chosen AI provider/model for text answers is independent).
export async function solveScreenshot(
  imageDataUrl: string,
  onToken: (token: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const apiKey = getSetting('groq_api_key') ?? ''
  const provider = new GroqProvider({ apiKey, model: VISION_MODEL })
  return provider.stream(
    {
      system: SOLVE_SYSTEM_PROMPT,
      user: buildSolvePrompt(resolveAnswerLanguage()),
      images: [imageDataUrl],
    },
    onToken,
    signal,
  )
}

export interface GenerateReportInput {
  session: InterviewSession
  resume: ParsedResumeData
  qaPairs: QAPair[]
}

export async function generateReport(input: GenerateReportInput): Promise<string> {
  const userPrompt = buildReportPrompt({
    resumeContext: buildResumeContext(input.resume),
    session: input.session,
    qaPairs: input.qaPairs,
    durationMin: Math.max(1, Math.round(input.session.duration_sec / 60)),
  })
  return getAIProvider().complete({ system: REPORT_SYSTEM_PROMPT, user: userPrompt })
}

export function testConnection(override?: ProviderOverride): Promise<ConnectionResult> {
  return getAIProvider(override ?? {}).testConnection()
}

// Premium transcription (Groq Whisper) — uses the saved Groq key and the chosen
// interview language ('auto' → Whisper auto-detects).
export function transcribe(audio: Uint8Array): Promise<string> {
  const apiKey = getSetting('groq_api_key') ?? ''
  const language = getSetting('interview_language') ?? 'auto'
  return new GroqWhisperTranscriber(apiKey).transcribe(audio, language)
}

// List locally-installed Ollama models (free, local).
export function listOllamaModels(baseUrl?: string): Promise<string[]> {
  return new OllamaProvider({
    baseUrl: baseUrl ?? getSetting('ollama_base_url') ?? undefined,
  }).listModels()
}

export interface GenerateQuestionsInput {
  resume: ParsedResumeData
  session: InterviewSession
}

export async function generateQuestions(input: GenerateQuestionsInput): Promise<string[]> {
  const userPrompt = buildQuestionsPrompt(
    buildResumeContext(input.resume),
    buildJobContext(input.session),
  )
  const raw = await getAIProvider().complete({
    system: 'You are an expert interviewer. Output only the questions, one per line.',
    user: userPrompt,
  })
  return parseQuestionList(raw)
}

// Application Assistant: resume↔JD fit/gap analysis + cover letter.
export interface ApplyInput {
  resume: ParsedResumeData
  company: string
  jobTitle: string
  jobDescription: string
}

export function analyzeFit(input: ApplyInput): Promise<string> {
  return getAIProvider().complete({
    system: FIT_SYSTEM_PROMPT,
    user: buildGapPrompt(buildResumeContext(input.resume), input.jobDescription),
  })
}

export function draftCoverLetter(input: ApplyInput): Promise<string> {
  return getAIProvider().complete({
    system: COVER_LETTER_SYSTEM_PROMPT,
    user: buildCoverLetterPrompt(
      buildResumeContext(input.resume),
      input.company,
      input.jobTitle,
      input.jobDescription,
    ),
  })
}

// Paste-to-add: extract structured fields from a pasted job posting. On any
// parse failure, fall back to dumping the raw text into job_description so the
// user never loses what they pasted.
export async function extractJob(postingText: string): Promise<ExtractedJob> {
  const fallback: ExtractedJob = {
    company: '',
    job_title: '',
    location: null,
    salary_range: null,
    job_description: postingText.trim(),
  }
  try {
    const out = await getAIProvider().complete({
      system: EXTRACT_JOB_SYSTEM_PROMPT,
      user: buildExtractJobPrompt(postingText),
    })
    const match = out.match(/\{[\s\S]*\}/)
    if (!match) return fallback
    const parsed = JSON.parse(match[0]) as Partial<ExtractedJob>
    return {
      company: typeof parsed.company === 'string' ? parsed.company : '',
      job_title: typeof parsed.job_title === 'string' ? parsed.job_title : '',
      location: typeof parsed.location === 'string' && parsed.location ? parsed.location : null,
      salary_range:
        typeof parsed.salary_range === 'string' && parsed.salary_range
          ? parsed.salary_range
          : null,
      job_description:
        typeof parsed.job_description === 'string' && parsed.job_description.trim()
          ? parsed.job_description
          : fallback.job_description,
    }
  } catch {
    return fallback
  }
}

// AI resume structuring (fix bad heuristic parses).
export async function structureResume(rawText: string): Promise<ParsedResumeData> {
  const out = await getAIProvider().complete({
    system: 'You convert resumes into strict JSON. Output only JSON.',
    user: buildResumeStructurePrompt(rawText),
  })
  return parseStructuredResume(out)
}

export type { AIProvider } from './types'
