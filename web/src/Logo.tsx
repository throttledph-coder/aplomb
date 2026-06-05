// Aplomb "A" monogram — matches the desktop app + tray icon. currentColor so it
// tints from the parent (e.g. the coral brand color).
export function AplombMark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 20 L12 4 L20 20" />
      <path d="M8 14 L16 14" />
    </svg>
  )
}
