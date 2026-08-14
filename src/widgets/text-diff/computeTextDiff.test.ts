import { describe, expect, it } from 'vitest'
import {
  computeInlineDiff,
  computeLineDiff,
  inlineDiffToText,
  lineDiffToText,
} from './computeTextDiff'

describe('computeLineDiff', () => {
  it('reports identical text as no changes', () => {
    const result = computeLineDiff('a\nb\nc', 'a\nb\nc')
    expect(result.identical).toBe(true)
    expect(result.stats).toEqual({ additions: 0, deletions: 0 })
    expect(result.lines).toEqual([
      { type: 'unchanged', text: 'a' },
      { type: 'unchanged', text: 'b' },
      { type: 'unchanged', text: 'c' },
    ])
  })

  it('splits a multi-line hunk into one entry per line', () => {
    const result = computeLineDiff('a\nb\nc', 'x\ny\nc')
    expect(result.lines).toEqual([
      { type: 'removed', text: 'a' },
      { type: 'removed', text: 'b' },
      { type: 'added', text: 'x' },
      { type: 'added', text: 'y' },
      { type: 'unchanged', text: 'c' },
    ])
    expect(result.stats).toEqual({ additions: 2, deletions: 2 })
    expect(result.identical).toBe(false)
  })

  it('handles a pure addition with no removed lines', () => {
    const result = computeLineDiff('a', 'a\nb')
    expect(result.lines).toEqual([
      { type: 'unchanged', text: 'a' },
      { type: 'added', text: 'b' },
    ])
    expect(result.stats).toEqual({ additions: 1, deletions: 0 })
  })

  it('treats empty input as a single empty unchanged line', () => {
    const result = computeLineDiff('', '')
    expect(result.lines).toEqual([{ type: 'unchanged', text: '' }])
    expect(result.identical).toBe(true)
  })
})

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

describe('lineDiffToText', () => {
  it('renders a git-style +/-/space prefix per line', () => {
    const result = computeLineDiff('a\nb', 'a\nc')
    expect(lineDiffToText(result)).toBe('  a\n- b\n+ c')
  })
})

describe('inlineDiffToText', () => {
  it('wraps added/removed segments in bracket notation', () => {
    const result = computeInlineDiff('the quick fox', 'the slow fox', 'words')
    expect(inlineDiffToText(result)).toBe('the [-quick-]{+slow+} fox')
  })
})
