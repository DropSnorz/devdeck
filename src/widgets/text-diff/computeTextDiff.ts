import { diffChars, diffWords } from 'diff'

export type DiffGranularity = 'lines' | 'words' | 'chars'

export type DiffPartType = 'added' | 'removed' | 'unchanged'

export interface DiffSegment {
  type: DiffPartType
  text: string
}

export interface DiffStats {
  additions: number
  deletions: number
}

export interface InlineDiffResult {
  segments: DiffSegment[]
  stats: DiffStats
  identical: boolean
}

function partType(part: { added?: boolean; removed?: boolean }): DiffPartType {
  return part.added ? 'added' : part.removed ? 'removed' : 'unchanged'
}

/** Copy-to-clipboard format for word/char diffs: common `{+added+}` /
 * `[-removed-]` bracket notation (as used by e.g. git's word-diff mode),
 * since there's no per-line prefix to hang the change off of here. */
export function inlineDiffToText(result: InlineDiffResult): string {
  return result.segments
    .map((segment) => {
      if (segment.type === 'added') return `{+${segment.text}+}`
      if (segment.type === 'removed') return `[-${segment.text}-]`
      return segment.text
    })
    .join('')
}

function countUnits(text: string, granularity: 'words' | 'chars'): number {
  if (granularity === 'chars') return text.length
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

/** Word- or character-level diff, rendered as one continuous flow of
 * segments rather than lines — the natural read for edits smaller than a
 * full line (a renamed variable, a fixed typo). */
export function computeInlineDiff(
  original: string,
  changed: string,
  granularity: 'words' | 'chars',
): InlineDiffResult {
  const parts = granularity === 'words' ? diffWords(original, changed) : diffChars(original, changed)
  let additions = 0
  let deletions = 0
  const segments: DiffSegment[] = parts.map((part) => {
    const type = partType(part)
    if (type === 'added') additions += countUnits(part.value, granularity)
    else if (type === 'removed') deletions += countUnits(part.value, granularity)
    return { type, text: part.value }
  })

  return { segments, stats: { additions, deletions }, identical: additions === 0 && deletions === 0 }
}
