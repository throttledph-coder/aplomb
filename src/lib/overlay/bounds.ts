// Pure bounds math for the Focus overlay window: restore the last saved
// position/size but never let the window come back off-screen (monitor
// unplugged, resolution changed).

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export const OVERLAY_MIN_WIDTH = 320
export const OVERLAY_MIN_HEIGHT = 380
export const OVERLAY_DEFAULT_WIDTH = 380
export const OVERLAY_DEFAULT_HEIGHT = 560
const MARGIN = 16

// Default spot: top-right of the work area (matches the old overlay_position
// 'top-right' setting this feature revives).
export function defaultBounds(workArea: Bounds): Bounds {
  return {
    x: workArea.x + workArea.width - OVERLAY_DEFAULT_WIDTH - MARGIN,
    y: workArea.y + MARGIN,
    width: OVERLAY_DEFAULT_WIDTH,
    height: OVERLAY_DEFAULT_HEIGHT,
  }
}

// Parse a persisted bounds JSON string; null on anything malformed.
export function parseBounds(json: string | null | undefined): Bounds | null {
  if (!json) return null
  try {
    const b = JSON.parse(json) as Partial<Bounds>
    if (
      typeof b.x === 'number' &&
      typeof b.y === 'number' &&
      typeof b.width === 'number' &&
      typeof b.height === 'number' &&
      Number.isFinite(b.x) &&
      Number.isFinite(b.y) &&
      b.width > 0 &&
      b.height > 0
    ) {
      return { x: b.x, y: b.y, width: b.width, height: b.height }
    }
    return null
  } catch {
    return null
  }
}

// Clamp saved bounds into the current work area: enforce minimum size, cap to
// the work area, and pull the window fully on-screen.
export function clampBounds(saved: Bounds, workArea: Bounds): Bounds {
  const width = Math.min(Math.max(saved.width, OVERLAY_MIN_WIDTH), workArea.width)
  const height = Math.min(Math.max(saved.height, OVERLAY_MIN_HEIGHT), workArea.height)
  const maxX = workArea.x + workArea.width - width
  const maxY = workArea.y + workArea.height - height
  const x = Math.min(Math.max(saved.x, workArea.x), maxX)
  const y = Math.min(Math.max(saved.y, workArea.y), maxY)
  return { x, y, width, height }
}
