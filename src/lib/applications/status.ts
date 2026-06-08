import type { ApplicationStatus } from '@/types'

export const APPLICATION_STATUSES: { value: ApplicationStatus; label: string }[] = [
  { value: 'wishlist', label: 'Wishlist' },
  { value: 'applied', label: 'Applied' },
  { value: 'screening', label: 'Screening' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
]

// Pipeline colours for the status badge (works on dark + light themes).
export const APPLICATION_STATUS_COLORS: Record<ApplicationStatus, string> = {
  wishlist: 'border-transparent bg-muted text-muted-foreground',
  applied: 'border-blue-500/30 bg-blue-500/15 text-blue-500',
  screening: 'border-amber-500/30 bg-amber-500/15 text-amber-500',
  interview: 'border-violet-500/30 bg-violet-500/15 text-violet-500',
  offer: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-500',
  rejected: 'border-red-500/30 bg-red-500/15 text-red-500',
}
