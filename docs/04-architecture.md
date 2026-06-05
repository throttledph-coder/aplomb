ARCHITECTURE PLAN
High-Level Architecture
text

┌─────────────────────────────────────────────────────────────────┐
│                     APLOMB ELECTRON APP                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    REACT RENDERER                        │   │
│  │                                                         │   │
│  │  Setup Flow          Live Session         History       │   │
│  │  ┌──────────┐       ┌─────────────┐      ┌──────────┐  │   │
│  │  │ Resume   │       │ Question    │      │ Past     │  │   │
│  │  │ Upload   │       │ Input or   │      │ Sessions │  │   │
│  │  │ Job Desc │       │ Auto-Listen│      │ & Report │  │   │
│  │  └──────────┘       └─────────────┘      └──────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                    ┌─────────▼──────────┐                       │
│                    │  ELECTRON MAIN      │                       │
│                    │  - IPC handlers     │                       │
│                    │  - Window manager   │                       │
│                    │  - Tray manager     │                       │
│                    │  - Stealth manager  │                       │
│                    └─────────┬──────────┘                       │
└──────────────────────────────┼──────────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
     ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
     │  SQLite DB   │  │  AI Layer    │  │  Audio Layer  │
     │  (local)     │  │  Groq/Ollama │  │  WebSpeech   │
     │              │  │              │  │  or Groq      │
     └──────────────┘  └──────────────┘  └──────────────┘
Data Flow: Free Tier (Manual Input)
text

User types question into input box
          ↓
App builds context:
  [Resume summary] + [Job description] + [Role/Company] + [Question]
          ↓
Send to Groq API (or Ollama)
          ↓
Stream response back into answer panel
          ↓
Save Q&A pair to database
          ↓
User reads and speaks the answer
Data Flow: Premium Auto-Listen
text

Microphone on → Capture audio stream
          ↓
Process in 3-second chunks via Groq Whisper
          ↓
Transcript chunk arrives as text
          ↓
Question Detector runs:
  - Is this a question? (ends with ?, or question word pattern)
  - Is it longer than 5 words?
  - Is it different from the last thing processed?
  - Is it a verbal nod? ("yeah", "uh huh", "okay", "right") → IGNORE
  - Is it a filler phrase? ("so", "um", "you know") → IGNORE
          ↓
Real question detected → Build prompt → Send to AI
          ↓
Answer streams into panel
          ↓
Optional: sound notification that answer is ready (subtle chime)
Stealth Mode Architecture
text

Normal Mode:
  - App appears in taskbar
  - App appears in alt+tab
  - App window visible in screen share

Stealth Mode (Premium):
  Toggle ON →
  Electron: win.setSkipTaskbar(true)
  Electron: win.setContentProtection(true) ← This is the key
  Electron: Remove from dock (macOS)
  Electron: App appears as BLACK RECTANGLE to screen share software
  Tray icon: Still visible to user in system tray
  Hotkey: Cmd+Shift+H toggles visibility to USER (not to others — they see black)