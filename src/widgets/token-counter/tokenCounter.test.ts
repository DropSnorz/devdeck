import { describe, expect, it } from 'vitest'
import { countChatGptTokens, countTextStats, estimateClaudeTokens } from './tokenCounter'

describe('countChatGptTokens', () => {
  it('returns 0 for empty text', () => {
    expect(countChatGptTokens('')).toBe(0)
  })

  it('matches the known o200k_base token count for a simple string', () => {
    // "Hello, world!" is a stable, well-known 4-token sequence under o200k_base.
    expect(countChatGptTokens('Hello, world!')).toBe(4)
  })

  it('grows with longer input', () => {
    const short = countChatGptTokens('The quick brown fox.')
    const long = countChatGptTokens('The quick brown fox jumps over the lazy dog, again and again.')
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

  it('is in the same rough order of magnitude as the exact GPT count', () => {
    const text = 'DevDeck is a client-side browser toolbox with small dev-utility widgets for everyday developer tasks.'
    const gpt = countChatGptTokens(text)
    const claude = estimateClaudeTokens(text)
    // Not asserting equality (Claude's real tokenizer differs from GPT's),
    // just that the estimate isn't wildly off for ordinary English prose.
    expect(claude).toBeGreaterThan(gpt * 0.5)
    expect(claude).toBeLessThan(gpt * 2)
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
