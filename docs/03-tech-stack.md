Framework:            Electron 28+ with electron-vite
UI:                   React 18 + TypeScript
Styling:              Tailwind CSS + shadcn/ui
State:                Zustand
Routing:              React Router v6

PDF Parsing:          pdf-parse (npm, free, runs locally)
DOCX Parsing:         mammoth (npm, free, runs locally)
Database:             better-sqlite3 (local SQLite, free)

AI Provider:          Groq API (free tier)
                      - Model: llama-3.1-70b-versatile
                      - Whisper: whisper-large-v3
                      
Free AI Backup:       Google Gemini API (free tier: 15 req/min)
Local AI:             Ollama + Mistral 7B (fully offline)

Transcription Free:   Web Speech API (built into Electron)
Transcription Better: Groq Whisper (premium tier of app)

Audio:                MediaRecorder API (built in)

Packaging:            electron-builder (free)
Updates:              electron-updater (free)

ZERO-BUDGET TECH STACK
Recommended Stack
text

Desktop Framework:    Electron + React + TypeScript
UI Library:           shadcn/ui + Tailwind CSS
State:                Zustand
Icons:                Lucide React

Database:             SQLite via better-sqlite3
File Storage:         Local filesystem (resume files stored in app data folder)
PDF Parsing:          pdf-parse (npm, free)

Transcription:        Web Speech API (free tier, built into Chrome/Electron)
                      Groq Whisper API (premium tier, free API key to start)

AI/LLM:              Groq API — free tier (Llama 3.1 70B or Mixtral 8x7B)
                      Ollama — local option (Mistral 7B)
                      
Authentication:       Local only for MVP (no login needed)
                      Later: Supabase Auth or Clerk

Payments (Phase 4):   Stripe (free to integrate, they take %)
Hosting:              Not needed — desktop app
Packaging:            Electron Builder (free)
Version Control:      GitHub (free)
Why These Choices
text

Groq API free tier:
- Runs Llama 3.1 70B for free
- Returns responses in ~1-2 seconds
- Generous free limits for development
- Easy to swap in OpenAI/Anthropic later

Web Speech API for free tier:
- Zero cost, zero setup
- Works inside Electron with Chrome engine
- Continuous recognition available
- Enough quality for detecting interview questions

Groq Whisper for premium:
- Much better accuracy than Web Speech
- Handles accents, noise, soft voices
- Processes audio in chunks, very fast
- 20 hours free per month on Groq