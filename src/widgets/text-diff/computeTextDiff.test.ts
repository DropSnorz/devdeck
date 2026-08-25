import { describe, expect, it } from 'vitest'
import { computeInlineDiff, inlineDiffToText } from './computeTextDiff'

describe('computeInlineDiff', () => {
  it('reports identical text as no changes', () => {
    const result = computeInlineDiff('hello world', 'hello world', 'words')
    expect(result.identical).toBe(true)
    expect(result.stats).toEqual({ additions: 0, deletions: 0 })
  })

  it('finds a single-word substitution at word granularity', () => {
    const result = computeInlineDiff('the quick fox', 'the slow fox', 'words')
    expect(result.segments.map((s) => [s.type, s.text])).toEqual([
      ['unchanged', 'the '],
      ['removed', 'quick'],
      ['added', 'slow'],
      ['unchanged', ' fox'],
    ])
    expect(result.stats).toEqual({ additions: 1, deletions: 1 })
  })

  it('diffs at character granularity', () => {
    const result = computeInlineDiff('cat', 'car', 'chars')
    expect(result.segments.map((s) => [s.type, s.text])).toEqual([
      ['unchanged', 'ca'],
      ['removed', 't'],
      ['added', 'r'],
    ])
    expect(result.stats).toEqual({ additions: 1, deletions: 1 })
  })
})

describe('inlineDiffToText', () => {
  it('wraps added/removed segments in bracket notation', () => {
    const result = computeInlineDiff('the quick fox', 'the slow fox', 'words')
    expect(inlineDiffToText(result)).toBe('the [-quick-]{+slow+} fox')
  })
})
