import type { ReactElement } from 'react'

// Minimal markdown renderer for the coaching report text (no dependency).
// Handles ## / ### headings, - / • bullets, and paragraphs.

interface MarkdownProps {
  text: string
}

export function Markdown({ text }: MarkdownProps) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const blocks: ReactElement[] = []
  let bullets: string[] = []
  let key = 0

  const flushBullets = () => {
    if (bullets.length === 0) return
    blocks.push(
      <ul key={key++} className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
        {bullets.map((b, i) => (
          <li key={i}>{b}</li>
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
        <h3 key={key++} className="mt-3 text-sm font-semibold">
          {line.slice(4)}
        </h3>,
      )
    } else if (line.startsWith('## ')) {
      flushBullets()
      blocks.push(
        <h2 key={key++} className="mt-4 text-base font-semibold tracking-tight">
          {line.slice(3)}
        </h2>,
      )
    } else if (/^[-•]\s+/.test(line)) {
      bullets.push(line.replace(/^[-•]\s+/, ''))
    } else {
      flushBullets()
      blocks.push(
        <p key={key++} className="text-sm leading-relaxed text-muted-foreground">
          {line}
        </p>,
      )
    }
  }
  flushBullets()

  return <div className="space-y-1">{blocks}</div>
}
