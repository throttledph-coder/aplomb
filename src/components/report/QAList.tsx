import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { QAPair } from '@/types'

interface QAListProps {
  items: QAPair[]
}

export function QAList({ items }: QAListProps) {
  const [openId, setOpenId] = useState<number | null>(items[0]?.id ?? null)

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No questions were asked this session.</p>
  }

  return (
    <div className="space-y-2">
      {items.map((qa, i) => {
        const open = openId === qa.id
        return (
          <div key={qa.id} className="rounded-md border">
            <button
              type="button"
              onClick={() => setOpenId(open ? null : qa.id)}
              className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-accent/40"
            >
              {open ? (
                <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="font-medium">
                Q{i + 1}: {qa.question}
              </span>
            </button>
            {open && (
              <p className="whitespace-pre-wrap px-3 pb-3 pl-9 text-sm leading-relaxed text-muted-foreground">
                {qa.answer}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
