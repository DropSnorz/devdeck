import { describe, expect, it } from 'vitest'
import { computeTextStatistics, estimateReadingTimeMinutes } from './computeTextStatistics'

describe('computeTextStatistics', () => {
  it('returns all zeros for empty input', () => {
    expect(computeTextStatistics('')).toEqual({
      characters: 0,
      charactersNoSpaces: 0,
      words: 0,
      lines: 0,
      paragraphs: 0,
      sentences: 0,
    })
  })

  it('counts characters, including whitespace', () => {
    expect(computeTextStatistics('a b').characters).toBe(3)
    expect(computeTextStatistics('a b').charactersNoSpaces).toBe(2)
  })

  it('counts words separated by any whitespace', () => {
    expect(computeTextStatistics('one two  three\nfour').words).toBe(4)
  })

  it('treats whitespace-only input as zero words', () => {
    expect(computeTextStatistics('   \n  ').words).toBe(0)
  })

  it('counts lines, including a trailing empty one', () => {
    expect(computeTextStatistics('one\ntwo\nthree').lines).toBe(3)
    expect(computeTextStatistics('one\ntwo\n').lines).toBe(3)
    expect(computeTextStatistics('one line').lines).toBe(1)
  })

  it('counts paragraphs as blocks separated by a blank line', () => {
    expect(computeTextStatistics('first paragraph\n\nsecond paragraph').paragraphs).toBe(2)
    expect(computeTextStatistics('first\nstill first\n\n\nsecond').paragraphs).toBe(2)
    expect(computeTextStatistics('only one block').paragraphs).toBe(1)
  })

  it('counts sentences terminated by . ! or ?', () => {
    expect(computeTextStatistics('One. Two! Three?').sentences).toBe(3)
  })

  it('counts a trailing unterminated sentence', () => {
    expect(computeTextStatistics('Done. Still writing').sentences).toBe(2)
    expect(computeTextStatistics('No terminator here').sentences).toBe(1)
  })
})

describe('estimateReadingTimeMinutes', () => {
  it('is zero for no words', () => {
    expect(estimateReadingTimeMinutes(0)).toBe(0)
  })

  it('rounds up to at least one minute for any nonzero word count', () => {
    expect(estimateReadingTimeMinutes(1)).toBe(1)
    expect(estimateReadingTimeMinutes(150)).toBe(1)
  })

  it('rounds up to the next full minute past 200 words', () => {
    expect(estimateReadingTimeMinutes(200)).toBe(1)
    expect(estimateReadingTimeMinutes(201)).toBe(2)
    expect(estimateReadingTimeMinutes(400)).toBe(2)
  })
})
