// Release notes shown in Help & About → What's New. Newest first.
// Keep entries short + user-facing (not commit-level detail).

export interface ChangelogEntry {
  version: string
  date: string // YYYY-MM-DD
  items: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.22.0',
    date: '2026-06-13',
    items: [
      'Reorganized Account, Settings, and a new Help & About section so things are where you expect them.',
      'Settings now exposes overlay opacity, always-on-top, auto-answer, answer text size, keyboard shortcuts, and a reminders toggle.',
      'Added this What’s New changelog.',
    ],
  },
  {
    version: '0.21.1',
    date: '2026-06-13',
    items: [
      'Stealth: the Focus overlay no longer appears in Zoom or Google Meet window-share pickers.',
      'No system-tray icon during stealth; interview reminders are silenced while stealth is on.',
    ],
  },
  {
    version: '0.21.0',
    date: '2026-06-13',
    items: [
      'Stealth now hides Aplomb into the Focus overlay (off Alt+Tab, taskbar, and share pickers).',
      'Overlay gained answer-length + model controls and a resizable Notes side panel.',
    ],
  },
  {
    version: '0.20.0',
    date: '2026-06-12',
    items: [
      'New Focus overlay: a compact, always-on-top command center with a Notes cheat-sheet and quick settings.',
      'Cursor stays neutral during stealth so it can’t reveal interaction on a shared screen.',
    ],
  },
  {
    version: '0.19.0',
    date: '2026-06-11',
    items: [
      'Application tracker that drives action: next-action engine, follow-up reminders, and an Action queue on Home.',
      'Kanban pipeline (drag to change stage) and paste-to-add with AI field extraction.',
    ],
  },
  {
    version: '0.18.0',
    date: '2026-06-10',
    items: [
      'One-stop Home command center: Up Next with a prep checklist, weekly stats, insights, and a mini calendar with hover previews.',
    ],
  },
  {
    version: '0.17.0',
    date: '2026-06-10',
    items: ['Interactive mini calendar plus upcoming-interviews and pipeline rail on Home.'],
  },
  {
    version: '0.16.0',
    date: '2026-06-09',
    items: [
      'New AP monogram brand across the app, installer, and website.',
      'Minimalist, typography-first dashboard with popover/hover detail.',
    ],
  },
  {
    version: '0.15.0',
    date: '2026-06-08',
    items: ['Google-Calendar-style Month / Week / Agenda views with drag-to-reschedule.'],
  },
  {
    version: '0.14.0',
    date: '2026-06-08',
    items: [
      'Connected Applications, Calendar, and Sessions into one hierarchy.',
      'In-app auto-update.',
    ],
  },
  {
    version: '0.13.6',
    date: '2026-06-08',
    items: ['Interview calendar with scheduling, day-of + before reminders, and one-click session launch.'],
  },
]
