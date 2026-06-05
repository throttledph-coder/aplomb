# Aplomb (formerly "Clarity AI") — Project Instructions for Claude Code

## What This App Is
A desktop interview assistant built with Electron + React + TypeScript.
Users upload a resume and job description, then get AI-generated answers
to interview questions during a live session.

## Tech Stack
- Electron + electron-vite
- React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- Zustand for state
- better-sqlite3 for SQLite
- Groq API for AI and Whisper transcription
- Web Speech API as free transcription fallback
- react-router-dom for routing
- pdf-parse and mammoth for resume parsing

## Key Rules
- Always use TypeScript, never plain JavaScript
- Always use Tailwind for styling, never inline styles or CSS files
- Use shadcn/ui components before building anything custom
- Database access only through src/lib/database/queries.ts, never raw SQL elsewhere
- AI providers only through src/lib/providers/index.ts factory, never call APIs directly from components
- All Electron IPC logic lives in electron/ipc-handlers.js only

## Free vs Premium Features
- Free tier: ALL preparation features — unlimited interview sessions, unlimited resumes, manual question
  input, coaching reports, application tracker, data export. Users bring their own AI key (Groq) or run
  local Ollama, so prep has no inference cost to us and stays free.
- Pro (premium): the live in-interview extras only — auto-listen, stealth mode, tray mode.
- Gate Pro features with `checkFeatureAccess` in src/lib/plan.ts. Prep is unlimited
  (`free.sessionsPerMonth` / `free.resumeCount` = -1); there is no session or resume cap.

## Folder Structure
See docs/12-folder-structure.md for the complete structure.
Do not create files outside this structure without asking.

## Build Order
1. Database schema and queries
2. Resume parser
3. AI providers and prompts
4. Core pages (Dashboard, Setup, LiveSession)
5. Session hook logic
6. Auto-listen (premium)
7. Electron stealth and tray
8. Polish and error handling

## Reference Docs
- Database schema: docs/05-database-schema.md
- Prompt system: docs/06-prompting-system.md
- UI screens: docs/07-screens-and-ui.md
- Stealth mode: docs/10-stealth-mode.md
- Plan limits: docs/11-plan-limits.md

RISKS AND HONEST LIMITATIONS
What Will Be Hard
text

RISK 1: Resume Parsing Accuracy
  Problem: pdf-parse can extract text weirdly from some PDFs
           Columns get merged, formatting breaks
  Mitigation: Show user the parsed data before session starts
              Allow manual editing of parsed fields
              Accept plain text paste as alternative

RISK 2: Auto-Listen False Positives
  Problem: "Yeah, okay, I see" might trigger a question
  Mitigation: Require user to confirm each detected question
              OR add 2-second delay with dismiss option
              Filter is tunable over time

RISK 3: Groq Rate Limits  
  Problem: Free tier has limits (30 req/min, 6000 tokens/min)
           A long session could hit them
  Mitigation: Show rate limit warning in UI
              Add retry with backoff
              Prompt user to add own API key (removes limits)

RISK 4: Stealth Mode Platform Differences
  Problem: setContentProtection(true) works on Windows and macOS
           On some Linux setups it may not work
  Mitigation: Test on target platforms early
              Label it as "Windows + Mac" feature

RISK 5: Web Speech API Quality
  Problem: Lower accuracy than Whisper, struggles with accents
           Requires Chrome/Electron — fine for desktop
           No good offline mode
  Mitigation: Frame it as "Good enough for detecting questions"
              Push premium users to Groq Whisper
              Show audio quality indicator

RISK 6: Answer Quality on Small Models
  Problem: Ollama local models (Mistral 7B) produce weaker answers 
           than GPT-4o or Claude for nuanced behavioral questions
  Mitigation: Use Groq's Llama 3.1 70B as default (much better)
              Well-engineered prompts compensate significantly
              Power of resume + JD context makes big difference

RISK 7: Resume Privacy Concern
  Problem: Users uploading resume and sending it to Groq API
  Mitigation: Be transparent in UI — show what's sent
              Offer Ollama (local) as privacy option
              Add privacy policy before launch