import { describe, expect, it } from 'vitest'
import { computeStatistics, parseNumberList } from './computeStatistics'

describe('parseNumberList', () => {
  it('splits on commas, whitespace, and newlines', () => {
    expect(parseNumberList('1, 2 3\n4')).toEqual([1, 2, 3, 4])
  })

  it('drops tokens that are not valid numbers', () => {
    expect(parseNumberList('1, foo, 2, , 3')).toEqual([1, 2, 3])
  })

  it('returns an empty list for empty input', () => {
    expect(parseNumberList('')).toEqual([])
    expect(parseNumberList('   ')).toEqual([])
  })

  it('handles negative numbers and decimals', () => {
    expect(parseNumberList('-1.5, 2.25, -3')).toEqual([-1.5, 2.25, -3])
  })
})

describe('computeStatistics', () => {
  it('returns null for an empty list', () => {
    expect(computeStatistics([])).toBeNull()
  })

  it('computes count, sum, min, max, and range', () => {
    const stats = computeStatistics([4, 8, 15, 16, 23, 42])
    expect(stats?.count).toBe(6)
    expect(stats?.sum).toBe(108)
    expect(stats?.min).toBe(4)
    expect(stats?.max).toBe(42)
    expect(stats?.range).toBe(38)
  })

  it('computes the mean', () => {
    expect(computeStatistics([2, 4, 6])?.mean).toBe(4)
  })

  it('computes the median for an odd-length list', () => {
    expect(computeStatistics([5, 1, 3])?.median).toBe(3)
  })

  it('computes the median for an even-length list as the average of the middle two', () => {
    expect(computeStatistics([1, 2, 3, 4])?.median).toBe(2.5)
  })

  it('finds the mode, including ties, sorted ascending', () => {
    expect(computeStatistics([1, 2, 2, 3, 3, 4])?.mode).toEqual([2, 3])
  })

  it('returns an empty mode when nothing repeats', () => {
    expect(computeStatistics([1, 2, 3])?.mode).toEqual([])
  })

  it('computes sample variance and standard deviation', () => {
    const stats = computeStatistics([2, 4, 4, 4, 5, 5, 7, 9])
    expect(stats?.variance).toBeCloseTo(4.571429, 5)
    expect(stats?.standardDeviation).toBeCloseTo(2.138090, 5)
  })

  it('treats a single value as having zero variance', () => {
    const stats = computeStatistics([42])
    expect(stats?.variance).toBe(0)
    expect(stats?.standardDeviation).toBe(0)
    expect(stats?.mean).toBe(42)
    expect(stats?.median).toBe(42)
  })
})
