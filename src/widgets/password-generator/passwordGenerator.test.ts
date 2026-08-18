import { describe, expect, it } from 'vitest'
import { buildCharset, CHARSETS, estimatePasswordStrength, generatePassword } from './passwordGenerator'

const ALL_ENABLED = {
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeAmbiguous: false,
}

describe('buildCharset', () => {
  it('concatenates only the enabled sets', () => {
    expect(
      buildCharset({
        uppercase: true,
        lowercase: false,
        numbers: true,
        symbols: false,
        excludeAmbiguous: false,
      }),
    ).toBe(CHARSETS.uppercase + CHARSETS.numbers)
  })

  it('returns an empty string when nothing is enabled', () => {
    expect(
      buildCharset({
        uppercase: false,
        lowercase: false,
        numbers: false,
        symbols: false,
        excludeAmbiguous: false,
      }),
    ).toBe('')
  })

  it('strips ambiguous characters when requested', () => {
    const charset = buildCharset({ ...ALL_ENABLED, excludeAmbiguous: true })
    for (const char of 'Il1O0o|') {
      expect(charset).not.toContain(char)
    }
    // Still has plenty of unambiguous characters left from each set.
    expect(charset).toContain('A')
    expect(charset).toContain('9')
  })
})

describe('generatePassword', () => {
  it('generates a password of the requested length', () => {
    const password = generatePassword({ ...ALL_ENABLED, length: 24 })
    expect(password).toHaveLength(24)
  })

  it('only uses characters from the enabled sets', () => {
    const password = generatePassword({
      uppercase: false,
      lowercase: true,
      numbers: true,
      symbols: false,
      excludeAmbiguous: false,
      length: 200,
    })
    expect(password).toMatch(/^[a-z0-9]+$/)
  })

  it('never includes ambiguous characters when excludeAmbiguous is set', () => {
    const password = generatePassword({ ...ALL_ENABLED, excludeAmbiguous: true, length: 500 })
    expect(password).not.toMatch(/[Il1O0o|]/)
  })

  it('returns an empty string when no character set is enabled', () => {
    expect(
      generatePassword({
        uppercase: false,
        lowercase: false,
        numbers: false,
        symbols: false,
        excludeAmbiguous: false,
        length: 16,
      }),
    ).toBe('')
  })

  it('returns an empty string for a non-positive length', () => {
    expect(generatePassword({ ...ALL_ENABLED, length: 0 })).toBe('')
    expect(generatePassword({ ...ALL_ENABLED, length: -5 })).toBe('')
  })

  it('produces different passwords across calls (overwhelmingly likely at length 32)', () => {
    const a = generatePassword({ ...ALL_ENABLED, length: 32 })
    const b = generatePassword({ ...ALL_ENABLED, length: 32 })
    expect(a).not.toBe(b)
  })
})

describe('estimatePasswordStrength', () => {
  it('returns zero bits and "Very weak" for an empty charset', () => {
    expect(estimatePasswordStrength(16, 0)).toEqual({ bits: 0, label: 'Very weak' })
  })

  it('increases the label as entropy grows', () => {
    expect(estimatePasswordStrength(4, 26).label).toBe('Very weak')
    expect(estimatePasswordStrength(8, 26).label).toBe('Fair')
    expect(estimatePasswordStrength(16, 26).label).toBe('Strong')
    expect(estimatePasswordStrength(32, 94).label).toBe('Very strong')
  })

  it('computes bits as length * log2(charsetSize), floored', () => {
    // log2(64) === 6 exactly, so 10 chars from a 64-char set is exactly 60 bits.
    expect(estimatePasswordStrength(10, 64).bits).toBe(60)
  })
})
