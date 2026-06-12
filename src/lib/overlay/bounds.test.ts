import { describe, it, expect } from 'vitest'
import {
  clampBounds,
  parseBounds,
  defaultBounds,
  OVERLAY_MIN_WIDTH,
  OVERLAY_MIN_HEIGHT,
} from './bounds'

const WORK = { x: 0, y: 0, width: 1920, height: 1040 }

describe('parseBounds', () => {
  it('parses valid JSON bounds', () => {
    expect(parseBounds('{"x":10,"y":20,"width":380,"height":560}')).toEqual({
      x: 10,
      y: 20,
      width: 380,
      height: 560,
    })
  })

  it('rejects malformed, empty, and non-positive sizes', () => {
    expect(parseBounds(null)).toBeNull()
    expect(parseBounds('')).toBeNull()
    expect(parseBounds('not json')).toBeNull()
    expect(parseBounds('{"x":0,"y":0}')).toBeNull()
    expect(parseBounds('{"x":0,"y":0,"width":0,"height":500}')).toBeNull()
  })
})

describe('clampBounds', () => {
  it('keeps in-bounds windows unchanged', () => {
    const b = { x: 100, y: 100, width: 400, height: 600 }
    expect(clampBounds(b, WORK)).toEqual(b)
  })

  it('pulls off-screen windows fully back on-screen', () => {
    const off = clampBounds({ x: 5000, y: -300, width: 400, height: 600 }, WORK)
    expect(off.x).toBe(WORK.width - 400)
    expect(off.y).toBe(0)
  })

  it('enforces minimum size and caps to the work area', () => {
    const tiny = clampBounds({ x: 0, y: 0, width: 10, height: 10 }, WORK)
    expect(tiny.width).toBe(OVERLAY_MIN_WIDTH)
    expect(tiny.height).toBe(OVERLAY_MIN_HEIGHT)
    const huge = clampBounds({ x: 0, y: 0, width: 9000, height: 9000 }, WORK)
    expect(huge.width).toBe(WORK.width)
    expect(huge.height).toBe(WORK.height)
  })

  it('respects work areas with offsets (secondary monitors)', () => {
    const work = { x: 1920, y: 0, width: 1280, height: 720 }
    const b = clampBounds({ x: 0, y: 0, width: 400, height: 500 }, work)
    expect(b.x).toBe(1920)
    expect(b.y).toBe(0)
  })
})

describe('defaultBounds', () => {
  it('lands top-right inside the work area', () => {
    const d = defaultBounds(WORK)
    expect(d.x + d.width).toBeLessThanOrEqual(WORK.width)
    expect(d.y).toBeGreaterThanOrEqual(WORK.y)
  })
})
