import { cn } from '@/lib/utils'
import markUrl from '@/assets/aplomb-mark.png'

// Aplomb "AP" monogram (filled, coral) — the brand mark used app-wide. Rendered
// as the raster art so it matches the installer/tray/favicon exactly. Sized via
// the passed className (e.g. h-5 w-5); decorative, so aria-hidden.
export function AplombMark({ className }: { className?: string }) {
  return (
    <img
      src={markUrl}
      className={cn(className)}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  )
}
