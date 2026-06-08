import type { Interview } from '@/types'

// Chip/block colour by interview status, used in Month + Week views.
export function eventTone(iv: Interview): string {
  if (iv.status === 'cancelled') return 'bg-muted text-muted-foreground line-through'
  if (iv.status === 'completed') return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
  return 'bg-primary/15 text-primary'
}

export function fmtTime(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}
