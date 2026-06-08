import { Notification } from 'electron'
import type { BrowserWindow } from 'electron'
import * as q from '../src/lib/database/queries'
import { computeReminderDue } from '../src/lib/calendar/reminders'
import { logError } from './logger'

// Poll cadence. Reminders fire while Aplomb is running; the immediate first tick
// on launch is the "catch-up" for anything already due today. (A persistent
// OS-level scheduler — firing when the app is fully closed — is a future add.)
const TICK_MS = 30_000

let timer: ReturnType<typeof setInterval> | null = null

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function notify(
  getWin: () => BrowserWindow | null,
  id: number,
  title: string,
  body: string,
): void {
  if (!Notification.isSupported()) return
  const n = new Notification({ title, body })
  n.on('click', () => {
    const win = getWin()
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
    win.webContents.send('interview:navigate', id)
  })
  n.show()
}

function tick(getWin: () => BrowserWindow | null): void {
  try {
    const now = new Date()
    for (const iv of q.listUpcomingInterviews()) {
      const due = computeReminderDue(iv, now)
      if (due.before) {
        notify(
          getWin,
          iv.id,
          `Interview soon — ${iv.company}`,
          `${iv.job_title} at ${fmtTime(iv.scheduled_at)}. Open Aplomb to launch your live session.`,
        )
        // Firing the "soon" nudge supersedes the day-of one.
        q.markInterviewNotified(iv.id, { before: true, day_of: true })
      } else if (due.dayOf) {
        notify(
          getWin,
          iv.id,
          `Interview today — ${iv.company}`,
          `${iv.job_title} at ${fmtTime(iv.scheduled_at)}. Open Aplomb to prep and launch.`,
        )
        q.markInterviewNotified(iv.id, { day_of: true })
      }
    }
  } catch (err) {
    logError('reminder-scheduler', err instanceof Error ? (err.stack ?? err.message) : String(err))
  }
}

export function startReminderScheduler(getWin: () => BrowserWindow | null): void {
  if (timer) return
  tick(getWin) // catch-up immediately on launch
  timer = setInterval(() => tick(getWin), TICK_MS)
}

export function stopReminderScheduler(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
