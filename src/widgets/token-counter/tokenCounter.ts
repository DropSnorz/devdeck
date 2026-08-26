/** Pure counting logic for the Token Counter widget. No React here so it
 * can be unit-tested and reused without a DOM. */

import { countTokens } from 'gpt-tokenizer'

/** Exact token count using the same BPE tokenizer (o200k_base) current
 * ChatGPT models (GPT-4o, GPT-5) actually use. Runs entirely client-side,
 * no API call. */
export function countChatGptTokens(text: string): number {
  if (!text) return 0
  return countTokens(text)
}

/** Anthropic doesn't publish Claude's tokenizer, and the only way to get an
 * exact count is the `count_tokens` API endpoint (requires a key and a
 * network call). This is a rough, provider-agnostic estimate instead:
 * it blends a word-based guess (~1.3 tokens/word for English prose) with
 * a character-based guess (~4 chars/token), which keeps it reasonable
 * across both prose and code-like text without pretending to be exact. */
export function estimateClaudeTokens(text: string): number {
  if (!text.trim()) return 0
  const wordCount = text.split(/\s+/).filter(Boolean).length
  const byWords = wordCount * 1.3
  const byChars = text.length / 4
  return Math.max(1, Math.round((byWords + byChars) / 2))
}

export interface TextStats {
  characters: number
  words: number
}

export function countTextStats(text: string): TextStats {
  return {
    characters: text.length,
    words: text.trim() ? text.trim().split(/\s+/).length : 0,
  }
}
