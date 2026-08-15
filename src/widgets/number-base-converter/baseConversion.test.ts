import { describe, expect, it } from 'vitest'
import { COMMON_BASES, formatInBase, parseInBase } from './baseConversion'

describe('parseInBase', () => {
  it('parses digits in the given base', () => {
    expect(parseInBase('ff', 16)).toBe(255n)
    expect(parseInBase('101', 2)).toBe(5n)
    expect(parseInBase('777', 8)).toBe(511n)
    expect(parseInBase('a', 12)).toBe(10n)
  })

  it('is case-insensitive for alphabetic digits', () => {
    expect(parseInBase('FF', 16)).toBe(255n)
  })

  it('handles a leading minus sign', () => {
    expect(parseInBase('-ff', 16)).toBe(-255n)
  })

  it('returns null for empty or whitespace-only input', () => {
    expect(parseInBase('', 10)).toBeNull()
    expect(parseInBase('   ', 10)).toBeNull()
    expect(parseInBase('-', 10)).toBeNull()
  })

  it('returns null for a digit outside the given base', () => {
    expect(parseInBase('2', 2)).toBeNull()
    expect(parseInBase('g', 16)).toBeNull()
    expect(parseInBase('12c', 12)).toBeNull()
  })

  it('round-trips values far past Number.MAX_SAFE_INTEGER', () => {
    const huge = '123456789012345678901234567890'
    expect(parseInBase(huge, 10)).toBe(BigInt(huge))
  })
})

describe('formatInBase', () => {
  it('formats zero as "0"', () => {
    expect(formatInBase(0n, 16)).toBe('0')
  })

  it('formats positive values in the given base', () => {
    expect(formatInBase(255n, 16)).toBe('ff')
    expect(formatInBase(5n, 2)).toBe('101')
    expect(formatInBase(10n, 12)).toBe('a')
  })

  it('formats negative values with a leading minus sign', () => {
    expect(formatInBase(-255n, 16)).toBe('-ff')
  })

  it('round-trips through parseInBase for every common base', () => {
    for (const { base } of COMMON_BASES) {
      const value = 12345n
      expect(parseInBase(formatInBase(value, base), base)).toBe(value)
    }
  })
})
