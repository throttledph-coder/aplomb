clarity-ai/
├── electron/
│   ├── main.js                    # Main process: windows, tray, stealth
│   ├── preload.js                 # Context bridge
│   ├── ipc-handlers.js            # All IPC event handlers
│   ├── stealth-manager.js         # Stealth mode logic
│   └── tray-manager.js            # System tray logic
│
├── src/
│   ├── components/
│   │   ├── ui/                    # shadcn/ui (auto-generated)
│   │   ├── layout/
│   │   │   ├── AppShell.tsx       # Sidebar + main area wrapper
│   │   │   └── Sidebar.tsx        # Navigation sidebar
│   │   ├── setup/
│   │   │   ├── ResumeUploader.tsx # PDF/DOCX/paste upload
│   │   │   ├── ResumeCard.tsx     # Display a stored resume
│   │   │   └── JobDescriptionForm.tsx
│   │   ├── session/
│   │   │   ├── QuestionInput.tsx  # Manual question typing
│   │   │   ├── AnswerPanel.tsx    # AI answer display + copy
│   │   │   ├── QAHistory.tsx      # Previous Q&A in session
│   │   │   ├── AutoListen.tsx     # Premium auto-listen panel
│   │   │   ├── QuestionDetector.tsx # Shows "Heard: ..." UI
│   │   │   ├── SessionHeader.tsx  # Timer, company, controls
│   │   │   └── StealthToggle.tsx  # Premium stealth button
│   │   ├── report/
│   │   │   ├── ReportSummary.tsx
│   │   │   ├── QAList.tsx
│   │   │   └── KeywordAnalysis.tsx
│   │   ├── overlay/
│   │   │   └── OverlayWindow.tsx  # Floating answer overlay
│   │   └── shared/
│   │       ├── UpgradePrompt.tsx
│   │       ├── LoadingDots.tsx
│   │       └── EmptyState.tsx
│   │
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── SetupResume.tsx        # Step 1 of new session
│   │   ├── SetupJobDescription.tsx # Step 2 of new session
│   │   ├── LiveSession.tsx        # The main interview screen
│   │   ├── SessionReport.tsx      # Post-session
│   │   ├── History.tsx
│   │   ├── ResumeManager.tsx
│   │   ├── Settings.tsx
│   │   └── Onboarding.tsx
│   │
│   ├── lib/
│   │   ├── database/
│   │   │   ├── schema.ts          # All CREATE TABLE statements
│   │   │   ├── queries.ts         # All database functions
│   │   │   └── db.ts              # Database connection singleton
│   │   ├── parsers/
│   │   │   ├── pdf-parser.ts      # PDF → plain text
│   │   │   ├── docx-parser.ts     # DOCX → plain text
│   │   │   └── resume-parser.ts   # Text → structured JSON
│   │   ├── providers/
│   │   │   ├── types.ts
│   │   │   ├── ai/
│   │   │   │   ├── groq.ts
│   │   │   │   ├── ollama.ts
│   │   │   │   └── openai.ts
│   │   │   └── transcription/
│   │   │       ├── web-speech.ts
│   │   │       └── groq-whisper.ts
│   │   ├── prompts/
│   │   │   ├── system-prompt.ts
│   │   │   ├── answer-prompt.ts
│   │   │   ├── resume-context.ts
│   │   │   ├── jd-context.ts
│   │   │   └── report-prompt.ts
│   │   ├── audio/
│   │   │   ├── recorder.ts
│   │   │   └── question-filter.ts
│   │   └── plan.ts                # Plan limits enforcement
│   │
│   ├── hooks/
│   │   ├── useSession.ts          # Core session state
│   │   ├── useAutoListen.ts       # Premium auto-listen
│   │   ├── useResume.ts
│   │   ├── useSettings.ts
│   │   └── useStealth.ts          # Stealth mode control
│   │
│   ├── store/
│   │   └── app-store.ts           # Zustand global state
│   │
│   ├── types/
│   │   └── index.ts
│   │
│   ├── App.tsx
│   └── main.tsx
│
├── assets/
│   ├── tray-icon.png              # 16x16 or 22x22
│   ├── tray-icon@2x.png
│   └── icon.png                   # App icon
│
├── package.json
├── electron-builder.config.js
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json