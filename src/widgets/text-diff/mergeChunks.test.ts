import { describe, expect, it } from 'vitest'
import { Text } from '@codemirror/state'
import { Chunk } from '@codemirror/merge'
import { chunkStats, chunksToDiffText, currentChunkIndex } from './mergeChunks'

/** Real `Chunk.build` output — pure, no DOM/EditorView needed — so these
 * tests exercise the exact chunk shapes `MergeDiffView` will hand to the
 * helpers under test, not a hand-rolled approximation of them. */
function chunksFor(a: string, b: string) {
  return Chunk.build(Text.of(a.split('\n')), Text.of(b.split('\n')))
}

describe('chunkStats', () => {
  it('reports zero for identical text', () => {
    const a = 'a\nb\nc'
    const chunks = chunksFor(a, a)
    expect(chunkStats(chunks, a, a)).toEqual({ additions: 0, deletions: 0 })
  })

  it('counts a same-size line replacement', () => {
    const a = 'a\nb\nc'
    const b = 'x\ny\nc'
    expect(chunkStats(chunksFor(a, b), a, b)).toEqual({ additions: 2, deletions: 2 })
  })

  it('counts a pure insertion with no deletions', () => {
    // Inserted in the middle, not at the end — appending directly after the
    // final line is a genuinely ambiguous case for a line-aligned diff (see
    // the "no trailing newline" test below) and isn't what this case means
    // to exercise.
    const a = 'a\nb\nd'
    const b = 'a\nb\nc\nd'
    expect(chunkStats(chunksFor(a, b), a, b)).toEqual({ additions: 1, deletions: 0 })
  })

  it('counts a pure deletion with no additions', () => {
    const a = 'a\nb\nc\nd'
    const b = 'a\nb\nd'
    expect(chunkStats(chunksFor(a, b), a, b)).toEqual({ additions: 0, deletions: 1 })
  })

  it('sums across multiple separate chunks', () => {
    const a = 'a\nb\nc\nd\ne'
    const b = 'x\nb\nc\nd\ny'
    expect(chunkStats(chunksFor(a, b), a, b)).toEqual({ additions: 2, deletions: 2 })
  })
})

describe('currentChunkIndex', () => {
  const a = 'a\nb\nc\nd\ne'
  const b = 'x\nb\nc\nd\ny'
  const chunks = chunksFor(a, b)

  it('returns -1 when there are no chunks', () => {
    expect(currentChunkIndex([], 0)).toBe(-1)
  })

  it('finds the chunk a position falls inside', () => {
    // chunks[0] covers the first line ('a' -> 'x'), chunks[1] the last ('e' -> 'y')
    expect(currentChunkIndex(chunks, 0)).toBe(0)
  })

  it('falls back to the last chunk once past the end of the document', () => {
    expect(currentChunkIndex(chunks, a.length)).toBe(chunks.length - 1)
  })
})

describe('chunksToDiffText', () => {
  it('renders a git-style +/-/space prefix per line', () => {
    const a = 'a\nb'
    const b = 'a\nc'
    expect(chunksToDiffText(a, b, chunksFor(a, b))).toBe('  a\n- b\n+ c')
  })

  it('renders identical text as all-unchanged lines', () => {
    const a = 'a\nb\nc'
    expect(chunksToDiffText(a, a, chunksFor(a, a))).toBe('  a\n  b\n  c')
  })

  it('handles a pure insertion in the middle', () => {
    const a = 'a\nb\nd'
    const b = 'a\nb\nc\nd'
    expect(chunksToDiffText(a, b, chunksFor(a, b))).toBe('  a\n  b\n+ c\n  d')
  })

  it('treats appending a new final line as replacing the old last line, not a pure addition', () => {
    // Deliberately documents a real behavior difference from the old
    // jsdiff-based `computeLineDiff` (which special-cased
    // `ignoreNewlineAtEof` so this read as "'a' unchanged, 'b' added").
    // `@codemirror/merge`'s `Chunk.build` doesn't have an equivalent special
    // case: appending a line after a final line that previously had no
    // trailing newline is seen as replacing that whole line, since the
    // character-level change (inserting "\nb" right after "a") falls inside
    // what was the document's only line, and chunk boundaries must snap to
    // whole lines. Not a bug in `chunksToDiffText` — it faithfully reflects
    // whatever chunks it's given.
    const a = 'a'
    const b = 'a\nb'
    expect(chunksToDiffText(a, b, chunksFor(a, b))).toBe('- a\n+ a\n+ b')
  })
})
