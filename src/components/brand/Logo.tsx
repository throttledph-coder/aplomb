import { cn } from '@/lib/utils'

// Aplomb "AP" monogram — interlocking A + P, matches the app/tray/installer
// icon. Uses currentColor so it tints via text-* utilities (e.g. text-primary).
export function AplombMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(className)}
      aria-hidden="true"
    >
      <path d="M24 8 L7 44" />
      <path d="M24 8 L41 44" />
      <path d="M13.5 32 H34.5" />
      <path d="M24 14 V44" />
      <path d="M24 14 C31.5 14 31.5 26 24 26" />
    </svg>
  )
}
