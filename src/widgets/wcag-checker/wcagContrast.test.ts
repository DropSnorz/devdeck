import { describe, expect, it } from 'vitest'
import { colord } from 'colord'
import { contrastRatio, evaluateWcag, formatRatio, relativeLuminance } from './wcagContrast'

describe('relativeLuminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance(colord('#000000'))).toBeCloseTo(0, 5)
    expect(relativeLuminance(colord('#ffffff'))).toBeCloseTo(1, 5)
  })
})

describe('contrastRatio', () => {
  it('is 21:1 for black on white', () => {
    expect(contrastRatio(colord('#000000'), colord('#ffffff'))).toBeCloseTo(21, 5)
  })

  it('is 1:1 for identical colors', () => {
    expect(contrastRatio(colord('#3b82f6'), colord('#3b82f6'))).toBeCloseTo(1, 5)
  })

  it('does not depend on argument order', () => {
    const a = colord('#336699')
    const b = colord('#f5f5f5')
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10)
  })

  it('matches the well-known #767676-on-white reference (~4.54:1)', () => {
    // WebAIM's canonical "just barely passes AA normal text on white" gray.
    expect(contrastRatio(colord('#767676'), colord('#ffffff'))).toBeCloseTo(4.54, 1)
  })
})

describe('evaluateWcag', () => {
  it('passes every criterion at 21:1', () => {
    const checks = evaluateWcag(21)
    expect(checks.every((check) => check.pass)).toBe(true)
  })

  it('fails every criterion at 1:1', () => {
    const checks = evaluateWcag(1)
    expect(checks.every((check) => check.pass)).toBe(false)
  })

  it('passes only the large-text and UI-component criteria at 3.5:1', () => {
    const byKey = Object.fromEntries(evaluateWcag(3.5).map((check) => [check.key, check.pass]))
    expect(byKey.largeAA).toBe(true)
    expect(byKey.uiComponents).toBe(true)
    expect(byKey.normalAA).toBe(false)
    expect(byKey.largeAAA).toBe(false)
    expect(byKey.normalAAA).toBe(false)
  })

  it('passes AA normal text but not AAA normal text at 5:1', () => {
    const byKey = Object.fromEntries(evaluateWcag(5).map((check) => [check.key, check.pass]))
    expect(byKey.normalAA).toBe(true)
    expect(byKey.normalAAA).toBe(false)
  })
})

describe('formatRatio', () => {
  it('formats with two decimal places and a :1 suffix', () => {
    expect(formatRatio(4.5)).toBe('4.50:1')
    expect(formatRatio(21)).toBe('21.00:1')
  })
})
