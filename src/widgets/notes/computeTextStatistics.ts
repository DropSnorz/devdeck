export interface TextStatistics {
  characters: number
  charactersNoSpaces: number
  words: number
  lines: number
  paragraphs: number
  sentences: number
}

const WORDS_PER_MINUTE = 200

/** Counts sentences by looking for runs of text ending in `.`/`!`/`?`, then
 * — since real notes are often unfinished — counts one more if anything is
 * left over after the last terminator (e.g. "Done. Still writing" is 2). */
function countSentences(trimmed: string): number {
  if (!trimmed) return 0
  const terminated = trimmed.match(/[^.!?]*[.!?]+/g) ?? []
  const consumedLength = terminated.reduce((sum, part) => sum + part.length, 0)
  const remainder = trimmed.slice(consumedLength).trim()
  return terminated.length + (remainder ? 1 : 0)
}

export function computeTextStatistics(text: string): TextStatistics {
  const trimmed = text.trim()

  return {
    characters: text.length,
    charactersNoSpaces: text.replace(/\s/g, '').length,
    words: trimmed ? (trimmed.match(/\S+/g)?.length ?? 0) : 0,
    lines: text ? text.split('\n').length : 0,
    paragraphs: trimmed ? trimmed.split(/\n\s*\n/).filter((block) => block.trim() !== '').length : 0,
    sentences: countSentences(trimmed),
  }
}

/** Rounds up to the nearest minute, but never below 1 for any nonzero word
 * count — "1 min read" reads better than "0 min read" for a short note. */
export function estimateReadingTimeMinutes(words: number): number {
  if (words <= 0) return 0
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}
