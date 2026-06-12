import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Sparkles,
  Copy,
  RefreshCw,
  Mic,
  Send,
  Pencil,
  X,
  Merge,
  Square,
  Zap,
  Type,
  Maximize2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useSession } from '@/hooks/useSession'
import { useAutoListen } from '@/hooks/useAutoListen'
import { useAppStore } from '@/store/app-store'
import { checkFeatureAccess } from '@/lib/plan'
import { SessionHeader } from '@/components/session/SessionHeader'
import { StealthToggle } from '@/components/session/StealthToggle'
import { AudioBars } from '@/components/session/AudioBars'
import { ModelPicker } from '@/components/session/ModelPicker'
import { Markdown, type MarkdownSize } from '@/components/report/Markdown'
// Quiet h-6 icon button used across the composer bar, bubble actions, and
// Heard-card secondaries — one consistent affordance.
const ICON_BTN =
  'flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'

function ChatTurn({
  question,
  answer,
  streaming,
  size = 'sm',
  latest = true,
  actions,
}: {
  question: string
  answer: string
  streaming?: boolean
  size?: MarkdownSize
  latest?: boolean
  actions?: ReactNode
}) {
  return (
    <div className={cn('space-y-2 transition-opacity', !latest && 'opacity-60')}>
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
          {question}
        </div>
      </div>
      <div className="flex justify-start">
        {/* 68ch cap keeps lines glance-readable even at lg/xl answer sizes. */}
        <div className="max-w-[min(95%,68ch)] rounded-2xl rounded-bl-sm border bg-card px-4 py-3 leading-relaxed">
          {answer ? (
            <Markdown text={answer} size={size} tone="normal" />
          ) : streaming ? (
            <span className="inline-flex gap-1">
              <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground/60" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
            </span>
          ) : null}
          {actions && <div className="-mb-1 mt-2 flex justify-end gap-0.5">{actions}</div>}
        </div>
      </div>
    </div>
  )
}

// Claude-style composer: one rounded box, textarea + send inside. Enter sends,
// Shift+Enter newline. Controlled so detected questions can be loaded via "Edit".
function Composer({
  value,
  onChange,
  disabled,
  onAsk,
  inputRef,
  leftControls,
  rightControls,
  generating,
  onStop,
}: {
  value: string
  onChange: (v: string) => void
  disabled: boolean
  onAsk: (q: string) => void
  inputRef: RefObject<HTMLTextAreaElement>
  leftControls?: ReactNode
  rightControls?: ReactNode
  generating?: boolean
  onStop?: () => void
}) {
  // Keep the textarea height in sync with content (also when set externally).
  useEffect(() => {
    const ta = inputRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`
  }, [value, inputRef])

  function submit() {
    const q = value.trim()
    if (!q || disabled) return
    onAsk(q)
    onChange('')
  }

  return (
    <div className="rounded-2xl border bg-card p-2 shadow-sm focus-within:border-primary/50">
      <textarea
        ref={inputRef}
        value={value}
        rows={1}
        placeholder="Ask a question…"
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
        className="max-h-40 w-full resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
      />
      {/* Claude-Code-style bottom bar: controls left, picker + send right. */}
      <div className="flex items-center justify-between gap-2 pl-1">
        <div className="flex items-center gap-1">{leftControls}</div>
        <div className="flex items-center gap-1">
          {rightControls}
          {generating ? (
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 shrink-0 rounded-full"
              onClick={onStop}
              aria-label="Stop generating"
              title="Stop generating"
            >
              <Square className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="h-8 w-8 shrink-0 rounded-full"
              disabled={disabled || value.trim().length === 0}
              onClick={submit}
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// A detected interviewer question. The bubble itself is the primary action —
// tap to answer it; Edit / Combine / Ignore are quiet icon secondaries.
function PendingBubble({
  text,
  canCombine,
  onUse,
  onEdit,
  onIgnore,
  onCombine,
}: {
  text: string
  canCombine: boolean
  onUse: () => void
  onEdit: () => void
  onIgnore: () => void
  onCombine: () => void
}) {
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={onUse}
        title="Answer this question"
        className="max-w-[80%] rounded-2xl rounded-br-sm border border-dashed border-primary/60 bg-primary/10 px-3.5 py-2 text-left text-sm transition-colors hover:border-primary hover:bg-primary/20"
      >
        <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Heard — tap to answer
        </span>
        {text}
      </button>
      <div className="flex justify-end gap-0.5">
        <button title="Edit before asking" aria-label="Edit question" onClick={onEdit} className={ICON_BTN}>
          <Pencil className="h-3.5 w-3.5" />
        </button>
        {canCombine && (
          <button
            title="Combine with the heard question above"
            aria-label="Combine questions"
            onClick={onCombine}
            className={ICON_BTN}
          >
            <Merge className="h-3.5 w-3.5" />
          </button>
        )}
        <button title="Ignore" aria-label="Ignore question" onClick={onIgnore} className={ICON_BTN}>
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

export default function LiveSession() {
  const navigate = useNavigate()
  const { id } = useParams()
  const sessionId = Number(id)
  const plan = useAppStore((s) => s.plan)
  const settings = useAppStore((s) => s.settings)
  const updateSetting = useAppStore((s) => s.updateSetting)
  const canAutoListen = checkFeatureAccess('autoListenEnabled', plan)
  const canStealth = checkFeatureAccess('stealthModeEnabled', plan)
  const [helpOpen, setHelpOpen] = useState(false)

  const {
    session,
    qaHistory,
    currentQuestion,
    currentAnswer,
    isGenerating,
    elapsedSec,
    loadError,
    askQuestion,
    regenerateAnswer,
    cancelGeneration,
    endSession,
    reloadHistory,
  } = useSession(sessionId)

  // The Focus overlay may have asked questions while this window was hidden —
  // re-pull the history when it closes.
  useEffect(() => {
    if (!window.app?.onSessionRefresh) return
    return window.app.onSessionRefresh(() => {
      if (!isGenerating) void reloadHistory()
    })
  }, [isGenerating, reloadHistory])

  // Auto-answer is a Pro feature — gate the value too (not just the toggle UI),
  // so a stale `auto_answer='true'` can never drive it for a free/lapsed user.
  const autoAnswer = canAutoListen && settings.auto_answer === 'true'
  const auto = useAutoListen({
    // Auto-answer keeps answers concise (less to scan live); manual asks use the
    // user's saved answer length.
    onQuestion: (q) => void askQuestion(q, autoAnswer ? { length: 'concise' } : undefined),
    autoAnswer,
    isBusy: isGenerating,
  })
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  // True while the user is at (or near) the bottom — streaming only follows then.
  const pinnedRef = useRef(true)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const [composerInput, setComposerInput] = useState('')

  function onTranscriptScroll() {
    const el = scrollRef.current
    if (!el) return
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120
  }

  // Auto-answer toggle: persist the flag; turning it on while idle also starts
  // listening (it's only meaningful with audio coming in).
  function toggleAutoAnswer() {
    const next = autoAnswer ? 'false' : 'true'
    void updateSetting('auto_answer', next)
    if (next === 'true' && !auto.isListening) toggleListen()
  }

  // Answer text size for at-a-glance reading during a live interview.
  const SIZE_ORDER: MarkdownSize[] = ['base', 'lg', 'xl']
  const answerSize: MarkdownSize = (settings.answer_text_size as MarkdownSize) || 'lg'
  function cycleAnswerSize() {
    const i = SIZE_ORDER.indexOf(answerSize)
    const next = SIZE_ORDER[(i + 1) % SIZE_ORDER.length] ?? 'lg'
    void updateSetting('answer_text_size', next)
  }

  function editPending(id: string) {
    const text = auto.editPending(id)
    if (text === null) return
    setComposerInput(text)
    requestAnimationFrame(() => composerRef.current?.focus())
  }

  // Mic toggle: first time, show the "share audio" help; afterwards start directly.
  function toggleListen() {
    if (auto.isListening) {
      auto.stopListening()
      return
    }
    if (settings.autolisten_help_seen !== 'true') {
      setHelpOpen(true)
      return
    }
    void auto.startListening()
  }

  function startFromHelp() {
    void updateSetting('autolisten_help_seen', 'true')
    setHelpOpen(false)
    void auto.startListening()
  }

  useEffect(() => {
    if (loadError) {
      toast.error(loadError)
      navigate('/')
    }
  }, [loadError, navigate])

  const showingLive = isGenerating || currentAnswer.length > 0
  const last = qaHistory[qaHistory.length - 1]

  // Follow the newest content only while the user is pinned to the bottom —
  // scrolling up to re-read mid-stream must not get yanked back down.
  useEffect(() => {
    if (pinnedRef.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [qaHistory.length, currentAnswer, isGenerating, auto.pending.length])

  if (!session) {
    return <p className="text-sm text-muted-foreground">Loading session…</p>
  }

  async function copyLast() {
    const text = last?.answer
    if (!text) return
    await navigator.clipboard.writeText(text)
    if (last && window.db) await window.db.qa.update(last.id, { was_copied: true })
    toast.success('Answer copied.')
  }

  const empty = qaHistory.length === 0 && !showingLive && auto.pending.length === 0

  // In-bubble actions for the latest finished answer (no layout shift below).
  const lastActions = (
    <>
      <button
        title="Copy answer"
        aria-label="Copy answer"
        onClick={() => void copyLast()}
        className={ICON_BTN}
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
      <button
        title="Regenerate answer"
        aria-label="Regenerate answer"
        onClick={() => void regenerateAnswer()}
        className={ICON_BTN}
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </button>
    </>
  )

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col gap-3">
      <SessionHeader
        session={session}
        elapsedSec={elapsedSec}
        onEnd={() => void endSession()}
        extra={
          <>
            {canStealth && (
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => void window.overlay?.open()}
                title="Focus overlay — compact always-on-top stealth window (Ctrl+Shift+H)"
                aria-label="Open Focus overlay"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {canStealth && <StealthToggle />}
          </>
        }
      />

      {/* Conversation transcript (only this scrolls) */}
      <div
        ref={scrollRef}
        onScroll={onTranscriptScroll}
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-label="Interview conversation"
        className="flex-1 overflow-y-auto px-1"
      >
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <Sparkles className="h-6 w-6" />
            Ask a question below — your suggested answer streams in here.
          </div>
        ) : (
          <div className="space-y-5">
            {qaHistory.map((qa, i) => (
              <ChatTurn
                key={qa.id}
                question={qa.question}
                answer={qa.answer}
                size={answerSize}
                latest={!showingLive && i === qaHistory.length - 1}
                actions={
                  !isGenerating && i === qaHistory.length - 1 ? lastActions : undefined
                }
              />
            ))}
            {showingLive && (
              <ChatTurn
                question={currentQuestion}
                answer={currentAnswer}
                streaming
                size={answerSize}
                latest
              />
            )}
            {/* Detected (heard) questions awaiting the user's decision. */}
            {auto.pending.map((p, i) => (
              <PendingBubble
                key={p.id}
                text={p.text}
                canCombine={i > 0}
                onUse={() => auto.usePending(p.id)}
                onEdit={() => editPending(p.id)}
                onIgnore={() => auto.ignorePending(p.id)}
                onCombine={() => auto.combinePending(p.id)}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Composer (pinned) — Claude-Code box: mic bottom-left, picker + send bottom-right */}
      <div className="shrink-0 space-y-2">
        {canAutoListen && auto.isListening && auto.silent && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
            No audio detected — stop, then re-share and tick “Share audio” so Aplomb can hear the
            interviewer.
          </div>
        )}
        <Composer
          value={composerInput}
          onChange={setComposerInput}
          disabled={isGenerating}
          onAsk={(q) => void askQuestion(q)}
          inputRef={composerRef}
          generating={isGenerating}
          onStop={cancelGeneration}
          leftControls={
            <div className="flex items-center gap-0.5">
              {/* Answer text size — cycle base → lg → xl for at-a-glance reading. */}
              <button
                type="button"
                title={`Answer text size: ${answerSize} — tap to cycle`}
                aria-label="Cycle answer text size"
                onClick={cycleAnswerSize}
                className={ICON_BTN}
              >
                <Type className="h-3.5 w-3.5" />
              </button>
              {canAutoListen && (
                <>
                  {/* Tiny borderless mic that morphs into live sound-waves when listening. */}
                  <button
                    type="button"
                    title={auto.isListening ? 'Stop listening' : 'Auto-listen (system audio)'}
                    aria-label={auto.isListening ? 'Stop listening' : 'Auto-listen'}
                    onClick={toggleListen}
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                      auto.isListening && 'text-primary',
                    )}
                  >
                    {auto.isListening ? (
                      <AudioBars bars={auto.bars} active size="sm" />
                    ) : (
                      <Mic className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    title={
                      autoAnswer
                        ? 'Auto-answer on — detected questions are combined and answered automatically'
                        : 'Auto-answer: combine detected questions and answer automatically'
                    }
                    aria-label="Toggle auto-answer"
                    aria-pressed={autoAnswer}
                    onClick={toggleAutoAnswer}
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                      autoAnswer && 'bg-primary/15 text-primary',
                    )}
                  >
                    <Zap className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          }
          rightControls={
            <ModelPicker onHelp={canAutoListen ? () => setHelpOpen(true) : undefined} />
          }
        />
        <p className="text-center text-[11px] text-muted-foreground">
          Aplomb can be wrong — skim before you speak.
        </p>
      </div>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Let Aplomb hear the interviewer</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Auto-listen captures your computer’s audio (the interviewer’s voice) — not your
                  microphone — and transcribes it to detect questions.
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    Needs a <strong>Groq API key</strong> (Settings → AI Provider). Transcription runs on
                    Groq Whisper, even if you generate answers with Ollama.
                  </li>
                  <li>
                    In the share picker, pick your <strong>whole screen</strong> or the meeting window/tab
                    and tick <strong>“Share audio” / “Share system audio”</strong> — without it, Aplomb
                    hears nothing.
                  </li>
                  <li>
                    Detected questions appear as <strong>“Heard” cards</strong> in the chat — tap{' '}
                    <strong>Use</strong> to ask it, or <strong>Edit / Ignore</strong> (and{' '}
                    <strong>Combine</strong> to merge two).
                  </li>
                  <li>The interviewer won’t hear you — this only listens, it never transmits.</li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setHelpOpen(false)}>
              Cancel
            </Button>
            <Button onClick={startFromHelp}>Start listening</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
