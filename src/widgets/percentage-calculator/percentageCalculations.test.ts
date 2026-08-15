import { describe, expect, it } from 'vitest'
import { findWhole, percentChange, percentOf, whatPercent } from './percentageCalculations'

describe('percentOf', () => {
  it('computes X% of Y', () => {
    expect(percentOf(20, 50)).toBe(10)
    expect(percentOf(150, 10)).toBe(15)
    expect(percentOf(0, 100)).toBe(0)
  })
})

describe('whatPercent', () => {
  it('computes what percent one number is of another', () => {
    expect(whatPercent(10, 50)).toBe(20)
    expect(whatPercent(50, 50)).toBe(100)
  })

  it('returns null when the whole is zero', () => {
    expect(whatPercent(10, 0)).toBeNull()
  })
})

describe('findWhole', () => {
  it('computes the whole a part is a percentage of', () => {
    expect(findWhole(10, 20)).toBe(50)
  })

  it('returns null when the percent is zero', () => {
    expect(findWhole(10, 0)).toBeNull()
  })
})

describe('percentChange', () => {
  it('computes a positive change', () => {
    expect(percentChange(50, 75)).toBe(50)
  })

  it('computes a negative change', () => {
    expect(percentChange(80, 60)).toBe(-25)
  })

  it('returns null when starting from zero', () => {
    expect(percentChange(0, 10)).toBeNull()
  })
})
