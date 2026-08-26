import { describe, expect, it } from 'vitest'
import { countTextStats, estimateTokens } from './tokenCounter'

describe('estimateTokens', () => {
  it('returns 0 for empty or whitespace-only text', () => {
    expect(estimateTokens('')).toBe(0)
    expect(estimateTokens('   ')).toBe(0)
  })

  it('returns at least 1 for any non-empty text', () => {
    expect(estimateTokens('a')).toBeGreaterThanOrEqual(1)
  })

  it('grows with longer input', () => {
    const short = estimateTokens('The quick brown fox.')
    const long = estimateTokens('The quick brown fox jumps over the lazy dog, again and again.')
    expect(long).toBeGreaterThan(short)
  })
})

describe('countTextStats', () => {
  it('counts characters and words', () => {
    expect(countTextStats('hello world')).toEqual({ characters: 11, words: 2 })
  })

  it('returns zero words for empty or whitespace-only text', () => {
    expect(countTextStats('')).toEqual({ characters: 0, words: 0 })
    expect(countTextStats('   ')).toEqual({ characters: 3, words: 0 })
  })

  it('collapses repeated whitespace when counting words', () => {
    expect(countTextStats('a   b\n\nc').words).toBe(3)
  })
})
