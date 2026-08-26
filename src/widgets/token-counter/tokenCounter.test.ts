import { describe, expect, it } from 'vitest'
import { countTextStats, estimateChatGptTokens, estimateClaudeTokens } from './tokenCounter'

describe('estimateChatGptTokens', () => {
  it('returns 0 for empty or whitespace-only text', () => {
    expect(estimateChatGptTokens('')).toBe(0)
    expect(estimateChatGptTokens('   ')).toBe(0)
  })

  it('returns at least 1 for any non-empty text', () => {
    expect(estimateChatGptTokens('a')).toBeGreaterThanOrEqual(1)
  })

  it('grows with longer input', () => {
    const short = estimateChatGptTokens('The quick brown fox.')
    const long = estimateChatGptTokens('The quick brown fox jumps over the lazy dog, again and again.')
    expect(long).toBeGreaterThan(short)
  })
})

describe('estimateClaudeTokens', () => {
  it('returns 0 for empty or whitespace-only text', () => {
    expect(estimateClaudeTokens('')).toBe(0)
    expect(estimateClaudeTokens('   ')).toBe(0)
  })

  it('returns at least 1 for any non-empty text', () => {
    expect(estimateClaudeTokens('a')).toBeGreaterThanOrEqual(1)
  })

  it('grows with longer input', () => {
    const short = estimateClaudeTokens('The quick brown fox.')
    const long = estimateClaudeTokens('The quick brown fox jumps over the lazy dog, again and again.')
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
