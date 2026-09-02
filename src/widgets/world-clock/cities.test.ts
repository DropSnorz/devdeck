import { describe, expect, it } from 'vitest'
import { WORLD_CITIES, defaultCityIds, getCity } from './cities'

describe('WORLD_CITIES', () => {
  it('has unique ids', () => {
    const ids = WORLD_CITIES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('keeps every coordinate within valid latitude/longitude ranges', () => {
    for (const city of WORLD_CITIES) {
      expect(city.lat).toBeGreaterThanOrEqual(-90)
      expect(city.lat).toBeLessThanOrEqual(90)
      expect(city.lon).toBeGreaterThanOrEqual(-180)
      expect(city.lon).toBeLessThanOrEqual(180)
    }
  })

  it('gives every entry a non-empty IANA time zone', () => {
    for (const city of WORLD_CITIES) {
      expect(city.tz.length).toBeGreaterThan(0)
      expect(() => new Intl.DateTimeFormat('en-US', { timeZone: city.tz })).not.toThrow()
    }
  })
})

describe('getCity', () => {
  it('finds a city by id', () => {
    expect(getCity('tokyo')?.city).toBe('Tokyo')
  })

  it('returns undefined for an unknown id', () => {
    expect(getCity('atlantis')).toBeUndefined()
  })
})

describe('defaultCityIds', () => {
  it('leads with the matching curated city when the local zone is one of them', () => {
    expect(defaultCityIds('Asia/Tokyo')[0]).toBe('tokyo')
  })

  it('falls back to a fixed, deterministic trio when the local zone matches no curated city', () => {
    expect(defaultCityIds('UTC')).toEqual(['london', 'new-york', 'tokyo'])
  })

  it('never returns duplicate ids even when the local city is already in the fallback set', () => {
    const ids = defaultCityIds('Europe/London')
    expect(new Set(ids).size).toBe(ids.length)
  })
})
