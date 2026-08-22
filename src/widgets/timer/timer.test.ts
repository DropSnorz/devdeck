import { describe, expect, it } from 'vitest'
import {
  clampPart,
  computeCountdownRemainingMs,
  computeStopwatchElapsedMs,
  COUNTDOWN_RING_CIRCUMFERENCE,
  countdownRingOffset,
  durationFromParts,
  formatClockDate,
  formatClockTime,
  formatDurationTime,
} from './timer'

describe('formatClockTime', () => {
  it('pads hours, minutes and seconds to two digits', () => {
    expect(formatClockTime(new Date(2024, 0, 1, 9, 5, 3))).toBe('09:05:03')
  })

  it('renders midnight and the last second of the day correctly', () => {
    expect(formatClockTime(new Date(2024, 0, 1, 0, 0, 0))).toBe('00:00:00')
    expect(formatClockTime(new Date(2024, 0, 1, 23, 59, 59))).toBe('23:59:59')
  })
})

describe('formatClockDate', () => {
  it('formats a locale-independent long date', () => {
    // 2024-01-01 is a Monday.
    expect(formatClockDate(new Date(2024, 0, 1))).toBe('Monday, January 1, 2024')
  })
})

describe('formatDurationTime', () => {
  it('formats sub-minute durations as mm:ss.cc', () => {
    expect(formatDurationTime(0)).toBe('00:00.00')
    expect(formatDurationTime(1234)).toBe('00:01.23')
    expect(formatDurationTime(65_430)).toBe('01:05.43')
  })

  it('expands to h:mm:ss.cc past one hour', () => {
    expect(formatDurationTime(3_661_500)).toBe('1:01:01.50')
  })

  it('clamps negative durations to zero', () => {
    expect(formatDurationTime(-500)).toBe('00:00.00')
  })
})

describe('durationFromParts', () => {
  it('combines hours, minutes and seconds into milliseconds', () => {
    expect(durationFromParts(1, 30, 15)).toBe((1 * 3600 + 30 * 60 + 15) * 1000)
    expect(durationFromParts(0, 0, 0)).toBe(0)
  })
})

describe('clampPart', () => {
  it('rounds to the nearest integer', () => {
    expect(clampPart(4.6, 59)).toBe(5)
  })

  it('clamps into [0, max]', () => {
    expect(clampPart(-3, 59)).toBe(0)
    expect(clampPart(200, 59)).toBe(59)
  })

  it('treats a non-finite value as 0', () => {
    expect(clampPart(NaN, 59)).toBe(0)
  })
})

describe('computeStopwatchElapsedMs', () => {
  it('returns the accumulated time while stopped', () => {
    expect(computeStopwatchElapsedMs({ accumulatedMs: 5000, startedAt: null }, 999_999)).toBe(5000)
  })

  it('adds the live segment while running', () => {
    expect(computeStopwatchElapsedMs({ accumulatedMs: 5000, startedAt: 1000 }, 4000)).toBe(8000)
  })

  it('never goes negative if `now` is somehow behind `startedAt`', () => {
    expect(computeStopwatchElapsedMs({ accumulatedMs: 5000, startedAt: 4000 }, 1000)).toBe(5000)
  })
})

describe('computeCountdownRemainingMs', () => {
  it('returns the stored remaining time while not running', () => {
    expect(computeCountdownRemainingMs({ running: false, endAt: 9999, remainingMs: 3000 }, 1000)).toBe(3000)
  })

  it('counts down toward endAt while running', () => {
    expect(computeCountdownRemainingMs({ running: true, endAt: 10_000, remainingMs: 3000 }, 4000)).toBe(6000)
  })

  it('clamps to zero once endAt has passed', () => {
    expect(computeCountdownRemainingMs({ running: true, endAt: 10_000, remainingMs: 3000 }, 15_000)).toBe(0)
  })
})

describe('countdownRingOffset', () => {
  it('is 0 (a full ring) at the start of the countdown', () => {
    expect(countdownRingOffset(10_000, 10_000)).toBe(0)
  })

  it('is the full circumference (an empty ring) once time runs out', () => {
    expect(countdownRingOffset(0, 10_000)).toBe(COUNTDOWN_RING_CIRCUMFERENCE)
  })

  it('is proportional to time remaining in between', () => {
    expect(countdownRingOffset(2500, 10_000)).toBeCloseTo(COUNTDOWN_RING_CIRCUMFERENCE * 0.75)
  })

  it('clamps remaining time outside [0, durationMs] into a full or empty ring', () => {
    expect(countdownRingOffset(15_000, 10_000)).toBe(0)
    expect(countdownRingOffset(-500, 10_000)).toBe(COUNTDOWN_RING_CIRCUMFERENCE)
  })

  it('reads a non-positive duration as already complete rather than dividing by zero', () => {
    expect(countdownRingOffset(0, 0)).toBe(COUNTDOWN_RING_CIRCUMFERENCE)
    expect(Number.isFinite(countdownRingOffset(0, 0))).toBe(true)
  })
})
