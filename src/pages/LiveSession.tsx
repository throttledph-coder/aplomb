import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Sparkles,
  Copy,
  RefreshCw,
  Mic,
  Send,
  Check,
  Pencil,
  X,
  Merge,
  Square,
  HelpCircle,
  Zap,
  Type,
  Maximize2,
  Minimize2,
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
import { scoreAnswer, FLAG_TIPS } from '@/lib/eval/answer-scorer'
import type { AnswerLength } from '@/lib/providers/types'

function ChatTurn({
  question,
  answer,
  streaming,
  size = 'sm',
  latest = true,
}: {
  question: string
  answer: string
  streaming?: boolean
  size?: MarkdownSize
  latest?: boolean
}) {
  return (
    <div className={cn('space-y-2 transition-opacity', !latest && 'opacity-60')}>
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
          {question}
        </div>
      </div>
      <div className="flex justify-start">
        <div className="max-w-[95%] rounded-2xl rounded-bl-sm border bg-card px-4 py-3 leading-relaxed">
          {answer ? (
            <Markdown text={answer} size={size} tone="normal" />
          ) : streaming ? (
            <span className="inline-flex gap-1">
              <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground/60" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
            </span>
          ) : null}
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

// A detected interviewer question, shown as a pending right-side bubble with
// Use / Edit / Ignore (+ Combine when it can merge into the bubble above).
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
      <div className="max-w-[80%] rounded-2xl rounded-br-sm border border-dashed border-primary/60 bg-primary/10 px-3.5 py-2 text-sm">
        <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Heard
        </span>
        {text}
      </div>
      <div className="flex flex-wrap justify-end gap-1">
        <Button size="sm" className="h-7" onClick={onUse}>
          <Check className="mr-1 h-3.5 w-3.5" /> Use this question
        </Button>
        <Button size="sm" variant="outline" className="h-7" onClick={onEdit}>
          <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
        </Button>
        {canCombine && (
          <Button size="sm" variant="outline" className="h-7" onClick={onCombine}>
            <Merge className="mr-1 h-3.5 w-3.5" /> Combine
          </Button>
        )}
        <Button size="sm" variant="ghost" className="h-7" onClick={onIgnore}>
          <X className="mr-1 h-3.5 w-3.5" /> Ignore
        </Button>
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
  const zenMode = useAppStore((s) => s.zenMode)
  const setZenMode = useAppStore((s) => s.setZenMode)
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
  } = useSession(sessionId)

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
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const [composerInput, setComposerInput] = useState('')

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

  // Zen/reading mode: restore the sidebar when leaving the session; Esc exits.
  useEffect(() => () => setZenMode(false), [setZenMode])
  useEffect(() => {
    if (!zenMode) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZenMode(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zenMode, setZenMode])

  const showingLive = isGenerating || currentAnswer.length > 0
  const last = qaHistory[qaHistory.length - 1]

  // Advisory quality tips for the latest answer (pure, no model).
  const answerLength = (settings.answer_length as AnswerLength) ?? 'detailed'
  const lastTips =
    !isGenerating && last
      ? scoreAnswer(last.answer, {
          question: last.question,
          length: answerLength,
          jd: session?.job_description,
        }).flags.map((f) => FLAG_TIPS[f])
      : []

  // Auto-scroll transcript to the newest content.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
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

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col gap-3">
      <SessionHeader
        session={session}
        elapsedSec={elapsedSec}
        onEnd={() => void endSession()}
        extra={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZenMode(!zenMode)}
              title={zenMode ? 'Exit reading mode (Esc)' : 'Reading mode — focus on the answer'}
              aria-pressed={zenMode}
            >
              {zenMode ? (
                <Minimize2 className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="mr-1.5 h-3.5 w-3.5" />
              )}
              {zenMode ? 'Exit' : 'Focus'}
            </Button>
            {canStealth && <StealthToggle />}
          </>
        }
      />

      {/* Conversation transcript (only this scrolls) */}
      <div
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-label="Interview conversation"
        className="flex-1 overflow-y-auto rounded-lg border bg-background/40 p-4"
      >
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <Sparkles className="h-6 w-6" />
            Ask a question below — your suggested answer streams in here.
          </div>
        ) : zenMode ? (
          // Reading mode: only the latest/streaming answer, extra-large.
          <div className="space-y-5">
            {showingLive ? (
              <ChatTurn question={currentQuestion} answer={currentAnswer} streaming size="xl" latest />
            ) : last ? (
              <ChatTurn question={last.question} answer={last.answer} size="xl" latest />
            ) : null}
            <div ref={bottomRef} />
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
            {!isGenerating && last && (
              <div className="space-y-1 pl-1">
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => void copyLast()}>
                    <Copy className="mr-1 h-3.5 w-3.5" /> Copy
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void regenerateAnswer()}>
                    <RefreshCw className="mr-1 h-3.5 w-3.5" /> Regenerate
                  </Button>
                </div>
                {lastTips.length > 0 && (
                  <p className="text-xs text-muted-foreground">Tips: {lastTips.join(' · ')}</p>
                )}
              </div>
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
                title={`Answer text size: ${answerSize} (tap to enlarge)`}
                aria-label="Cycle answer text size"
                onClick={cycleAnswerSize}
                className="flex h-6 items-center justify-center gap-0.5 rounded-md px-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Type className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase">{answerSize}</span>
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
                  <button
                    type="button"
                    title="How auto-listen works"
                    aria-label="Auto-listen help"
                    onClick={() => setHelpOpen(true)}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          }
          rightControls={<ModelPicker />}
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
