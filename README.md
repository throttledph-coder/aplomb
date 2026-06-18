# Aplomb

**Desktop interview-prep & live assistant.** Turn your resume + a job description into sharp, personal
practice answers, coaching feedback, and an application tracker — then, on Pro, get live in-interview help:
auto-listen, real-time transcription, hands-free auto-answer, and stealth mode.

Website: <https://aplomb.throttledph.workers.dev> · Download: Windows installer on the
[Releases](https://github.com/throttledph-coder/aplomb/releases) page.

## What it does

- **Tailored practice answers** — grounded only in your real resume + the JD.
- **Coaching reports** — what landed, keyword coverage, concrete fixes.
- **Application tracker** — wishlist → applied → interviewing → offer, with cover-letter drafts.
- **Pro — live extras:** auto-listen (system audio → Groq Whisper), real-time transcription with
  Use / Edit / **Combine**, **Auto-answer** (combine detected questions + answer hands-free),
  **Focus mode**, **Stealth** (excluded from screen share/recording), and tray mode.

Free covers all preparation, unlimited. Pro covers the live in-interview features.

## Privacy

Your resume, answers, and API key stay on your device (SQLite + OS-encrypted storage). You bring your own
Groq key or run fully local with Ollama. We only store your account email + subscription status.

## Tech

Electron + React 18 + TypeScript, Tailwind + shadcn/ui, Zustand, better-sqlite3, Groq (LLM + Whisper),
Supabase (auth + subscription records), PayMongo (billing — one-time Pro pass).

## Develop

```bash
npm install
npm run dev        # Electron + Vite dev
npm test           # vitest
npm run build      # tsc + vite + electron-builder → release/<version>/
```

The marketing site lives in `web/` (`cd web && npm run dev`).

## License

[MIT](./LICENSE) © 2026 Jonel Bibar
