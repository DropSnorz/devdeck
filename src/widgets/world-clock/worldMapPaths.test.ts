import { describe, expect, it } from 'vitest'
import { CONTINENTS, MAP_HEIGHT, MAP_WIDTH, project, toClosedPath, toOpenPath } from './worldMapPaths'

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

describe('CONTINENTS', () => {
  it('gives every continent outline at least 3 points to form a shape', () => {
    for (const outline of CONTINENTS) {
      expect(outline.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('produces a valid closed path for every continent', () => {
    for (const outline of CONTINENTS) {
      const d = toClosedPath(outline)
      expect(d.startsWith('M')).toBe(true)
      expect(d.endsWith('Z')).toBe(true)
    }
  })
})
