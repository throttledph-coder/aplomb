import { History, Pencil, Trash2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { PendingQuestion } from '@/hooks/useAutoListen'

const ICON_BTN =
  'flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'

// Popover log of every question Aplomb has heard this session. The Heard cards in
// the composer strip self-clear after a few seconds; this is the durable view
// where the user can scroll back and answer (or edit) an earlier one.
export function HeardHistory({
  items,
  onUse,
  onEdit,
  onClear,
}: {
  items: PendingQuestion[]
  onUse: (id: string) => void
  onEdit: (id: string) => void
  onClear: () => void
}) {
  const count = items.length
  const ordered = [...items].reverse() // newest first

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Heard history"
          aria-label={`Heard history (${count})`}
          className="relative flex h-6 items-center gap-1 rounded-md px-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [-webkit-app-region:no-drag]"
        >
          <History className="h-3.5 w-3.5" />
          {count > 0 && (
            <span className="min-w-4 rounded-full bg-primary/15 px-1 text-center text-[10px] font-medium tabular-nums text-primary">
              {count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0 [-webkit-app-region:no-drag]">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Heard this session
          </p>
          {count > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <Trash2 className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
        {count === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            Nothing heard yet. Detected questions show up here.
          </p>
        ) : (
          <ul className="max-h-72 overflow-y-auto py-1">
            {ordered.map((item) => (
              <li key={item.id} className="flex items-start gap-1 px-1.5 py-0.5">
                <PopoverClose asChild>
                  <button
                    type="button"
                    onClick={() => onUse(item.id)}
                    title="Answer this question"
                    className="min-w-0 flex-1 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent"
                  >
                    {item.text}
                  </button>
                </PopoverClose>
                <PopoverClose asChild>
                  <button
                    type="button"
                    onClick={() => onEdit(item.id)}
                    title="Edit before asking"
                    aria-label="Edit question"
                    className={cn(ICON_BTN, 'mt-0.5 shrink-0')}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </PopoverClose>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
