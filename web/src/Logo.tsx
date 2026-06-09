import markUrl from './assets/aplomb-mark.png'

// Aplomb "AP" monogram (filled, coral) — the brand mark. Rendered as the raster
// art so it matches the desktop app + favicon + installer exactly. Decorative.
export function AplombMark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <img
      src={markUrl}
      width={size}
      height={size}
      className={className}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  )
}
