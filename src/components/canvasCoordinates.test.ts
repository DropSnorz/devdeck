import { describe, expect, it } from 'vitest'
import { mapClientPointToCanvasPixel } from './canvasCoordinates'

function fakeCanvas(
  width: number,
  height: number,
  rect: { left: number; top: number; width: number; height: number },
) {
  return {
    width,
    height,
    getBoundingClientRect: () =>
      ({
        ...rect,
        right: rect.left + rect.width,
        bottom: rect.top + rect.height,
        x: rect.left,
        y: rect.top,
        toJSON: () => rect,
      }) as DOMRect,
  } as unknown as HTMLCanvasElement
}

describe('mapClientPointToCanvasPixel', () => {
  it('maps 1:1 when the canvas exactly fills its box', () => {
    const canvas = fakeCanvas(200, 100, { left: 0, top: 0, width: 200, height: 100 })
    expect(mapClientPointToCanvasPixel(canvas, 50, 25)).toEqual({ px: 50, py: 25 })
  })

  it('accounts for top/bottom letterboxing when the image is wider than its box', () => {
    // 200x100 image (2:1) in a 100x100 box (1:1) -> rendered at 100x50, centered (offsetY=25)
    const canvas = fakeCanvas(200, 100, { left: 0, top: 0, width: 100, height: 100 })
    expect(mapClientPointToCanvasPixel(canvas, 50, 50)).toEqual({ px: 100, py: 50 })
  })

  it('returns null for a point inside the letterbox padding, not on the image', () => {
    const canvas = fakeCanvas(200, 100, { left: 0, top: 0, width: 100, height: 100 })
    expect(mapClientPointToCanvasPixel(canvas, 50, 10)).toBeNull()
  })

  it('accounts for the box position on the page, not just its size', () => {
    const canvas = fakeCanvas(100, 100, { left: 40, top: 20, width: 100, height: 100 })
    expect(mapClientPointToCanvasPixel(canvas, 90, 70)).toEqual({ px: 50, py: 50 })
  })

  it('returns null when the canvas has no rendered size yet', () => {
    const canvas = fakeCanvas(100, 100, { left: 0, top: 0, width: 0, height: 0 })
    expect(mapClientPointToCanvasPixel(canvas, 10, 10)).toBeNull()
  })
})
