import type { ReactElement, ReactNode } from 'react'

// Minimal markdown renderer for the coaching report text (no dependency).
// Handles ## / ### headings, - / • bullets, and paragraphs.
//
// `size`/`tone` let the live interview view render answers bigger + higher
// contrast for at-a-glance reading; defaults keep the coaching report unchanged.

export type MarkdownSize = 'sm' | 'base' | 'lg' | 'xl'
type Tone = 'muted' | 'normal'

interface MarkdownProps {
  text: string
  size?: MarkdownSize
  tone?: Tone
}

// body text class per size; headings step up one notch.
const BODY: Record<MarkdownSize, string> = {
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
}
const H3: Record<MarkdownSize, string> = {
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
}
const H2: Record<MarkdownSize, string> = {
  sm: 'text-base',
  base: 'text-lg',
  lg: 'text-xl',
  xl: 'text-2xl',
}

// Render inline **bold** spans within a line (the rest stays plain text).
function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /\*\*(.+?)\*\*/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push(
      <strong key={k++} className="font-semibold text-foreground">
        {m[1]}
      </strong>,
    )
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

// A line that is exactly one bold span → the headline (emphasize as a lead).
function isHeadline(line: string): boolean {
  return /^\*\*(.+?)\*\*$/.test(line.trim())
}

export function Markdown({ text, size = 'sm', tone = 'muted' }: MarkdownProps) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const blocks: ReactElement[] = []
  let bullets: string[] = []
  let key = 0

  const body = BODY[size]
  const color = tone === 'normal' ? 'text-foreground' : 'text-muted-foreground'

  const flushBullets = () => {
    if (bullets.length === 0) return
    blocks.push(
      <ul key={key++} className={`ml-5 list-disc space-y-1 ${body} ${color}`}>
        {bullets.map((b, i) => (
          <li key={i}>{renderInline(b)}</li>
        ))}
      </ul>,
    )
    bullets = []
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      flushBullets()
      continue
    }
    if (line.startsWith('### ')) {
      flushBullets()
      blocks.push(
        <h3 key={key++} className={`mt-3 font-semibold ${H3[size]}`}>
          {renderInline(line.slice(4))}
        </h3>,
      )
    } else if (line.startsWith('## ')) {
      flushBullets()
      blocks.push(
        <h2 key={key++} className={`mt-4 font-semibold tracking-tight ${H2[size]}`}>
          {renderInline(line.slice(3))}
        </h2>,
      )
    } else if (/^[-•]\s+/.test(line)) {
      bullets.push(line.replace(/^[-•]\s+/, ''))
    } else if (isHeadline(line)) {
      // The lead headline — emphasize regardless of body tone.
      flushBullets()
      blocks.push(
        <p key={key++} className={`font-semibold text-foreground ${H3[size]}`}>
          {line.trim().replace(/^\*\*(.+?)\*\*$/, '$1')}
        </p>,
      )
    } else {
      flushBullets()
      blocks.push(
        <p key={key++} className={`leading-relaxed ${body} ${color}`}>
          {renderInline(line)}
        </p>,
      )
    }
  }
  flushBullets()

  return <div className="space-y-1">{blocks}</div>
}
