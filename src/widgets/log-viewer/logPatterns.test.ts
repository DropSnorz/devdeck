import { describe, expect, it } from 'vitest'
import { findPatternMatches, LOG_PATTERNS, TIMESTAMP_PATTERN } from './logPatterns'

function patternFor(id: string) {
  const def = LOG_PATTERNS.find((p) => p.id === id)
  if (!def) throw new Error(`no pattern registered for id ${id}`)
  return def
}

describe('findPatternMatches', () => {
  it('finds every case-insensitive whole-word occurrence', () => {
    const text = 'Error: something broke\nERROR again\nanother errors here'
    const matches = findPatternMatches(text, patternFor('error'))
    expect(matches).toHaveLength(3)
    expect(text.slice(matches[0].from, matches[0].to)).toBe('Error')
    expect(text.slice(matches[2].from, matches[2].to)).toBe('errors')
  })

  it('does not match inside a longer word', () => {
    const text = 'a terrorist errorless report'
    expect(findPatternMatches(text, patternFor('error'))).toHaveLength(0)
  })

  it('returns an empty list when there is no match', () => {
    expect(findPatternMatches('all quiet here', patternFor('critical'))).toEqual([])
  })

  it('matches both "fatal" and "critical" for the critical pattern', () => {
    const text = 'a critical failure and a fatal one'
    expect(findPatternMatches(text, patternFor('critical'))).toHaveLength(2)
  })

  it('matches "timed out" as well as "timeout"', () => {
    const text = 'request timeout after 30s; connection timed out'
    expect(findPatternMatches(text, patternFor('timeout'))).toHaveLength(2)
  })

  it('is reusable across repeated calls without carrying lastIndex state over', () => {
    const def = patternFor('retry')
    expect(findPatternMatches('retrying now', def)).toHaveLength(1)
    expect(findPatternMatches('retry once more', def)).toHaveLength(1)
  })

  it('catches the word embedded in a PascalCase exception/class name', () => {
    const text = 'threw a FatalError while handling CustomException'
    const fatal = findPatternMatches(text, patternFor('critical'))
    expect(fatal).toHaveLength(1)
    expect(text.slice(fatal[0].from, fatal[0].to)).toBe('Fatal')

    const exception = findPatternMatches(text, patternFor('exception'))
    expect(exception).toHaveLength(1)
    expect(text.slice(exception[0].from, exception[0].to)).toBe('Exception')
  })

  it('catches an embedded word regardless of which side of the identifier it sits on', () => {
    const text = 'ConnectionTimeoutException: gave up'
    expect(findPatternMatches(text, patternFor('timeout'))).toHaveLength(1)
    expect(findPatternMatches(text, patternFor('exception'))).toHaveLength(1)
  })

  it('does not double-count a word that both stands alone and satisfies the embedded boundary', () => {
    const text = 'Fatal error today'
    expect(findPatternMatches(text, patternFor('critical'))).toHaveLength(1)
  })

  it('still ignores a lowercase run even when it looks like a compound word', () => {
    // "fatalError" is camelCase, not PascalCase, so neither regex matches it.
    expect(findPatternMatches('a fatalError happened', patternFor('critical'))).toHaveLength(0)
  })
})

describe('TIMESTAMP_PATTERN', () => {
  it('matches an ISO 8601 timestamp with milliseconds and a Z offset', () => {
    const text = 'first 2026-08-30T09:12:03.501Z second'
    const match = text.match(TIMESTAMP_PATTERN)
    expect(match?.[0]).toBe('2026-08-30T09:12:03.501Z')
  })

  it('matches a syslog-style timestamp', () => {
    const text = 'Aug 30 09:12:03 host service[1]: started'
    const match = text.match(TIMESTAMP_PATTERN)
    expect(match?.[0]).toBe('Aug 30 09:12:03')
  })
})
