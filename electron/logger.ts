import { app } from 'electron'
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'

// Local-only diagnostic log. Nothing leaves the device (matches the privacy
// policy) — used for support/debugging. Capped so it can't grow unbounded.
const MAX_BYTES = 1_000_000

export function getLogsDir(): string {
  return path.join(app.getPath('userData'), 'logs')
}

function logFile(): string {
  return path.join(getLogsDir(), 'aplomb.log')
}

export function logError(scope: string, message: string): void {
  try {
    mkdirSync(getLogsDir(), { recursive: true })
    const file = logFile()
    // Rotate: when too big, keep the most recent half.
    if (existsSync(file) && statSync(file).size > MAX_BYTES) {
      writeFileSync(file, readFileSync(file, 'utf8').slice(-MAX_BYTES / 2))
    }
    appendFileSync(file, `[${new Date().toISOString()}] [${scope}] ${message}\n`)
  } catch {
    // Logging must never throw / crash the app.
  }
}
