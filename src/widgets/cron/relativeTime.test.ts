import { describe, expect, it } from 'vitest'
import { formatRelativeTime } from './relativeTime'

const FROM = new Date(2024, 0, 1, 12, 0, 0)

function plus(ms: number): Date {
  return new Date(FROM.getTime() + ms)
}

describe('formatRelativeTime', () => {
  it('formats seconds', () => {
    expect(formatRelativeTime(plus(5 * 1000), FROM)).toBe('in 5s')
  })

  it('formats minutes', () => {
    expect(formatRelativeTime(plus(2 * 60 * 1000), FROM)).toBe('in 2m')
  })

  it('formats hours', () => {
    expect(formatRelativeTime(plus(3 * 60 * 60 * 1000), FROM)).toBe('in 3h')
  })

  it('formats days', () => {
    expect(formatRelativeTime(plus(2 * 24 * 60 * 60 * 1000), FROM)).toBe(
      'in 2d',
    )
  })

  it('formats months', () => {
    expect(formatRelativeTime(plus(60 * 24 * 60 * 60 * 1000), FROM)).toBe(
      'in 2mo',
    )
  })

  it('formats years', () => {
    expect(formatRelativeTime(plus(400 * 24 * 60 * 60 * 1000), FROM)).toBe(
      'in 1y',
    )
  })

  it('picks the largest unit that fits, flooring the remainder', () => {
    // 1 day + 1 hour should still read as "in 1d", not round up.
    expect(formatRelativeTime(plus(25 * 60 * 60 * 1000), FROM)).toBe('in 1d')
  })

  it('returns "now" for a target at or before the reference instant', () => {
    expect(formatRelativeTime(FROM, FROM)).toBe('now')
    expect(formatRelativeTime(plus(-1000), FROM)).toBe('now')
  })

  it('defaults "from" to the current time', () => {
    const soon = new Date(Date.now() + 10_000)
    // Some real time elapses between building `soon` and the call below, so
    // pin a tolerant range rather than an exact second count.
    expect(formatRelativeTime(soon)).toMatch(/^in (9|10)s$/)
  })
})
