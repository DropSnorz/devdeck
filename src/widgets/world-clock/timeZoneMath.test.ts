import { describe, expect, it } from 'vitest'
import {
  dayOffsetLabel,
  formatOffsetLabel,
  formatZonedDateLabel,
  formatZonedTime,
  getUtcOffsetMinutes,
  getZonedHour,
  getZonedParts,
} from './timeZoneMath'

describe('getZonedParts / getUtcOffsetMinutes', () => {
  it('reads the wall-clock date/time a zone is at for a UTC instant', () => {
    const instant = new Date('2024-06-15T12:00:00Z')
    expect(getZonedParts(instant, 'Asia/Tokyo')).toEqual({
      year: 2024,
      month: 6,
      day: 15,
      hour: 21,
      minute: 0,
      second: 0,
    })
  })

  it('returns a positive offset east of UTC and negative west of UTC', () => {
    const instant = new Date('2024-06-15T12:00:00Z')
    expect(getUtcOffsetMinutes(instant, 'Asia/Tokyo')).toBe(9 * 60)
    expect(getUtcOffsetMinutes(instant, 'America/New_York')).toBe(-4 * 60) // EDT in June
  })

  it('accounts for DST at different times of year in the same zone', () => {
    expect(getUtcOffsetMinutes(new Date('2024-01-15T12:00:00Z'), 'America/New_York')).toBe(-5 * 60) // EST
    expect(getUtcOffsetMinutes(new Date('2024-07-15T12:00:00Z'), 'America/New_York')).toBe(-4 * 60) // EDT
  })

  it('handles a half-hour offset zone', () => {
    expect(getUtcOffsetMinutes(new Date('2024-06-15T12:00:00Z'), 'Asia/Kolkata')).toBe(5 * 60 + 30)
  })
})

describe('formatOffsetLabel', () => {
  it('formats whole-hour offsets without minutes', () => {
    expect(formatOffsetLabel(9 * 60)).toBe('UTC+9')
    expect(formatOffsetLabel(-5 * 60)).toBe('UTC-5')
    expect(formatOffsetLabel(0)).toBe('UTC+0')
  })

  it('formats fractional-hour offsets with minutes', () => {
    expect(formatOffsetLabel(5 * 60 + 30)).toBe('UTC+5:30')
    expect(formatOffsetLabel(-(9 * 60 + 30))).toBe('UTC-9:30')
  })
})

describe('formatZonedTime / formatZonedDateLabel', () => {
  it('formats a 12-hour time in the given zone', () => {
    const instant = new Date('1970-01-01T00:00:00Z')
    expect(formatZonedTime(instant, 'UTC')).toMatch(/12:00\s?AM/)
  })

  it('formats a short weekday/month/day label in the given zone', () => {
    const instant = new Date('2024-01-15T12:00:00Z')
    expect(formatZonedDateLabel(instant, 'UTC')).toBe('Mon, Jan 15')
  })
})

describe('dayOffsetLabel', () => {
  it('returns null when the zone is on the same calendar day as the reference', () => {
    const instant = new Date('2024-01-15T12:00:00Z')
    expect(dayOffsetLabel(instant, 'UTC', 'UTC')).toBeNull()
  })

  it('flags a zone that is a day ahead of the reference', () => {
    // 11pm UTC on the 15th is already 8am on the 16th in Tokyo.
    const instant = new Date('2024-01-15T23:00:00Z')
    expect(dayOffsetLabel(instant, 'Asia/Tokyo', 'UTC')).toBe('+1d')
  })

  it('flags a zone that is a day behind the reference', () => {
    const instant = new Date('2024-01-15T23:00:00Z')
    expect(dayOffsetLabel(instant, 'UTC', 'Asia/Tokyo')).toBe('-1d')
  })
})

describe('getZonedHour', () => {
  it('returns the 0-23 hour a zone is at', () => {
    expect(getZonedHour(new Date('2024-06-15T12:00:00Z'), 'Asia/Tokyo')).toBe(21)
  })
})
