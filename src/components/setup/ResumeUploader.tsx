import { useRef, useState } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { ParsedResumeData } from '@/types'

export interface ParsedResumeResult {
  raw_text: string
  parsed_data: ParsedResumeData
  fileName: string | null
}

interface ResumeUploaderProps {
  onParsed: (result: ParsedResumeResult) => void
}

const ACCEPT = '.pdf,.docx,.doc,.txt'

export function ResumeUploader({ onParsed }: ResumeUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [pasteText, setPasteText] = useState('')

  async function parseFile(file: File) {
    if (!window.parser) {
      toast.error('Parser unavailable outside the desktop app.')
      return
    }
    setBusy(true)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const result = await window.parser.parseFile(file.name, bytes)
      onParsed({ ...result, fileName: file.name })
    } catch (err) {
      toast.error(`Could not parse "${file.name}": ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  async function parsePaste() {
    if (!pasteText.trim()) return
    if (!window.parser) {
      toast.error('Parser unavailable outside the desktop app.')
      return
    }
    setBusy(true)
    try {
      const result = await window.parser.parseText(pasteText)
      onParsed({ ...result, fileName: null })
      setPasteText('')
    } catch (err) {
      toast.error(`Could not parse text: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const file = e.dataTransfer.files[0]
          if (file) void parseFile(file)
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center transition-colors',
          dragging ? 'border-primary bg-accent/40' : 'hover:bg-accent/30',
        )}
      >
        {busy ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <Upload className="h-6 w-6 text-muted-foreground" />
        )}
        <p className="text-sm font-medium">Drag &amp; drop your resume here</p>
        <p className="text-xs text-muted-foreground">or click to browse — PDF, DOCX, TXT</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void parseFile(file)
            e.target.value = ''
          }}
        />
      </div>

      <div className="text-center text-xs text-muted-foreground">— or paste text —</div>

      <Textarea
        placeholder="Paste your resume content here…"
        value={pasteText}
        rows={5}
        onChange={(e) => setPasteText(e.target.value)}
      />
      <Button variant="secondary" disabled={busy || !pasteText.trim()} onClick={() => void parsePaste()}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Parse pasted text
      </Button>
    </div>
  )
}
