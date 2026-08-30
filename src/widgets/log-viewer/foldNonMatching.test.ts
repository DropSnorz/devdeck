import { describe, expect, it } from 'vitest'
import { computeFoldRanges } from './foldNonMatching'

/** Renders `computeFoldRanges`' offset ranges back into their covered line
 * numbers (1-based) against `text`, so assertions read as "lines 2-4" the
 * same way a human would describe the sample, instead of raw offsets. */
function hiddenLineNumbers(text: string, ranges: { from: number; to: number }[]): number[][] {
  const lines = text.split('\n')
  const lineStarts: number[] = []
  let pos = 0
  for (const line of lines) {
    lineStarts.push(pos)
    pos += line.length + 1
  }
  const lineNumberAt = (offset: number) => lineStarts.findIndex((start, i) => {
    const end = i + 1 < lineStarts.length ? lineStarts[i + 1] - 1 : text.length
    return offset >= start && offset <= end
  }) + 1

  return ranges.map((r) => {
    const first = lineNumberAt(r.from)
    const last = lineNumberAt(r.to)
    const result: number[] = []
    for (let n = first; n <= last; n++) result.push(n)
    return result
  })
}

describe('computeFoldRanges', () => {
  it('returns nothing to fold when there are no matches', () => {
    expect(computeFoldRanges('a\nb\nc', [], 0)).toEqual([])
  })

  it('folds every non-matching line with zero context', () => {
    const text = 'keep\nhide1\nhide2\nkeep'
    // Match sits on line 1 (offset 0) and line 4.
    const matches = [
      { from: 0, to: 4 },
      { from: text.length - 4, to: text.length },
    ]
    expect(hiddenLineNumbers(text, computeFoldRanges(text, matches, 0))).toEqual([[2, 3]])
  })

  it('keeps N lines of context around a match, grep -C style', () => {
    const lines = ['l1', 'l2', 'l3 MATCH', 'l4', 'l5', 'l6']
    const text = lines.join('\n')
    const matchStart = text.indexOf('MATCH')
    const matches = [{ from: matchStart, to: matchStart + 'MATCH'.length }]

    // contextLines: 1 keeps lines 2-4 (one above/below line 3), folds the rest.
    expect(hiddenLineNumbers(text, computeFoldRanges(text, matches, 1))).toEqual([[1], [5, 6]])
  })

  it('merges overlapping context windows from two nearby matches into one kept run', () => {
    const lines = ['l1 A', 'l2', 'l3', 'l4 B', 'l5']
    const text = lines.join('\n')
    const a = text.indexOf('A')
    const b = text.indexOf('B')
    const matches = [
      { from: a, to: a + 1 },
      { from: b, to: b + 1 },
    ]
    // contextLines: 1 keeps 1-2 (around A) and 3-5 (around B), adjacent, so
    // nothing ends up hidden.
    expect(computeFoldRanges(text, matches, 1)).toEqual([])
  })

  it('clamps context at the start and end of the document', () => {
    const lines = ['MATCH', 'l2', 'l3', 'l4', 'l5']
    const text = lines.join('\n')
    const matches = [{ from: 0, to: 'MATCH'.length }]
    // contextLines: 2 would reach line -1, clamped to the document start.
    expect(hiddenLineNumbers(text, computeFoldRanges(text, matches, 2))).toEqual([[4, 5]])
  })

  it('keeps everything when contextLines covers the whole document', () => {
    const text = 'l1\nl2 MATCH\nl3'
    const matchStart = text.indexOf('MATCH')
    const matches = [{ from: matchStart, to: matchStart + 'MATCH'.length }]
    expect(computeFoldRanges(text, matches, 10)).toEqual([])
  })

  it('drops a lone blank line rather than returning a zero-length range', () => {
    const text = 'MATCH_A\n\nMATCH_B'
    const b = text.indexOf('MATCH_B')
    const matches = [
      { from: 0, to: 'MATCH_A'.length },
      { from: b, to: b + 'MATCH_B'.length },
    ]
    const ranges = computeFoldRanges(text, matches, 0)
    expect(ranges).toEqual([])
    expect(ranges.every((r) => r.to > r.from)).toBe(true)
  })

  it('still folds a run that mixes a blank line with a non-blank one', () => {
    const text = 'MATCH_A\nhide1\n\nMATCH_B'
    const b = text.indexOf('MATCH_B')
    const matches = [
      { from: 0, to: 'MATCH_A'.length },
      { from: b, to: b + 'MATCH_B'.length },
    ]
    // Lines 2-3 ("hide1" and the blank line after it) are hidden together.
    expect(hiddenLineNumbers(text, computeFoldRanges(text, matches, 0))).toEqual([[2, 3]])
  })
})
