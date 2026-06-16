import { Notification } from 'electron'
import type { BrowserWindow } from 'electron'
import * as q from '../src/lib/database/queries'
import { computeReminderDue } from '../src/lib/calendar/reminders'
import { actionDue } from '../src/lib/applications/actions'
import { isStealthActive } from './stealth-manager'
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
  channel: 'interview:navigate' | 'application:navigate' = 'interview:navigate',
): void {
  if (!Notification.isSupported()) return
  const n = new Notification({ title, body })
  n.on('click', () => {
    const win = getWin()
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
    win.webContents.send(channel, id)
  })
  n.show()
}

function tick(getWin: () => BrowserWindow | null): void {
  try {
    // Never surface a toast during stealth — it would leak the app's presence
    // mid-interview and could un-hide the main window on click. Reminders for
    // not-yet-due interviews still fire on the next tick once stealth is off.
    if (isStealthActive()) return
    // Global off-switch (Settings → Notifications). Per-interview reminder
    // fields are unchanged; this just silences delivery.
    if (q.getSetting('reminders_enabled') === 'false') return
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
    // Application follow-ups: only explicit user-set next actions notify
    // (heuristic suggestions stay on the dashboard queue — no spam).
    for (const app of q.listApplicationsWithActions()) {
      if (actionDue(app, now)) {
        notify(
          getWin,
          app.id,
          `${app.next_action} — ${app.company}`,
          `${app.job_title}. Open Aplomb to view the application.`,
          'application:navigate',
        )
        q.markApplicationActionNotified(app.id)
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
