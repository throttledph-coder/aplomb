# Aplomb — Build Roadmap

## Current Status
Not started. Project folder created. Ready to begin Phase 1.

## The Golden Rule
Complete each step fully before moving to the next.
Do not skip ahead. Do not build Phase 2 features during Phase 1.
After each step, the app must compile and run without errors.

---

## Phase 1 — Project Foundation
Goal: Empty app that runs, has correct folder structure, and connects to the database.

### Step 1.1 — Project Initialization
- Run: npm create electron-vite@latest . -- --template react-ts
- Install all dependencies listed in docs/03-tech-stack.md
- Configure Tailwind CSS
- Initialize shadcn/ui
- Add shadcn components: button, card, input, label, select, textarea,
  badge, separator, scroll-area, toast, dialog, tabs, progress, switch
- Verify the app opens with: npm run dev
- Done when: Electron window opens showing default React page

### Step 1.2 — Folder Structure
- Create every folder listed in docs/12-folder-structure.md
- Create empty placeholder files for every file in the structure
- Each placeholder should export an empty component or empty function
- Done when: Project compiles with no errors despite empty files

### Step 1.3 — Database Setup
- Reference: docs/05-database-schema.md
- Create src/lib/database/db.ts with SQLite connection singleton
- Create src/lib/database/schema.ts with all CREATE TABLE statements
- Create src/lib/database/queries.ts with all CRUD functions
- Call initializeDatabase() when app starts in electron/main.js
- Insert default settings rows on first run
- Done when: App starts and SQLite file is created in app data folder
  with all tables visible

### Step 1.4 — Settings Store
- Create src/store/app-store.ts with Zustand
- Load all settings from database on app start
- Expose: settings, updateSetting, plan, isOnboarded
- Done when: Settings load from database and are accessible in any component

---

## Phase 2 — Resume and Job Description Flow
Goal: User can upload a resume, see parsed data, enter job details, and reach the session screen.

### Step 2.1 — Resume Parser
- Create src/lib/parsers/pdf-parser.ts using pdf-parse
- Create src/lib/parsers/docx-parser.ts using mammoth
- Create src/lib/parsers/resume-parser.ts
  - Takes raw text as input
  - Calls Groq API to extract structured JSON
  - Returns: skills[], experience[], education[], projects[], summary
- Done when: A PDF resume can be dropped into the parser and returns
  correct structured JSON logged to console

### Step 2.2 — Resume Manager Page
- Reference: docs/07-screens-and-ui.md Screen 9
- Build src/pages/ResumeManager.tsx
- Build src/components/setup/ResumeUploader.tsx
  - Accepts PDF, DOCX, or plain text paste
  - Calls parser on file drop or paste
  - Shows parsed preview before saving
- Build src/components/setup/ResumeCard.tsx
- Save resume to database on confirm
- Done when: User can upload a PDF, see parsed skills and experience,
  and save it to the database

### Step 2.3 — Job Description Setup Page
- Reference: docs/07-screens-and-ui.md Screen 3
- Build src/pages/SetupJobDescription.tsx
- Build src/components/setup/JobDescriptionForm.tsx
  - Fields: company name, job title, interview type, full job description
- Save job description to database as new interview_session row with status pending
- Done when: User can fill in job details and click Start, which creates
  a session record and navigates to the live session screen

### Step 2.4 — Setup Flow Navigation
- Build src/pages/SetupResume.tsx as Step 1 wrapper
- Wire navigation: Dashboard → SetupResume → SetupJobDescription → LiveSession
- Pass resume ID and session ID through navigation state
- Done when: Full setup flow navigates correctly end to end

---

## Phase 3 — Live Session Core (Free Tier)
Goal: User can type a question and get a personalized AI answer during a session.

### Step 3.1 — AI Provider System
- Reference: docs/06-prompting-system.md
- Create src/lib/providers/types.ts with AIProvider interface
- Create src/lib/providers/ai/groq.ts
  - POST to Groq chat completions endpoint
  - Support streaming responses
  - Handle rate limit errors with retry and backoff
- Create src/lib/providers/ai/ollama.ts
  - POST to localhost:11434
  - Check if Ollama is running first
  - Return clear error if not running
- Create src/lib/providers/index.ts with factory function
- Done when: Calling getAIProvider() returns correct provider
  based on settings and generates a test response

### Step 3.2 — Prompt System
- Create src/lib/prompts/system-prompt.ts with base system prompt
- Create src/lib/prompts/resume-context.ts
  - Takes parsed resume JSON and returns formatted prompt context string
- Create src/lib/prompts/jd-context.ts
  - Takes session data and returns formatted job description context
- Create src/lib/prompts/answer-prompt.ts
  - Combines system prompt + resume context + JD context + previous QA + question
  - Returns final prompt string ready to send to AI
- Create src/lib/prompts/report-prompt.ts
  - Takes full session data and returns coaching report prompt
- Done when: buildAnswerPrompt() returns a complete, correct prompt string
  with real resume and JD data injected

### Step 3.3 — Session Hook
- Create src/hooks/useSession.ts
- Manages: sessionId, qaHistory, currentAnswer, isGenerating, timer, status
- Exposes: startSession, endSession, askQuestion, regenerateAnswer
- askQuestion should:
  - Build prompt using answer-prompt.ts
  - Call AI provider
  - Stream response into currentAnswer state
  - Save completed QA pair to database
- Done when: Calling askQuestion with a string generates and saves
  a streamed AI answer

### Step 3.4 — Live Session Screen
- Reference: docs/07-screens-and-ui.md Screen 4
- Build src/pages/LiveSession.tsx
- Build src/components/session/SessionHeader.tsx
  - Shows: company name, role, timer, end session button
- Build src/components/session/QuestionInput.tsx
  - Text input + Ask button
  - Pressing Enter submits
  - Clears after submission
- Build src/components/session/AnswerPanel.tsx
  - Shows streaming answer word by word
  - Copy to clipboard button
  - Regenerate button
  - Loading skeleton while generating
- Build src/components/session/QAHistory.tsx
  - List of previous questions in this session
  - Click to expand and see answer
- Done when: User can type a question, see the answer stream in,
  copy it, and see previous questions in the sidebar

---

## Phase 4 — Session Report and History
Goal: After a session ends, user sees a coaching report. All sessions are searchable.

### Step 4.1 — Session Report Generation
- Build end session logic in useSession.ts
  - Collect all QA pairs from session
  - Call AI with report-prompt.ts
  - Save report to database
  - Navigate to SessionReport page
- Build src/pages/SessionReport.tsx
- Reference: docs/07-screens-and-ui.md Screen 7
- Build src/components/report/ReportSummary.tsx
- Build src/components/report/QAList.tsx
- Build src/components/report/KeywordAnalysis.tsx
  - Compare words used in answers against JD keywords
- Done when: Ending a session generates a coaching report and
  displays it with all QA pairs and keyword matches

### Step 4.2 — Session History Page
- Reference: docs/07-screens-and-ui.md Screen 8
- Build src/pages/History.tsx
- Show all past sessions from database
- Search by company name or job title
- Filter by interview type
- Click session to view its report
- Reuse Setup button: pre-fills job description form with same data
- Done when: All past sessions are listed, searchable, and clickable

---

## Phase 5 — Onboarding and Dashboard
Goal: First-time experience is smooth. Dashboard shows useful overview.

### Step 5.1 — Onboarding Flow
- Build src/pages/Onboarding.tsx
- Step 1: Welcome screen, what the app does, get started button
- Step 2: Enter Groq API key with link to console.groq.com
  - Test connection button that makes a real API call
  - Show success or failure clearly
  - Allow skip with warning that AI will not work
- Save onboarding_complete = true to settings on finish
- Redirect to onboarding if not complete on app open
- Done when: First-time user is guided through onboarding and
  lands on dashboard with settings saved

### Step 5.2 — Dashboard
- Reference: docs/07-screens-and-ui.md Screen 1
- Build src/pages/Dashboard.tsx
- Show: recent sessions list, total sessions count, start new session button
- Show resume status: if no resume uploaded, show prompt to add one
- Show plan status: free sessions remaining
- Done when: Dashboard shows real data from database and
  all navigation works correctly

---

## Phase 6 — Premium Auto-Listen
Goal: Microphone captures what the interviewer says and triggers AI answers automatically.

### Step 6.1 — Audio Recording
- Create src/lib/audio/recorder.ts
  - Use MediaRecorder API
  - Record in 3-second chunks
  - Output audio blobs
  - Expose: start, stop, pause, getAudioLevel
- Create src/hooks/useAudioRecorder.ts
- Done when: Recording starts and produces audio blobs every 3 seconds

### Step 6.2 — Transcription Providers
- Create src/lib/providers/transcription/web-speech.ts
  - Use SpeechRecognition API for continuous listening
  - Free tier default
- Create src/lib/providers/transcription/groq-whisper.ts
  - POST audio blob to Groq Whisper endpoint
  - Return transcript text
  - Handle errors and rate limits
- Done when: Audio blob can be sent to Groq Whisper and
  returns accurate transcript text

### Step 6.3 — Question Filter
- Create src/lib/audio/question-filter.ts
- Filter out: filler words, verbal nods, short phrases, silence
- Detect questions using: question mark, question word patterns, instruction patterns
- Return: isQuestion, reason, cleanedText
- Done when: Running filter on 20 sample phrases correctly
  identifies questions and rejects fillers

### Step 6.4 — Auto-Listen Hook and UI
- Create src/hooks/useAutoListen.ts
  - Combines recorder + transcription + filter
  - On detected question: emit event with question text
  - Expose: isListening, lastDetectedQuestion, startListening, stopListening
- Build src/components/session/AutoListen.tsx
  - Reference: docs/07-screens-and-ui.md Screen 5
  - Shows listening status and audio level
- Build src/components/session/QuestionDetector.tsx
  - Shows detected question with confirm and dismiss buttons
  - Auto-confirms after 2 seconds if user does not dismiss
- Gate behind plan check: if plan is free, show UpgradePrompt instead
- Done when: App listens, detects a real question, shows it to user,
  and on confirm generates an AI answer automatically

---

## Phase 7 — Stealth Mode and System Tray
Goal: App is invisible to screen sharing software. Accessible only via tray.

### Step 7.1 — Overlay Window
- Reference: docs/10-stealth-mode.md
- Create second BrowserWindow in electron/main.js for the overlay
- Overlay properties: alwaysOnTop, frame false, transparent, skipTaskbar
- Build src/components/overlay/OverlayWindow.tsx
  - Shows current answer truncated to 2 lines
  - Copy button
  - Drag handle
- Send answer to overlay via IPC when new answer is generated
- Done when: Overlay window floats above all other apps and
  updates with each new AI answer

### Step 7.2 — Stealth Mode
- Create electron/stealth-manager.js
- enableStealth():
  - mainWindow.setContentProtection(true)
  - overlay.setContentProtection(true)
  - mainWindow.setSkipTaskbar(true)
  - app.dock.hide() on macOS
- disableStealth(): reverse all of the above
- Add IPC handlers: enable-stealth-mode, disable-stealth-mode
- Build src/components/session/StealthToggle.tsx
  - Toggle button visible during live session
  - Gate behind plan check
- Done when: Enabling stealth makes app invisible in OBS or
  screen share preview while overlay still shows to user

### Step 7.3 — System Tray
- Create electron/tray-manager.js
- Show tray icon when stealth mode is active
- Tray menu items: show app, toggle overlay, copy last answer, end session, disable stealth
- Register global hotkeys:
  - CommandOrControl+Shift+H: toggle overlay
  - CommandOrControl+Shift+C: copy last answer
  - CommandOrControl+Shift+S: toggle stealth
- Done when: In stealth mode, user can control the entire app
  from the tray icon and keyboard shortcuts only

---

## Phase 8 — Polish and Shipping
Goal: App is stable, handles errors gracefully, and can be installed on a clean machine.

### Step 8.1 — Error Handling
- Add error boundary component wrapping each page
- Handle: no API key set, API rate limit hit, Ollama not running,
  microphone permission denied, PDF parse failure, database error
- Every error shows a human-readable message with a suggested fix
- No raw error objects ever shown to user

### Step 8.2 — Empty States and Loading
- Every list that can be empty has an empty state with helpful message
- Every async operation has a loading state
- Answer generation shows streaming skeleton
- Session report generation shows progress indicator

### Step 8.3 — Settings Page
- Reference: docs/07-screens-and-ui.md Screen 10
- Build src/pages/Settings.tsx with sections:
  - AI provider and model selection
  - API key inputs with test connection buttons
  - Transcription provider selection
  - Answer length preference
  - Theme toggle
  - Hotkey display
  - Export all data button
  - Clear all data button with confirmation

### Step 8.4 — Plan Limits Enforcement
- Reference: docs/11-plan-limits.md
- Gate auto-listen, stealth, tray behind premium check
- Count free sessions used and block at limit with upgrade prompt
- Limit resume count to 1 on free plan

### Step 8.5 — Build and Package
- Configure electron-builder.config.js for Mac and Windows
- Test build with: npm run build
- Install on a clean machine and verify everything works
- Done when: .dmg and .exe installers work on clean machines
  with no development tools installed

---

## Current Step
Phase 1, Step 1.1 — Project Initialization

## Completed Steps
None yet.

## Known Issues
None yet. Update this section as issues are found.

## Decisions Made
- Using Groq API as default AI provider (free tier, fast)
- Using Web Speech API for free tier transcription
- Using Groq Whisper for premium tier transcription
- SQLite for local database, no cloud dependency in MVP
- Stealth mode uses setContentProtection which works on Mac and Windows