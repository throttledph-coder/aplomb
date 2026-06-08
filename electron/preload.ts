import { ipcRenderer, contextBridge } from 'electron'

// Least privilege: the renderer gets only the specific typed APIs below — no
// generic ipcRenderer bridge (which would let any channel be invoked).

// --------- Typed database API (forwards to ipc-handlers in the main process) ---------
const invoke = (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args)

contextBridge.exposeInMainWorld('db', {
  resume: {
    create: (input: unknown) => invoke('db:resume:create', input),
    get: (id: number) => invoke('db:resume:get', id),
    list: () => invoke('db:resume:list'),
    getDefault: () => invoke('db:resume:getDefault'),
    setDefault: (id: number) => invoke('db:resume:setDefault', id),
    update: (id: number, patch: unknown) => invoke('db:resume:update', id, patch),
    delete: (id: number) => invoke('db:resume:delete', id),
  },
  session: {
    create: (input: unknown) => invoke('db:session:create', input),
    get: (id: number) => invoke('db:session:get', id),
    list: () => invoke('db:session:list'),
    listByResume: (resumeId: number) => invoke('db:session:listByResume', resumeId),
    update: (id: number, patch: unknown) => invoke('db:session:update', id, patch),
    end: (id: number, durationSec: number, report?: unknown, keywords?: unknown) =>
      invoke('db:session:end', id, durationSec, report, keywords),
    delete: (id: number) => invoke('db:session:delete', id),
  },
  qa: {
    create: (input: unknown) => invoke('db:qa:create', input),
    list: (sessionId: number) => invoke('db:qa:list', sessionId),
    update: (id: number, patch: unknown) => invoke('db:qa:update', id, patch),
    nextSequence: (sessionId: number) => invoke('db:qa:nextSequence', sessionId),
  },
  transcript: {
    create: (input: unknown) => invoke('db:transcript:create', input),
    list: (sessionId: number) => invoke('db:transcript:list', sessionId),
  },
  settings: {
    get: (key: string) => invoke('db:settings:get', key),
    getAll: () => invoke('db:settings:getAll'),
    set: (key: string, value: string | null) => invoke('db:settings:set', key, value),
    getPlan: () => invoke('db:settings:getPlan'),
    getFreeSessionsUsed: () => invoke('db:settings:getFreeSessionsUsed'),
    incrementFreeSessionsUsed: () => invoke('db:settings:incrementFreeSessionsUsed'),
  },
  application: {
    create: (input: unknown) => invoke('db:application:create', input),
    list: () => invoke('db:application:list'),
    update: (id: number, patch: unknown) => invoke('db:application:update', id, patch),
    delete: (id: number) => invoke('db:application:delete', id),
  },
  interview: {
    create: (input: unknown) => invoke('db:interview:create', input),
    get: (id: number) => invoke('db:interview:get', id),
    list: () => invoke('db:interview:list'),
    update: (id: number, patch: unknown) => invoke('db:interview:update', id, patch),
    delete: (id: number) => invoke('db:interview:delete', id),
  },
})

// --------- Resume parser API (pdf/docx/text parsing in the main process) ---------
contextBridge.exposeInMainWorld('parser', {
  parseFile: (fileName: string, bytes: Uint8Array) =>
    invoke('parser:resumeFile', fileName, bytes),
  parseText: (text: string) => invoke('parser:resumeText', text),
})

// --------- AI API (providers + prompts run in the main process) ---------
contextBridge.exposeInMainWorld('ai', {
  generateAnswer: (input: unknown) => invoke('ai:generateAnswer', input),
  generateReport: (input: unknown) => invoke('ai:generateReport', input),
  testConnection: (override?: unknown) => invoke('ai:testConnection', override),
  transcribe: (audio: Uint8Array) => invoke('ai:transcribe', audio),
  listOllamaModels: (baseUrl?: string) => invoke('ai:listOllamaModels', baseUrl),
  generateQuestions: (input: unknown) => invoke('ai:generateQuestions', input),
  analyzeFit: (input: unknown) => invoke('ai:analyzeFit', input),
  draftCoverLetter: (input: unknown) => invoke('ai:draftCoverLetter', input),
  structureResume: (rawText: string) => invoke('ai:structureResume', rawText),
  cancelStream: () => invoke('ai:cancelStream'),
  streamAnswer: (input: unknown, onToken: (token: string) => void) => {
    const id = crypto.randomUUID()
    const listener = (_e: unknown, payload: { id: string; token: string }) => {
      if (payload.id === id) onToken(payload.token)
    }
    ipcRenderer.on('ai:token', listener)
    return ipcRenderer
      .invoke('ai:streamAnswer', id, input)
      .finally(() => ipcRenderer.off('ai:token', listener))
  },
})

// --------- Stealth mode (premium) ---------
contextBridge.exposeInMainWorld('stealth', {
  enable: () => invoke('stealth:enable'),
  disable: () => invoke('stealth:disable'),
  status: () => invoke('stealth:status'),
})

// --------- App shell helpers ---------
contextBridge.exposeInMainWorld('app', {
  openExternal: (url: string) => invoke('app:openExternal', url),
  logError: (scope: string, message: string) => invoke('app:logError', scope, message),
  openLogs: () => invoke('app:openLogs'),
  // Fired by the reminder scheduler when the user clicks an interview toast.
  onInterviewNavigate: (cb: (id: number) => void) => {
    const listener = (_e: unknown, id: number) => cb(id)
    ipcRenderer.on('interview:navigate', listener)
    return () => ipcRenderer.off('interview:navigate', listener)
  },
})

// --------- Pro licensing ---------
contextBridge.exposeInMainWorld('license', {
  activate: (key: string) => invoke('license:activate', key),
  status: () => invoke('license:status'),
  deactivate: () => invoke('license:deactivate'),
})
