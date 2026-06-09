// Aplomb "AP" monogram — interlocking A + P, matches the desktop app + tray +
// installer icon. currentColor so it tints from the parent (e.g. coral brand).
export function AplombMark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
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
