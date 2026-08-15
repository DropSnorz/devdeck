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

  it('labels non-finite results instead of printing "Infinity"/"NaN" from a bare toString', () => {
    expect(formatNumber(Infinity)).toBe('Infinity')
    expect(formatNumber(-Infinity)).toBe('-Infinity')
    expect(formatNumber(NaN)).toBe('NaN')
  })
})
