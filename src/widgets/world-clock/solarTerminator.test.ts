import { describe, expect, it } from 'vitest'
import { computeNightPolygon, isNight, solarDeclinationDeg, subsolarLongitudeDeg } from './solarTerminator'

describe('solarDeclinationDeg', () => {
  it('is near its maximum (+23.44) at the June solstice', () => {
    expect(solarDeclinationDeg(new Date('2024-06-21T00:00:00Z'))).toBeGreaterThan(23)
  })

  it('is near its minimum (-23.44) at the December solstice', () => {
    expect(solarDeclinationDeg(new Date('2024-12-21T00:00:00Z'))).toBeLessThan(-23)
  })

  it('is near zero at the equinoxes', () => {
    expect(Math.abs(solarDeclinationDeg(new Date('2024-03-20T12:00:00Z')))).toBeLessThan(2)
    expect(Math.abs(solarDeclinationDeg(new Date('2024-09-22T12:00:00Z')))).toBeLessThan(2)
  })
})

describe('subsolarLongitudeDeg', () => {
  it('sits at longitude 0 when it is UTC noon', () => {
    expect(subsolarLongitudeDeg(new Date('2024-06-15T12:00:00Z'))).toBeCloseTo(0, 5)
  })

  it('sits at the date line when it is UTC midnight', () => {
    expect(Math.abs(subsolarLongitudeDeg(new Date('2024-06-15T00:00:00Z')))).toBeCloseTo(180, 5)
  })

  it('moves west by 15 degrees per hour', () => {
    expect(subsolarLongitudeDeg(new Date('2024-06-15T06:00:00Z'))).toBeCloseTo(90, 5)
    expect(subsolarLongitudeDeg(new Date('2024-06-15T18:00:00Z'))).toBeCloseTo(-90, 5)
  })
})

describe('isNight', () => {
  it('puts the subsolar point in daytime', () => {
    const date = new Date('2024-06-15T12:00:00Z')
    expect(isNight(0, subsolarLongitudeDeg(date), date)).toBe(false)
  })

  it('puts the point opposite the subsolar point in nighttime', () => {
    const date = new Date('2024-06-15T12:00:00Z')
    expect(isNight(0, subsolarLongitudeDeg(date) + 180, date)).toBe(true)
  })

  it('keeps the winter pole dark and the summer pole lit at a solstice', () => {
    const juneSolstice = new Date('2024-06-21T00:00:00Z')
    expect(isNight(90, 0, juneSolstice)).toBe(false) // north pole: summer
    expect(isNight(-90, 0, juneSolstice)).toBe(true) // south pole: winter
  })
})

describe('computeNightPolygon', () => {
  it('produces one point per step plus the two pole-closing corners', () => {
    const points = computeNightPolygon(new Date('2024-06-21T00:00:00Z'), 36)
    expect(points).toHaveLength(36 + 1 + 2)
  })

  it('spans the full longitude range and stays within valid latitudes', () => {
    const points = computeNightPolygon(new Date('2024-03-20T12:00:00Z'))
    expect(points[0].lon).toBe(-180)
    expect(points[points.length - 3].lon).toBe(180)
    for (const p of points) {
      expect(p.lat).toBeGreaterThanOrEqual(-90)
      expect(p.lat).toBeLessThanOrEqual(90)
    }
  })

  it('closes across the north pole in northern winter and the south pole in northern summer', () => {
    const decClose = computeNightPolygon(new Date('2024-12-21T00:00:00Z'))
    expect(decClose[decClose.length - 1].lat).toBe(90)

    const juneClose = computeNightPolygon(new Date('2024-06-21T00:00:00Z'))
    expect(juneClose[juneClose.length - 1].lat).toBe(-90)
  })
})
