import { describe, expect, it } from 'vitest'
import { MAP_HEIGHT, MAP_WIDTH, WORLD_LAND_PATH, project, toClosedPath, toOpenPath } from './worldMapPaths'

describe('project', () => {
  it('maps (lon 0, lat 0) to the center of the viewBox', () => {
    expect(project({ lon: 0, lat: 0 })).toEqual({ x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 })
  })

  it('maps the top-left and bottom-right corners of the world', () => {
    expect(project({ lon: -180, lat: 90 })).toEqual({ x: 0, y: 0 })
    expect(project({ lon: 180, lat: -90 })).toEqual({ x: MAP_WIDTH, y: MAP_HEIGHT })
  })
})

describe('toClosedPath / toOpenPath', () => {
  const square = [
    { lon: -10, lat: 10 },
    { lon: 10, lat: 10 },
    { lon: 10, lat: -10 },
    { lon: -10, lat: -10 },
  ]

  it('starts with M, one L per remaining point, and closes with Z', () => {
    const d = toClosedPath(square)
    expect(d.startsWith('M')).toBe(true)
    expect(d.endsWith('Z')).toBe(true)
    expect(d.match(/L/g)).toHaveLength(square.length - 1)
  })

  it('omits the closing Z for an open path', () => {
    const d = toOpenPath(square)
    expect(d.startsWith('M')).toBe(true)
    expect(d.endsWith('Z')).toBe(false)
  })

  it('returns an empty string for no points', () => {
    expect(toClosedPath([])).toBe('')
    expect(toOpenPath([])).toBe('')
  })
})

describe('WORLD_LAND_PATH', () => {
  it('is a non-trivial, well-formed multi-subpath "d" string', () => {
    expect(WORLD_LAND_PATH.length).toBeGreaterThan(1000)
    expect(WORLD_LAND_PATH.startsWith('M')).toBe(true)
    expect(WORLD_LAND_PATH.endsWith('Z')).toBe(true)
  })

  it('has one M (move-to) opening every subpath it closes with Z', () => {
    const moveCount = WORLD_LAND_PATH.match(/M/g)?.length ?? 0
    const closeCount = WORLD_LAND_PATH.match(/Z/g)?.length ?? 0
    expect(moveCount).toBeGreaterThan(100)
    expect(moveCount).toBe(closeCount)
  })

  it('stays within the map viewBox', () => {
    // Every coordinate pair is written as "x,y" (from an M or L command,
    // e.g. "M12.3,45.6" or "L12.3,45.6") — capture each pair together so x
    // and y are checked against their own axis bound rather than both
    // against the wider MAP_WIDTH, which would let a corrupt y up to
    // MAP_WIDTH (double the real MAP_HEIGHT) slip past unnoticed.
    const pairs = [...WORLD_LAND_PATH.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)]
    expect(pairs.length).toBeGreaterThan(100)
    for (const [, x, y] of pairs) {
      expect(Number(x)).toBeGreaterThanOrEqual(0)
      expect(Number(x)).toBeLessThanOrEqual(MAP_WIDTH)
      expect(Number(y)).toBeGreaterThanOrEqual(0)
      expect(Number(y)).toBeLessThanOrEqual(MAP_HEIGHT)
    }
  })
})
