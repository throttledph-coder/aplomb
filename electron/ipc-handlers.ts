import { ipcMain, shell, BrowserWindow } from 'electron'
import * as q from '../src/lib/database/queries'
import { parseResumeFile, parseResumeText } from '../src/lib/parsers/resume-parser'
import { enableStealth, disableStealth, isStealthActive } from './stealth-manager'
import {
  openOverlay,
  closeOverlay,
  isOverlayOpen,
  setOverlayOpacity,
  setOverlayAlwaysOnTop,
  adjustOverlayWidth,
  captureScreenshot,
} from './overlay-manager'
import { checkForUpdates, downloadUpdate, quitAndInstall } from './updater'
import { verifyLicense } from '../src/lib/license'
import { logError, getLogsDir } from './logger'
import {
  generateAnswer,
  streamAnswer,
  solveScreenshot,
  generateReport,
  testConnection,
  transcribe,
  listOllamaModels,
  generateQuestions,
  analyzeFit,
  draftCoverLetter,
  structureResume,
  extractJob,
  type GenerateAnswerInput,
  type GenerateReportInput,
  type GenerateQuestionsInput,
  type ApplyInput,
} from '../src/lib/providers'

// Tracks the in-flight answer stream so `ai:cancelStream` can abort it (one
// generation at a time).
let activeStream: AbortController | null = null

// All IPC wiring lives here (per CLAUDE.md). Thin pass-through to queries.ts —
// no SQL in this file. Channel names follow `db:<entity>:<op>`.
export function registerIpcHandlers(): void {
  // resumes
  ipcMain.handle('db:resume:create', (_e, input) => q.createResume(input))
  ipcMain.handle('db:resume:get', (_e, id: number) => q.getResume(id))
  ipcMain.handle('db:resume:list', () => q.listResumes())
  ipcMain.handle('db:resume:getDefault', () => q.getDefaultResume())
  ipcMain.handle('db:resume:setDefault', (_e, id: number) => q.setDefaultResume(id))
  ipcMain.handle('db:resume:update', (_e, id: number, patch) => q.updateResume(id, patch))
  ipcMain.handle('db:resume:delete', (_e, id: number) => q.deleteResume(id))

  // sessions
  ipcMain.handle('db:session:create', (_e, input) => q.createSession(input))
  ipcMain.handle('db:session:get', (_e, id: number) => q.getSession(id))
  ipcMain.handle('db:session:list', () => q.listSessions())
  ipcMain.handle('db:session:listByResume', (_e, resumeId: number) =>
    q.listSessionsByResume(resumeId),
  )
  ipcMain.handle('db:session:listByApplication', (_e, applicationId: number) =>
    q.listSessionsByApplication(applicationId),
  )
  ipcMain.handle('db:session:update', (_e, id: number, patch) => q.updateSession(id, patch))
  ipcMain.handle(
    'db:session:end',
    (_e, id: number, durationSec: number, report, keywords) =>
      q.endSession(id, durationSec, report, keywords),
  )
  ipcMain.handle('db:session:delete', (_e, id: number) => q.deleteSession(id))

  // qa pairs
  ipcMain.handle('db:qa:create', (_e, input) => q.createQAPair(input))
  ipcMain.handle('db:qa:list', (_e, sessionId: number) => q.listQAPairs(sessionId))
  ipcMain.handle('db:qa:update', (_e, id: number, patch) => q.updateQAPair(id, patch))
  ipcMain.handle('db:qa:nextSequence', (_e, sessionId: number) =>
    q.nextSequenceOrder(sessionId),
  )

  // transcript chunks
  ipcMain.handle('db:transcript:create', (_e, input) => q.createTranscriptChunk(input))
  ipcMain.handle('db:transcript:list', (_e, sessionId: number) =>
    q.listTranscriptChunks(sessionId),
  )

  // settings
  ipcMain.handle('db:settings:get', (_e, key: string) => q.getSetting(key))
  ipcMain.handle('db:settings:getAll', () => q.getAllSettings())
  ipcMain.handle('db:settings:set', (_e, key: string, value: string | null) =>
    q.setSetting(key, value),
  )
  ipcMain.handle('db:settings:getPlan', () => q.getPlan())
  ipcMain.handle('db:settings:getFreeSessionsUsed', () => q.getFreeSessionsUsed())
  ipcMain.handle('db:settings:incrementFreeSessionsUsed', () =>
    q.incrementFreeSessionsUsed(),
  )

  // applications (job tracker)
  ipcMain.handle('db:application:create', (_e, input) => q.createApplication(input))
  ipcMain.handle('db:application:get', (_e, id: number) => q.getApplication(id))
  ipcMain.handle('db:application:upsertForJob', (_e, input) => q.upsertApplicationForJob(input))
  ipcMain.handle('db:application:list', () => q.listApplications())
  ipcMain.handle('db:application:listWithActions', () => q.listApplicationsWithActions())
  ipcMain.handle('db:application:update', (_e, id: number, patch) =>
    q.updateApplication(id, patch),
  )
  ipcMain.handle('db:application:delete', (_e, id: number) => q.deleteApplication(id))

  // scheduled interviews (calendar)
  ipcMain.handle('db:interview:create', (_e, input) => q.createInterview(input))
  ipcMain.handle('db:interview:get', (_e, id: number) => q.getInterview(id))
  ipcMain.handle('db:interview:list', () => q.listInterviews())
  ipcMain.handle('db:interview:update', (_e, id: number, patch) => q.updateInterview(id, patch))
  ipcMain.handle('db:interview:delete', (_e, id: number) => q.deleteInterview(id))

  // resume parsing (pdf-parse / mammoth run here in the main process)
  ipcMain.handle('parser:resumeFile', (_e, fileName: string, data: Uint8Array) =>
    parseResumeFile(fileName, data),
  )
  ipcMain.handle('parser:resumeText', (_e, text: string) => ({
    raw_text: text,
    parsed_data: parseResumeText(text),
  }))

  // AI providers (run here; API keys never reach the renderer)
  ipcMain.handle('ai:generateAnswer', (_e, input: GenerateAnswerInput) => generateAnswer(input))
  ipcMain.handle('ai:streamAnswer', async (e, id: string, input: GenerateAnswerInput) => {
    const controller = new AbortController()
    activeStream = controller
    try {
      return await streamAnswer(input, (token) => e.sender.send('ai:token', { id, token }), controller.signal)
    } finally {
      if (activeStream === controller) activeStream = null
    }
  })
  ipcMain.handle('ai:cancelStream', () => {
    activeStream?.abort()
  })
  // Coding-interview solver: stream a solution from a screen capture (vision).
  ipcMain.handle('ai:solveScreenshot', async (e, id: string, imageDataUrl: string) => {
    const controller = new AbortController()
    activeStream = controller
    try {
      return await solveScreenshot(
        imageDataUrl,
        (token) => e.sender.send('ai:token', { id, token }),
        controller.signal,
      )
    } finally {
      if (activeStream === controller) activeStream = null
    }
  })
  ipcMain.handle('ai:generateReport', (_e, input: GenerateReportInput) => generateReport(input))
  ipcMain.handle('ai:testConnection', (_e, override?: Parameters<typeof testConnection>[0]) =>
    testConnection(override),
  )
  ipcMain.handle('ai:transcribe', (_e, audio: Uint8Array) => transcribe(audio))
  ipcMain.handle('ai:listOllamaModels', (_e, baseUrl?: string) => listOllamaModels(baseUrl))
  ipcMain.handle('ai:generateQuestions', (_e, input: GenerateQuestionsInput) =>
    generateQuestions(input),
  )
  ipcMain.handle('ai:analyzeFit', (_e, input: ApplyInput) => analyzeFit(input))
  ipcMain.handle('ai:draftCoverLetter', (_e, input: ApplyInput) => draftCoverLetter(input))
  ipcMain.handle('ai:structureResume', (_e, rawText: string) => structureResume(rawText))
  ipcMain.handle('ai:extractJob', (_e, postingText: string) => extractJob(postingText))

  // Focus overlay (stealth surface)
  ipcMain.handle('overlay:open', () => openOverlay())
  ipcMain.handle('overlay:close', () => closeOverlay())
  ipcMain.handle('overlay:isOpen', () => isOverlayOpen())
  ipcMain.handle('overlay:setOpacity', (_e, value: number) => setOverlayOpacity(value))
  ipcMain.handle('overlay:setAlwaysOnTop', (_e, on: boolean) => setOverlayAlwaysOnTop(on))
  ipcMain.handle('overlay:adjustWidth', (_e, delta: number) => adjustOverlayWidth(delta))
  ipcMain.handle('overlay:captureScreen', () => captureScreenshot())

  // in-app updates (electron-updater; no-op in dev)
  ipcMain.handle('updater:check', () => checkForUpdates())
  ipcMain.handle('updater:download', () => downloadUpdate())
  ipcMain.handle('updater:install', () => quitAndInstall())

  // stealth mode (premium)
  ipcMain.handle('stealth:enable', () => enableStealth())
  ipcMain.handle('stealth:disable', () => disableStealth())
  ipcMain.handle('stealth:status', () => isStealthActive())

  // Live settings sync: a setting changed in one window (main Settings, live
  // composer, or the overlay) is relayed to every OTHER window so all surfaces
  // stay in sync without a reload. Mirrors the stealth `stealth:changed` pattern.
  ipcMain.handle('settings:broadcast', (e, key: string, value: string | null) => {
    for (const w of BrowserWindow.getAllWindows()) {
      if (!w.isDestroyed() && w.webContents.id !== e.sender.id) {
        w.webContents.send('settings:changed', { key, value })
      }
    }
  })

  // Pro licensing (offline Ed25519-signed keys)
  ipcMain.handle('license:activate', (_e, key: string) => {
    const r = verifyLicense(key)
    if (r.valid) {
      q.setSetting('license_key', key)
      q.setSetting('plan', 'premium')
    }
    return r
  })
  ipcMain.handle('license:status', () => {
    const key = q.getSetting('license_key')
    if (!key) return { valid: false }
    const r = verifyLicense(key)
    // Self-heal: a stored key that no longer verifies (expired/rotated) drops to free.
    if (!r.valid && q.getSetting('plan') === 'premium') q.setSetting('plan', 'free')
    return r
  })
  ipcMain.handle('license:deactivate', () => {
    q.setSetting('license_key', '')
    q.setSetting('plan', 'free')
  })

  // Open an external URL (checkout, links) or a mailto in the system handler.
  ipcMain.handle('app:openExternal', (_e, url: string) => {
    if (/^(https?:|mailto:)/i.test(url)) void shell.openExternal(url)
  })

  // Local diagnostics: append an error line (no upload) + open the logs folder.
  ipcMain.handle('app:logError', (_e, scope: string, message: string) => logError(scope, message))
  ipcMain.handle('app:openLogs', () => shell.openPath(getLogsDir()))
}
