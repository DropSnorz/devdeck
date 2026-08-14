import { diffChars, diffWords, diffLines } from 'diff'

export type DiffGranularity = 'lines' | 'words' | 'chars'

export type DiffPartType = 'added' | 'removed' | 'unchanged'

export interface DiffLine {
  type: DiffPartType
  text: string
}

export interface DiffSegment {
  type: DiffPartType
  text: string
}

export interface DiffStats {
  additions: number
  deletions: number
}

export interface LineDiffResult {
  lines: DiffLine[]
  stats: DiffStats
  identical: boolean
}

export interface InlineDiffResult {
  segments: DiffSegment[]
  stats: DiffStats
  identical: boolean
}

function partType(part: { added?: boolean; removed?: boolean }): DiffPartType {
  return part.added ? 'added' : part.removed ? 'removed' : 'unchanged'
}

/** Line-level diff, one `DiffLine` per source line rather than per jsdiff
 * hunk — `diffLines` groups runs of consecutive added/removed/unchanged
 * lines into a single hunk whose `value` joins them with `\n`, which isn't
 * what a line-by-line view wants to render. */
export function computeLineDiff(original: string, changed: string): LineDiffResult {
  // Without ignoreNewlineAtEof, jsdiff treats a final line lacking a
  // trailing newline as a different token than the "same" line with one —
  // e.g. diffLines('a', 'a\nb') reports the whole input replaced instead
  // of just an appended 'b' — which isn't the line-by-line comparison a
  // diff widget's user expects from two plain text boxes.
  const parts = diffLines(original, changed, { ignoreNewlineAtEof: true })
  // Two empty inputs produce zero hunks rather than one empty-unchanged
  // hunk; render that the same way `computeLineDiff('a', 'a')` would.
  if (parts.length === 0) {
    return { lines: [{ type: 'unchanged', text: '' }], stats: { additions: 0, deletions: 0 }, identical: true }
  }

  const lines: DiffLine[] = []
  let additions = 0
  let deletions = 0

  for (const part of parts) {
    const type = partType(part)
    // Every hunk except a final line with no trailing newline ends in
    // '\n' — splitting that raw would produce a spurious empty line at
    // the end of each hunk, so strip exactly one trailing newline first.
    const value = part.value.endsWith('\n') ? part.value.slice(0, -1) : part.value
    for (const text of value.split('\n')) {
      lines.push({ type, text })
      if (type === 'added') additions++
      else if (type === 'removed') deletions++
    }
  }

  return { lines, stats: { additions, deletions }, identical: additions === 0 && deletions === 0 }
}

/** Copy-to-clipboard format for line diffs: a git-style `+`/`-`/` ` prefix
 * per line, so pasting the copied text elsewhere still reads as a diff. */
export function lineDiffToText(result: LineDiffResult): string {
  const prefix: Record<DiffPartType, string> = { added: '+ ', removed: '- ', unchanged: '  ' }
  return result.lines.map((line) => `${prefix[line.type]}${line.text}`).join('\n')
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
