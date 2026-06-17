import { useEffect, useRef, useState } from 'react'
import {
  Mic,
  Send,
  Square,
  X,
  StickyNote,
  SlidersHorizontal,
  Zap,
  Pencil,
  Merge,
  Eye,
  Copy,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Markdown, type MarkdownSize } from '@/components/report/Markdown'
import { ModelPicker } from '@/components/session/ModelPicker'
import { AudioBars } from '@/components/session/AudioBars'
import { TranscribeStatus } from '@/components/session/TranscribeStatus'
import { useSession } from '@/hooks/useSession'
import { useAutoListen } from '@/hooks/useAutoListen'
import { useAppStore } from '@/store/app-store'
import { checkFeatureAccess } from '@/lib/plan'
import { cn } from '@/lib/utils'

const ICON_BTN =
  'flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [-webkit-app-region:no-drag]'

const clampNotesWidth = (w: number) => Math.min(480, Math.max(180, Math.round(w)))

// The Focus overlay: a compact, draggable, always-on-top stealth surface for
// live interviews. Lives in its own toolwindow (see electron/overlay-manager).
export default function Overlay() {
  const plan = useAppStore((s) => s.plan)
  const activeSession = useAppStore((s) => s.activeSession)
  const loaded = useAppStore((s) => s.loaded)
  const allowed = checkFeatureAccess('stealthModeEnabled', plan)

  // This window is always a stealth surface: neutral cursor everywhere.
  useEffect(() => {
    document.documentElement.classList.add('stealth-cursor')
    return () => document.documentElement.classList.remove('stealth-cursor')
  }, [])

  // Esc returns to the main app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') void window.overlay?.close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!loaded) return null

  if (!allowed || !activeSession) {
    return (
      <Shell>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm text-muted-foreground">
            {!allowed
              ? 'The Focus overlay is a Pro feature.'
              : 'No active live session. Start one from Aplomb, then press Ctrl+Shift+H.'}
          </p>
          <Button size="sm" variant="outline" onClick={() => void window.overlay?.close()}>
            Open Aplomb
          </Button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <OverlaySession sessionId={activeSession.id} />
    </Shell>
  )
}

// Window chrome: solid card surface, drag handle on the header strip.
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      {children}
    </div>
  )
}

function OverlaySession({ sessionId }: { sessionId: number }) {
  const settings = useAppStore((s) => s.settings)
  const updateSetting = useAppStore((s) => s.updateSetting)
  const plan = useAppStore((s) => s.plan)
  const canAutoListen = checkFeatureAccess('autoListenEnabled', plan)

  const {
    qaHistory,
    currentQuestion,
    currentAnswer,
    isGenerating,
    askQuestion,
    cancelGeneration,
  } = useSession(sessionId)

  const autoAnswer = canAutoListen && settings.auto_answer === 'true'
  const auto = useAutoListen({
    onQuestion: (q) => void askQuestion(q, autoAnswer ? { length: 'concise' } : undefined),
    autoAnswer,
    isBusy: isGenerating,
  })

  const [input, setInput] = useState('')
  const [notesOpen, setNotesOpen] = useState(false)
  const [notesWidth, setNotesWidth] = useState(() => {
    const w = Number(settings.overlay_notes_width ?? '260')
    return Number.isFinite(w) ? clampNotesWidth(w) : 260
  })
  const bottomRef = useRef<HTMLDivElement>(null)

  // Opening the panel widens the WINDOW by the panel width (and vice versa) so
  // the chat column keeps its size — side-by-side, never covered.
  function toggleNotes() {
    setNotesOpen((open) => {
      void window.overlay?.adjustWidth(open ? -notesWidth : notesWidth)
      return !open
    })
  }

  // Live drag keeps the window fixed (chat flexes); on release, shift the
  // window by the net delta so the chat returns to its original width.
  function onNotesDragEnd(totalDelta: number) {
    void updateSetting('overlay_notes_width', String(clampNotesWidth(notesWidth)))
    if (totalDelta !== 0) void window.overlay?.adjustWidth(totalDelta)
  }
  const size: MarkdownSize = (settings.answer_text_size as MarkdownSize) || 'lg'
  const showingLive = isGenerating || currentAnswer.length > 0
  const last = qaHistory[qaHistory.length - 1]

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [qaHistory.length, currentAnswer, isGenerating, auto.pending.length])

  function submit() {
    const q = input.trim()
    if (!q || isGenerating) return
    void askQuestion(q)
    setInput('')
  }

  async function copyLast() {
    if (!last?.answer) return
    await navigator.clipboard.writeText(last.answer)
    toast.success('Copied.')
  }

  return (
    <>
      {/* Drag header — generic chrome, no branding (stealth surface). */}
      <div className="flex h-9 shrink-0 items-center gap-1 border-b px-2 [-webkit-app-region:drag]">
        <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary/70" aria-hidden="true" />
        <span className="flex-1" />
        <button
          title="Notes"
          aria-label="Notes"
          aria-pressed={notesOpen}
          onClick={toggleNotes}
          className={cn(ICON_BTN, notesOpen && 'bg-accent text-foreground')}
        >
          <StickyNote className="h-3.5 w-3.5" />
        </button>
        <QuickSettings notesOpen={notesOpen} onToggleNotes={toggleNotes} />
        <button
          title="Back to Aplomb (Esc)"
          aria-label="Close overlay"
          onClick={() => void window.overlay?.close()}
          className={ICON_BTN}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Assistant area + notes side panel — side-by-side, chat never covered */}
      <div className="flex flex-1 overflow-hidden">
        <div className="min-w-0 flex-1 space-y-3 overflow-y-auto px-3 py-2">
          {qaHistory.length === 0 && !showingLive && auto.pending.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              Ask below — or turn on the mic and let Aplomb catch the interviewer's questions.
            </p>
          ) : (
            <div className="space-y-3">
              {qaHistory.map((qa, i) => {
                const latest = !showingLive && i === qaHistory.length - 1
                return (
                  <div key={qa.id} className={cn('space-y-1', !latest && 'opacity-50')}>
                    <p className="text-xs font-medium text-primary">{qa.question}</p>
                    <Markdown text={qa.answer} size={latest ? size : 'sm'} tone="normal" />
                    {latest && (
                      <div className="flex justify-end">
                        <button title="Copy answer" aria-label="Copy answer" onClick={() => void copyLast()} className={ICON_BTN}>
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
              {showingLive && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-primary">{currentQuestion}</p>
                  {currentAnswer ? (
                    <Markdown text={currentAnswer} size={size} tone="normal" />
                  ) : (
                    <span className="inline-flex gap-1">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/60" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
                    </span>
                  )}
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {notesOpen && (
          <NotesPanel
            width={notesWidth}
            onLiveDelta={(dx) => setNotesWidth((w) => clampNotesWidth(w + dx))}
            onDragEnd={onNotesDragEnd}
          />
        )}
      </div>

      {/* Heard — pinned above the composer so detected questions stay reachable
          while scrolling the conversation. */}
      {canAutoListen && (auto.isListening || auto.lastError || auto.pending.length > 0) && (
        <div className="max-h-[40%] shrink-0 space-y-2 overflow-y-auto border-t px-3 py-2">
          <TranscribeStatus
            listening={auto.isListening}
            transcribing={auto.transcribing}
            lastTranscript={auto.lastTranscript}
            lastError={auto.lastError}
            onRetry={auto.retry}
            onSubmitLast={auto.submitLastTranscript}
            onDismiss={auto.dismissError}
            onOpenSettings={() => void window.overlay?.close()}
          />
          {auto.pending.map((p, i) => (
            <div key={p.id} className="flex flex-col items-end gap-1">
              <button
                onClick={() => auto.usePending(p.id)}
                title="Answer this question"
                className="max-w-[90%] rounded-xl rounded-br-sm border border-dashed border-primary/60 bg-primary/10 px-2.5 py-1.5 text-left text-xs transition-colors hover:border-primary hover:bg-primary/20"
              >
                <span className="mb-0.5 block text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                  Heard — tap to answer
                </span>
                {p.text}
              </button>
              <div className="flex gap-0.5">
                <button
                  title="Edit before asking"
                  aria-label="Edit question"
                  onClick={() => {
                    const text = auto.editPending(p.id)
                    if (text !== null) setInput(text)
                  }}
                  className={ICON_BTN}
                >
                  <Pencil className="h-3 w-3" />
                </button>
                {i > 0 && (
                  <button
                    title="Combine with the heard question above"
                    aria-label="Combine questions"
                    onClick={() => auto.combinePending(p.id)}
                    className={ICON_BTN}
                  >
                    <Merge className="h-3 w-3" />
                  </button>
                )}
                <button
                  title="Ignore"
                  aria-label="Ignore question"
                  onClick={() => auto.ignorePending(p.id)}
                  className={ICON_BTN}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Composer */}
      <div className="shrink-0 border-t p-2">
        <div className="rounded-xl border bg-card p-1.5 focus-within:border-primary/50">
          <textarea
            value={input}
            rows={1}
            placeholder="Ask a question…"
            disabled={isGenerating}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            className="max-h-24 w-full resize-none bg-transparent px-1.5 py-1 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
          <div className="flex items-center justify-between pl-0.5">
            <div className="flex items-center gap-0.5">
              {canAutoListen && (
                <>
                  <button
                    title={auto.isListening ? 'Stop listening' : 'Auto-listen (system audio)'}
                    aria-label={auto.isListening ? 'Stop listening' : 'Auto-listen'}
                    onClick={() =>
                      auto.isListening ? auto.stopListening() : void auto.startListening()
                    }
                    className={cn(ICON_BTN, auto.isListening && 'text-primary')}
                  >
                    {auto.isListening ? (
                      <AudioBars bars={auto.bars} active size="sm" />
                    ) : (
                      <Mic className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    title="Auto-answer detected questions"
                    aria-label="Toggle auto-answer"
                    aria-pressed={autoAnswer}
                    onClick={() => void updateSetting('auto_answer', autoAnswer ? 'false' : 'true')}
                    className={cn(ICON_BTN, autoAnswer && 'bg-primary/15 text-primary')}
                  >
                    <Zap className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* Answer length + provider/model, same ⚙ popover as the live page. */}
              <ModelPicker />
              {isGenerating ? (
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-7 w-7 rounded-full [-webkit-app-region:no-drag]"
                  onClick={cancelGeneration}
                  aria-label="Stop generating"
                >
                  <Square className="h-3 w-3" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  className="h-7 w-7 rounded-full [-webkit-app-region:no-drag]"
                  disabled={input.trim().length === 0}
                  onClick={submit}
                  aria-label="Send"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// Markdown cheat-sheet side panel: STAR stories, achievements, talking points.
// Sits beside the chat (never covers it); left edge drag-resizes; autosaves to
// the interview_notes setting (debounced).
function NotesPanel({
  width,
  onLiveDelta,
  onDragEnd,
}: {
  width: number
  onLiveDelta: (dx: number) => void
  onDragEnd: (totalDelta: number) => void
}) {
  const settings = useAppStore((s) => s.settings)
  const updateSetting = useAppStore((s) => s.updateSetting)
  const [text, setText] = useState(settings.interview_notes ?? '')
  const [preview, setPreview] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const drag = useRef<{ lastX: number; total: number } | null>(null)

  function onChange(v: string) {
    setText(v)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void updateSetting('interview_notes', v), 600)
  }

  return (
    <div className="relative flex shrink-0 flex-col border-l bg-background" style={{ width }}>
      {/* Drag handle on the panel's left edge (panel grows leftward). */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize notes panel"
        onPointerDown={(e) => {
          drag.current = { lastX: e.clientX, total: 0 }
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (!drag.current) return
          const dx = drag.current.lastX - e.clientX
          drag.current.lastX = e.clientX
          drag.current.total += dx
          onLiveDelta(dx)
        }}
        onPointerUp={(e) => {
          const total = drag.current?.total ?? 0
          drag.current = null
          e.currentTarget.releasePointerCapture(e.pointerId)
          onDragEnd(total)
        }}
        className="absolute inset-y-0 -left-0.5 z-10 w-1.5 transition-colors hover:bg-primary/40"
      />
      <div className="flex items-center justify-between border-b px-3 py-1.5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Notes
        </p>
        <button
          title={preview ? 'Edit' : 'Preview'}
          aria-label={preview ? 'Edit notes' : 'Preview notes'}
          onClick={() => setPreview((v) => !v)}
          className={ICON_BTN}
        >
          {preview ? <Pencil className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </button>
      </div>
      {preview ? (
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {text.trim() ? (
            <Markdown text={text} size="sm" tone="normal" />
          ) : (
            <p className="text-xs text-muted-foreground">Nothing here yet.</p>
          )}
        </div>
      ) : (
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder={'Your cheat sheet — STAR stories, achievements, talking points…\n\n## My stories\n- …'}
          className="flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
      )}
    </div>
  )
}

// Compact quick-settings popover: stealth, always-on-top, opacity, font size.
function QuickSettings({
  notesOpen,
  onToggleNotes,
}: {
  notesOpen: boolean
  onToggleNotes: () => void
}) {
  const settings = useAppStore((s) => s.settings)
  const updateSetting = useAppStore((s) => s.updateSetting)
  const [stealth, setStealth] = useState(false)
  const [onTop, setOnTop] = useState(true)
  const [opacity, setOpacity] = useState(() => {
    const v = Number(settings.overlay_opacity ?? '0.92')
    return Number.isFinite(v) && v >= 0.3 && v <= 1 ? v : 0.92
  })

  useEffect(() => {
    if (!window.stealth) return
    void window.stealth.status().then(setStealth)
    return window.stealth.onChange?.(setStealth)
  }, [])

  async function toggleStealth(on: boolean) {
    if (!window.stealth) return
    if (on) await window.stealth.enable()
    else await window.stealth.disable()
    setStealth(on)
  }

  function changeOpacity(v: number) {
    setOpacity(v)
    void window.overlay?.setOpacity(v)
  }

  const row = 'flex items-center justify-between gap-3 py-1'

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button title="Quick settings" aria-label="Quick settings" className={ICON_BTN}>
          <SlidersHorizontal className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-3 text-sm [-webkit-app-region:no-drag]">
        <div className={row}>
          <span>Stealth mode</span>
          <Switch checked={stealth} onCheckedChange={(v) => void toggleStealth(v)} />
        </div>
        <div className={row}>
          <span>Always on top</span>
          <Switch
            checked={onTop}
            onCheckedChange={(v) => {
              setOnTop(v)
              void window.overlay?.setAlwaysOnTop(v)
            }}
          />
        </div>
        <div className={row}>
          <span>Notes panel</span>
          <Switch checked={notesOpen} onCheckedChange={onToggleNotes} />
        </div>
        <div className="py-1">
          <p className="mb-1 flex items-center justify-between">
            <span>Opacity</span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {Math.round(opacity * 100)}%
            </span>
          </p>
          <input
            type="range"
            min={0.5}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(e) => changeOpacity(Number(e.target.value))}
            className="w-full accent-primary"
            aria-label="Overlay opacity"
          />
        </div>
        <div className={row}>
          <span>Answer size</span>
          <Select
            value={(settings.answer_text_size as string) || 'lg'}
            onValueChange={(v) => void updateSetting('answer_text_size', v)}
          >
            <SelectTrigger className="h-7 w-20 text-xs" aria-label="Answer text size">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="base">Base</SelectItem>
              <SelectItem value="lg">Large</SelectItem>
              <SelectItem value="xl">XL</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-2 space-y-0.5 border-t pt-2 text-[11px] text-muted-foreground">
          <p>Ctrl+Shift+H — show/hide overlay</p>
          <p>Ctrl+Shift+S — stealth on/off</p>
          <p>Esc — back to Aplomb</p>
          <p className="pt-1 text-muted-foreground/70">
            Hidden from screen-share pickers. OBS may still capture black.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
