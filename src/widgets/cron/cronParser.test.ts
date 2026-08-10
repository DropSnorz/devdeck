import { describe, expect, it } from 'vitest'
import { CronParseError, getNextOccurrences, parseCron } from './cronParser'

describe('parseCron', () => {
  it('parses a bare wildcard field as its full range', () => {
    const fields = parseCron('* * * * *')
    expect(fields.minute.size).toBe(60)
    expect(fields.hour.size).toBe(24)
    expect(fields.dayOfMonth.size).toBe(31)
    expect(fields.month.size).toBe(12)
    expect(fields.dayOfWeek.size).toBe(7)
  })

  it('parses single exact values', () => {
    const fields = parseCron('30 4 1 1 0')
    expect(fields.minute).toEqual(new Set([30]))
    expect(fields.hour).toEqual(new Set([4]))
    expect(fields.dayOfMonth).toEqual(new Set([1]))
    expect(fields.month).toEqual(new Set([1]))
    expect(fields.dayOfWeek).toEqual(new Set([0]))
  })

  it('parses comma-separated lists', () => {
    const fields = parseCron('0,15,30,45 * * * *')
    expect(fields.minute).toEqual(new Set([0, 15, 30, 45]))
  })

  it('parses ranges', () => {
    const fields = parseCron('0 9-17 * * *')
    expect(fields.hour).toEqual(new Set([9, 10, 11, 12, 13, 14, 15, 16, 17]))
  })

  it('parses a bare step as "every N units"', () => {
    const fields = parseCron('*/15 * * * *')
    expect(fields.minute).toEqual(new Set([0, 15, 30, 45]))
  })

  it('parses a stepped range', () => {
    const fields = parseCron('0-30/10 * * * *')
    expect(fields.minute).toEqual(new Set([0, 10, 20, 30]))
  })

  it('parses "value/step" as "from value to the field max, stepped"', () => {
    const fields = parseCron('5/15 * * * *')
    expect(fields.minute).toEqual(new Set([5, 20, 35, 50]))
  })

  it('parses lists that mix ranges and single values', () => {
    const fields = parseCron('0 0 * * 1-3,5')
    expect(fields.dayOfWeek).toEqual(new Set([1, 2, 3, 5]))
  })

  it('accepts month and day-of-week names case-insensitively', () => {
    const fields = parseCron('0 9 * JAN,Feb mon-Fri')
    expect(fields.month).toEqual(new Set([1, 2]))
    expect(fields.dayOfWeek).toEqual(new Set([1, 2, 3, 4, 5]))
  })

  it('normalizes both 0 and 7 to Sunday in day-of-week', () => {
    expect(parseCron('0 0 * * 0').dayOfWeek).toEqual(new Set([0]))
    expect(parseCron('0 0 * * 7').dayOfWeek).toEqual(new Set([0]))
  })

  it('treats "?" as an alias for "*" in day-of-month/day-of-week', () => {
    const fields = parseCron('0 0 ? * MON')
    expect(fields.raw.dayOfMonth).toBe('*')
    expect(fields.dayOfWeek).toEqual(new Set([1]))
  })

  it('expands @daily and other shorthands', () => {
    expect(parseCron('@daily')).toEqual(parseCron('0 0 * * *'))
    expect(parseCron('@hourly')).toEqual(parseCron('0 * * * *'))
    expect(parseCron('@weekly')).toEqual(parseCron('0 0 * * 0'))
    expect(parseCron('@monthly')).toEqual(parseCron('0 0 1 * *'))
    expect(parseCron('@yearly')).toEqual(parseCron('0 0 1 1 *'))
  })

  it('rejects an empty expression', () => {
    expect(() => parseCron('')).toThrow(CronParseError)
    expect(() => parseCron('   ')).toThrow(CronParseError)
  })

  it('rejects the wrong number of fields', () => {
    expect(() => parseCron('* * * *')).toThrow(/5 fields/)
    expect(() => parseCron('* * * * * *')).toThrow(/5 fields/)
  })

  it('rejects a value out of range', () => {
    expect(() => parseCron('60 * * * *')).toThrow(CronParseError)
    expect(() => parseCron('* 24 * * *')).toThrow(CronParseError)
    expect(() => parseCron('* * 32 * *')).toThrow(CronParseError)
    expect(() => parseCron('* * * 13 *')).toThrow(CronParseError)
    expect(() => parseCron('* * * * 8')).toThrow(CronParseError)
  })

  it('rejects a non-numeric, non-alias token', () => {
    expect(() => parseCron('foo * * * *')).toThrow(CronParseError)
  })

  it('rejects an inverted range', () => {
    expect(() => parseCron('50-10 * * * *')).toThrow(/after range end/)
  })

  it('rejects a zero or non-numeric step', () => {
    expect(() => parseCron('*/0 * * * *')).toThrow(CronParseError)
    expect(() => parseCron('*/foo * * * *')).toThrow(CronParseError)
  })

  it('rejects an unknown @shorthand as an invalid field count', () => {
    expect(() => parseCron('@reboot')).toThrow(/5 fields/)
  })
})

describe('getNextOccurrences', () => {
  it('returns the requested count of future minute-aligned matches', () => {
    const from = new Date(2024, 0, 1, 10, 0, 0)
    const fields = parseCron('*/15 * * * *')
    const results = getNextOccurrences(fields, { count: 3, from })

    expect(results).toEqual([
      new Date(2024, 0, 1, 10, 15, 0),
      new Date(2024, 0, 1, 10, 30, 0),
      new Date(2024, 0, 1, 10, 45, 0),
    ])
  })

  it('is always strictly after the reference instant, even on an exact minute boundary', () => {
    const from = new Date(2024, 0, 1, 10, 0, 0)
    const fields = parseCron('0 * * * *') // top of every hour, including 10:00
    const [next] = getNextOccurrences(fields, { count: 1, from })
    expect(next).toEqual(new Date(2024, 0, 1, 11, 0, 0))
  })

  it('rolls over into the next day', () => {
    const from = new Date(2024, 0, 1, 23, 50, 0)
    const fields = parseCron('0 0 * * *')
    const [next] = getNextOccurrences(fields, { count: 1, from })
    expect(next).toEqual(new Date(2024, 0, 2, 0, 0, 0))
  })

  it('rolls over into the next month and year', () => {
    const from = new Date(2023, 11, 31, 23, 59, 0)
    const fields = parseCron('0 0 1 1 *') // Jan 1st
    const [next] = getNextOccurrences(fields, { count: 1, from })
    expect(next).toEqual(new Date(2024, 0, 1, 0, 0, 0))
  })

  it('applies the OR rule when both day-of-month and day-of-week are restricted', () => {
    // The 1st of the month OR a Monday — not the intersection of the two.
    const from = new Date(2024, 0, 1, 0, 0, 0) // Monday, Jan 1 2024
    const fields = parseCron('0 12 1 * 1')
    const results = getNextOccurrences(fields, { count: 2, from })

    expect(results[0]).toEqual(new Date(2024, 0, 1, 12, 0, 0)) // matches via day-of-month
    expect(results[1]).toEqual(new Date(2024, 0, 8, 12, 0, 0)) // matches via day-of-week (Monday)
  })

  it('uses AND when only one of day-of-month/day-of-week is restricted', () => {
    const from = new Date(2024, 0, 1, 0, 0, 0)
    const fields = parseCron('0 12 15 * *') // 15th of every month only
    const [next] = getNextOccurrences(fields, { count: 1, from })
    expect(next).toEqual(new Date(2024, 0, 15, 12, 0, 0))
  })

  it('finds a leap-day-only schedule in a leap year', () => {
    const from = new Date(2023, 0, 1, 0, 0, 0)
    const fields = parseCron('0 0 29 2 *')
    const [next] = getNextOccurrences(fields, { count: 1, from })
    expect(next).toEqual(new Date(2024, 1, 29, 0, 0, 0))
  })

  it('gives up after the search horizon for a schedule that can never match', () => {
    // February never has a 30th.
    const fields = parseCron('0 0 30 2 *')
    const results = getNextOccurrences(fields, {
      count: 1,
      from: new Date(2024, 0, 1),
      maxYearsAhead: 1,
    })
    expect(results).toHaveLength(0)
  })

  it('defaults to 3 occurrences from now', () => {
    const fields = parseCron('* * * * *')
    expect(getNextOccurrences(fields)).toHaveLength(3)
  })
})
