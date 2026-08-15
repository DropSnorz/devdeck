import { describe, expect, it } from 'vitest'
import { formatNumber } from './formatNumber'

describe('formatNumber', () => {
  it('prints integers with no decimal point', () => {
    expect(formatNumber(42)).toBe('42')
    expect(formatNumber(-7)).toBe('-7')
    expect(formatNumber(0)).toBe('0')
  })

  it('rounds to the given precision and strips trailing zeros', () => {
    expect(formatNumber(1 / 3)).toBe('0.333333')
    expect(formatNumber(1.5)).toBe('1.5')
    expect(formatNumber(2.000001, 3)).toBe('2')
  })

  it('supports a custom precision', () => {
    expect(formatNumber(1 / 3, 2)).toBe('0.33')
  })

  it('explicitly handles Infinity, -Infinity, and NaN rather than relying on a bare toString', () => {
    expect(formatNumber(Infinity)).toBe('Infinity')
    expect(formatNumber(-Infinity)).toBe('-Infinity')
    expect(formatNumber(NaN)).toBe('NaN')
  })

  it('falls back to scientific notation instead of printing a nonzero value as "0"', () => {
    expect(formatNumber(1 / 1073741824)).toBe('9.313226e-10') // 1 byte in GiB
    expect(formatNumber(-1 / 1073741824)).toBe('-9.313226e-10')
  })

  it('still prints exact zero as "0", not scientific notation', () => {
    expect(formatNumber(0)).toBe('0')
  })

  it('rejects a non-integer or out-of-range precision', () => {
    expect(() => formatNumber(1.5, 1.5)).toThrow(RangeError)
    expect(() => formatNumber(1.5, -1)).toThrow(RangeError)
    expect(() => formatNumber(1.5, 101)).toThrow(RangeError)
  })

  it('accepts the boundary precisions 0 and 100', () => {
    expect(formatNumber(1.6, 0)).toBe('2')
    expect(formatNumber(1 / 3, 100)).toMatch(/^0\.3+$/)
  })
})
