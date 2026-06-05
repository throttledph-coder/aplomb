import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { QAPair } from '@/types'

interface QAHistoryProps {
  items: QAPair[]
}

export function QAHistory({ items }: QAHistoryProps) {
  const [openId, setOpenId] = useState<number | null>(null)

  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground">No questions answered yet.</p>
  }

  return (
    <div className="space-y-1">
      {items.map((qa) => {
        const open = openId === qa.id
        return (
          <div key={qa.id} className="rounded-md border">
            <button
              type="button"
              onClick={() => setOpenId(open ? null : qa.id)}
              className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent/40"
            >
              {open ? (
                <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="font-medium">{qa.question}</span>
            </button>
            <div
              className={cn(
                'overflow-hidden px-3 text-sm leading-relaxed text-muted-foreground',
                open ? 'max-h-none pb-3' : 'max-h-0',
              )}
            >
              {open && <p className="whitespace-pre-wrap">{qa.answer}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
