import { Loader2, AlertTriangle, RotateCw, X, CornerDownLeft, Ear } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TranscribeErrorKind } from '@/lib/audio/transcribe-error'

const BTN =
  'inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-xs font-medium transition-colors hover:bg-accent'

// Single source of truth for auto-listen transcription feedback. Sits at the
// top of the Heard/pending zone so the user always knows whether Aplomb is
// listening, transcribing, stuck, or what it last heard — without polluting the
// conversation with per-clip bubbles (most audio isn't a question).
export function TranscribeStatus({
  listening,
  transcribing,
  lastTranscript,
  lastError,
  onRetry,
  onSubmitLast,
  onDismiss,
  onOpenSettings,
}: {
  listening: boolean
  transcribing: boolean
  lastTranscript: string
  lastError: { kind: TranscribeErrorKind; message: string } | null
  onRetry: () => void
  onSubmitLast: () => void
  onDismiss: () => void
  onOpenSettings: () => void
}) {
  if (!listening && !lastError) return null

  // Error takes priority — actionable and visible.
  if (lastError) {
    const isKey = lastError.kind === 'key'
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs',
          isKey
            ? 'border-destructive/40 bg-destructive/10 text-destructive'
            : 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400',
        )}
        role="status"
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{lastError.message}</span>
        {isKey ? (
          <button className={BTN} onClick={onOpenSettings}>
            Open settings
          </button>
        ) : (
          <button className={BTN} onClick={onRetry}>
            <RotateCw className="h-3.5 w-3.5" /> Retry
          </button>
        )}
        <button className={cn(BTN, 'px-1')} onClick={onDismiss} aria-label="Dismiss">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  if (transcribing) {
    return (
      <div
        className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 text-xs text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
        Transcribing…
      </div>
    )
  }

  // Show the latest raw transcript with a way to use it even if the question
  // filter dropped it (view-raw / submit-anyway).
  if (lastTranscript.trim()) {
    return (
      <div className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 text-xs text-muted-foreground">
        <Ear className="h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate">Heard: “{lastTranscript.trim()}”</span>
        <button className={cn(BTN, 'text-primary')} onClick={onSubmitLast}>
          <CornerDownLeft className="h-3.5 w-3.5" /> Use anyway
        </button>
        <button className={cn(BTN, 'px-1')} onClick={onDismiss} aria-label="Dismiss">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  // Idle but listening.
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed bg-card/50 px-2.5 py-1.5 text-xs text-muted-foreground">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
      Listening for the interviewer…
    </div>
  )
}
