import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_COLORS,
} from '@/lib/applications/status'
import { suggestNextAction, daysSinceActivity } from '@/lib/applications/actions'
import type { Application, ApplicationStatus, Interview } from '@/types'

// Kanban pipeline for the tracker. Presentational: drag a card onto a column
// to change status (HTML5 DnD, same pattern as the calendar views); click a
// card to open the job. Rejected renders last, dimmed.
export function KanbanBoard({
  apps,
  interviews,
  now,
  onDrop,
  onOpen,
}: {
  apps: Application[]
  interviews: Interview[]
  now: Date
  onDrop: (appId: number, status: ApplicationStatus) => void
  onOpen: (app: Application) => void
}) {
  const [dragOver, setDragOver] = useState<ApplicationStatus | null>(null)

  function handleDrop(e: React.DragEvent, status: ApplicationStatus) {
    e.preventDefault()
    setDragOver(null)
    const id = Number(e.dataTransfer.getData('text/plain'))
    if (!Number.isNaN(id)) onDrop(id, status)
  }

  return (
    // Columns keep a readable min width and the board scrolls horizontally on a
    // narrow window; they grow to fill on a wide one.
    <div className="grid grid-cols-[repeat(6,minmax(150px,1fr))] gap-2 overflow-x-auto pb-2">
      {APPLICATION_STATUSES.map((s) => {
        const items = apps.filter((a) => a.status === s.value)
        const rejected = s.value === 'rejected'
        return (
          <div
            key={s.value}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(s.value)
            }}
            onDragLeave={() => setDragOver((v) => (v === s.value ? null : v))}
            onDrop={(e) => handleDrop(e, s.value)}
            className={cn(
              'flex min-h-[12rem] flex-col rounded-lg border bg-card/50 p-2 transition-colors',
              dragOver === s.value && 'border-primary/60 bg-accent/40',
              rejected && 'opacity-60',
            )}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    APPLICATION_STATUS_COLORS[s.value]
                      .split(' ')
                      .find((c) => c.startsWith('bg-')),
                  )}
                />
                {s.label}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">{items.length}</span>
            </div>

            <div className="flex flex-1 flex-col gap-1.5">
              {items.map((a) => {
                const action = suggestNextAction(a, interviews, now)
                const overdue = action !== null && action.due.getTime() <= now.getTime()
                return (
                  <button
                    key={a.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', String(a.id))}
                    onClick={() => onOpen(a)}
                    className="rounded-md border bg-card p-2 text-left transition-colors hover:border-primary/40"
                  >
                    <p className="truncate text-sm font-medium">{a.company}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.job_title}</p>
                    <div className="mt-1.5 flex items-center justify-between gap-1">
                      {a.excitement ? (
                        <span className="flex items-center gap-0.5" aria-label={`Excitement ${a.excitement} of 5`}>
                          {Array.from({ length: a.excitement }).map((_, i) => (
                            <Star key={i} className="h-2.5 w-2.5 fill-primary text-primary" />
                          ))}
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/70">
                        {daysSinceActivity(a, now)}d
                      </span>
                    </div>
                    {action && (
                      <p
                        title={action.action}
                        className={cn(
                          'mt-1 truncate text-[10px] font-medium',
                          overdue ? 'text-primary' : 'text-muted-foreground',
                        )}
                      >
                        {action.action}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
