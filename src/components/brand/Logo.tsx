import { cn } from '@/lib/utils'

// Aplomb "A" monogram — matches the app/tray icon. Uses currentColor so it
// tints via text-* utilities (e.g. text-primary).
export function AplombMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(className)}
      aria-hidden="true"
    >
      <path d="M4 20 L12 4 L20 20" />
      <path d="M8 14 L16 14" />
    </svg>
  )
}
