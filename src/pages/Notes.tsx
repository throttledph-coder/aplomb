import { useState } from 'react'
import { StickyNote, Eye, Pencil } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Markdown } from '@/components/report/Markdown'
import { useNotesDraft } from '@/lib/notes/useNotesDraft'
import { cn } from '@/lib/utils'

const ICON_BTN =
  'flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'

// Main-app editor for the private cheat-sheet (the same `interview_notes` shown
// in the Focus overlay). Autosaves and stays in sync with the overlay live.
export default function Notes() {
  const { text, onChange } = useNotesDraft()
  const [preview, setPreview] = useState(false)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <StickyNote className="h-6 w-6 text-primary" /> Notes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your private cheat sheet — STAR stories, achievements, talking points. Autosaves, and shows up in
          the Focus overlay during a live interview. Markdown supported.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">Cheat sheet</CardTitle>
          <button
            type="button"
            title={preview ? 'Edit' : 'Preview'}
            aria-label={preview ? 'Edit notes' : 'Preview notes'}
            onClick={() => setPreview((v) => !v)}
            className={cn(ICON_BTN, preview && 'bg-accent text-foreground')}
          >
            {preview ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </CardHeader>
        <CardContent>
          {preview ? (
            <div className="min-h-[60vh]">
              {text.trim() ? (
                <Markdown text={text} size="base" tone="normal" />
              ) : (
                <p className="text-sm text-muted-foreground">Nothing here yet — switch to edit.</p>
              )}
            </div>
          ) : (
            <textarea
              value={text}
              onChange={(e) => onChange(e.target.value)}
              placeholder={
                'Your cheat sheet — STAR stories, achievements, talking points…\n\n## My stories\n- …\n\n## Key numbers\n- …'
              }
              className="min-h-[60vh] w-full resize-none rounded-md bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
