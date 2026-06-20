import type {
  Application,
  ExtractedJob,
  Interview,
  InterviewSession,
  KeywordMatches,
  NewApplication,
  NewInterview,
  NewInterviewSession,
  NewQAPair,
  NewResume,
  NewTranscriptChunk,
  ParsedResumeData,
  QAPair,
  Resume,
  TranscriptChunk,
  UpdateApplication,
  UpdateInterview,
  UpdateInterviewSession,
  UpdateQAPair,
} from './types'

// Result of parsing a resume file or pasted text (electron/ipc-handlers.ts).
export interface ParsedResume {
  raw_text: string
  parsed_data: ParsedResumeData
}

export interface ClarityParserApi {
  parseFile(fileName: string, bytes: Uint8Array): Promise<ParsedResume>
  parseText(text: string): Promise<ParsedResume>
}

export type AnswerLength = 'concise' | 'detailed' | 'comprehensive'

export interface GenerateAnswerInput {
  question: string
  resume: ParsedResumeData
  session: InterviewSession
  previousQA?: { q: string; a: string }[]
  answerLength?: AnswerLength
  candidate?: { preferredName?: string; pronouns?: string; age?: number }
}

export interface GenerateReportInput {
  session: InterviewSession
  resume: ParsedResumeData
  qaPairs: QAPair[]
}

export interface ClarityAiApi {
  generateAnswer(input: GenerateAnswerInput): Promise<string>
  streamAnswer(input: GenerateAnswerInput, onToken: (token: string) => void): Promise<string>
  // Coding-interview solver: stream a solution from a screenshot data URL.
  solveScreenshot(imageDataUrl: string, onToken: (token: string) => void): Promise<string>
  cancelStream(): Promise<void>
  generateReport(input: GenerateReportInput): Promise<string>
  testConnection(override?: {
    provider?: string
    apiKey?: string
    model?: string
    baseUrl?: string
  }): Promise<{ ok: boolean; error?: string }>
  transcribe(audio: Uint8Array): Promise<string>
  listOllamaModels(baseUrl?: string): Promise<string[]>
  generateQuestions(input: {
    resume: ParsedResumeData
    session: InterviewSession
  }): Promise<string[]>
  analyzeFit(input: ApplyInput): Promise<string>
  draftCoverLetter(input: ApplyInput): Promise<string>
  structureResume(rawText: string): Promise<ParsedResumeData>
  extractJob(postingText: string): Promise<ExtractedJob>
}

export interface ApplyInput {
  resume: ParsedResumeData
  company: string
  jobTitle: string
  jobDescription: string
}

// Shape of `window.db`, exposed by electron/preload.ts and backed by
// electron/ipc-handlers.ts. Every call crosses IPC, so all results are Promises.
export interface ClarityDbApi {
  resume: {
    create(input: NewResume): Promise<Resume>
    get(id: number): Promise<Resume | null>
    list(): Promise<Resume[]>
    getDefault(): Promise<Resume | null>
    setDefault(id: number): Promise<void>
    update(id: number, patch: Partial<NewResume>): Promise<Resume | null>
    delete(id: number): Promise<void>
  }
  session: {
    create(input: NewInterviewSession): Promise<InterviewSession>
    get(id: number): Promise<InterviewSession | null>
    list(): Promise<InterviewSession[]>
    listByResume(resumeId: number): Promise<InterviewSession[]>
    listByApplication(applicationId: number): Promise<InterviewSession[]>
    update(id: number, patch: UpdateInterviewSession): Promise<InterviewSession | null>
    end(
      id: number,
      durationSec: number,
      report?: string | null,
      keywords?: KeywordMatches | null,
    ): Promise<InterviewSession | null>
    delete(id: number): Promise<void>
  }
  qa: {
    create(input: NewQAPair): Promise<QAPair>
    list(sessionId: number): Promise<QAPair[]>
    update(id: number, patch: UpdateQAPair): Promise<QAPair | null>
    nextSequence(sessionId: number): Promise<number>
  }
  transcript: {
    create(input: NewTranscriptChunk): Promise<TranscriptChunk>
    list(sessionId: number): Promise<TranscriptChunk[]>
  }
  settings: {
    get(key: string): Promise<string | null>
    getAll(): Promise<Record<string, string | null>>
    set(key: string, value: string | null): Promise<void>
    getPlan(): Promise<string>
    getFreeSessionsUsed(): Promise<number>
    incrementFreeSessionsUsed(): Promise<number>
  }
  application: {
    create(input: NewApplication): Promise<Application>
    get(id: number): Promise<Application | null>
    upsertForJob(input: {
      company: string
      job_title: string
      job_description?: string | null
    }): Promise<Application>
    list(): Promise<Application[]>
    listWithActions(): Promise<Application[]>
    update(id: number, patch: UpdateApplication): Promise<Application | null>
    delete(id: number): Promise<void>
  }
  interview: {
    create(input: NewInterview): Promise<Interview>
    get(id: number): Promise<Interview | null>
    list(): Promise<Interview[]>
    update(id: number, patch: UpdateInterview): Promise<Interview | null>
    delete(id: number): Promise<void>
  }
}

export interface ClarityStealthApi {
  enable(): Promise<void>
  disable(): Promise<void>
  status(): Promise<boolean>
  // Subscribe to real stealth-state changes (from any window); returns unsubscribe.
  onChange(cb: (active: boolean) => void): () => void
}

export interface LicenseResult {
  valid: boolean
  email?: string
  plan?: string
  expires?: number | null
  error?: string
}

export interface ClarityLicenseApi {
  activate(key: string): Promise<LicenseResult>
  status(): Promise<LicenseResult>
  deactivate(): Promise<void>
}

export interface ClarityAppApi {
  openExternal(url: string): Promise<void>
  logError(scope: string, message: string): Promise<void>
  openLogs(): Promise<void>
  // Subscribe to reminder-toast clicks; returns an unsubscribe fn.
  onInterviewNavigate(cb: (id: number) => void): () => void
  onApplicationNavigate(cb: (id: number) => void): () => void
  // Fired in the main window when the Focus overlay closes.
  onSessionRefresh(cb: () => void): () => void
  // Relay a changed setting to every other window (live cross-window sync).
  broadcastSetting(key: string, value: string | null): Promise<void>
  onSettingChanged(cb: (change: { key: string; value: string | null }) => void): () => void
}

// Focus overlay (stealth surface) controls.
export interface ClarityOverlayApi {
  open(): Promise<void>
  close(): Promise<void>
  isOpen(): Promise<boolean>
  setOpacity(value: number): Promise<void>
  setAlwaysOnTop(on: boolean): Promise<void>
  adjustWidth(delta: number): Promise<void>
  // Capture the primary screen as a PNG data URL (for the coding solver).
  captureScreen(): Promise<string | null>
}

export interface UpdaterEvent {
  type: 'checking' | 'available' | 'not-available' | 'progress' | 'downloaded' | 'error'
  payload?: { version?: string; percent?: number; message?: string }
}

export interface ClarityUpdaterApi {
  check(): Promise<void>
  download(): Promise<void>
  install(): Promise<void>
  // Subscribe to updater lifecycle events; returns an unsubscribe fn.
  onEvent(cb: (e: UpdaterEvent) => void): () => void
}

declare global {
  // Injected at build time by Vite `define` (see vite.config.ts).
  const __APP_VERSION__: string
  interface Window {
    db: ClarityDbApi
    parser: ClarityParserApi
    ai: ClarityAiApi
    stealth: ClarityStealthApi
    license: ClarityLicenseApi
    app: ClarityAppApi
    updater: ClarityUpdaterApi
    overlay: ClarityOverlayApi
  }
}
