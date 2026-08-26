/** Pure counting logic for the Token Counter widget. No React here so it
 * can be unit-tested and reused without a DOM. */

/** Neither OpenAI nor Anthropic publish a tokenizer that can run fully
 * offline for every current model (OpenAI's real BPE tables exist but are
 * hundreds of KB to megabytes each; Anthropic doesn't publish one at all),
 * and DevDeck widgets don't call out to an API or ship a key. This is a
 * rough, provider-agnostic estimate instead: a blend of a word-based guess
 * (~1.3 tokens/word for English prose) and a character-based guess
 * (~4 chars/token), which stays reasonable across prose and code-like text
 * without pretending to be exact for any one model's real tokenizer. */
export function estimateTokens(text: string): number {
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
