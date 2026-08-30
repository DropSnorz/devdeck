export type LogPatternId =
  | 'critical'
  | 'error'
  | 'exception'
  | 'warning'
  | 'failure'
  | 'timeout'
  | 'denied'
  | 'retry'

/** Three colors for eight patterns, grouped by rough meaning (broken,
 * concerning, access failure), to keep a dense log paste readable. */
export type LogPatternGroup = 'severe' | 'caution' | 'auth'

export interface LogPatternDef {
  id: LogPatternId
  label: string
  group: LogPatternGroup
  /** Word-bounded, case-insensitive. Must carry the 'g' flag. */
  pattern: RegExp
  /** Catches the word as a capitalized segment inside a PascalCase
   * identifier, e.g. "FatalError", "CustomException" (`\b` can't see these,
   * since every character on both sides is a letter). Case-sensitive on
   * purpose: mixing this with `pattern`'s 'i' flag would make the
   * boundary check case-blind too and reopen false positives like
   * "terrorist". A word embedded mid-identifier is always
   * Capitalized-first-letter anyway. */
  embeddedPattern: RegExp
}

export const LOG_PATTERNS: LogPatternDef[] = [
  {
    id: 'critical',
    label: 'Critical / Fatal',
    group: 'severe',
    pattern: /\b(?:critical|fatal)\b/gi,
    embeddedPattern: /(?<![A-Z])(?:Critical|Fatal)(?![a-z])/g,
  },
  {
    id: 'error',
    label: 'Error',
    group: 'severe',
    pattern: /\berrors?\b/gi,
    embeddedPattern: /(?<![A-Z])Errors?(?![a-z])/g,
  },
  {
    id: 'exception',
    label: 'Exception',
    group: 'severe',
    pattern: /\bexceptions?\b/gi,
    embeddedPattern: /(?<![A-Z])Exceptions?(?![a-z])/g,
  },
  {
    id: 'warning',
    label: 'Warning',
    group: 'caution',
    pattern: /\bwarn(?:ings?)?\b/gi,
    embeddedPattern: /(?<![A-Z])Warn(?:ings?)?(?![a-z])/g,
  },
  {
    id: 'failure',
    label: 'Failed / Failure',
    group: 'severe',
    pattern: /\bfail(?:s|ed|ing|ures?)?\b/gi,
    embeddedPattern: /(?<![A-Z])Fail(?:s|ed|ing|ures?)?(?![a-z])/g,
  },
  {
    id: 'timeout',
    label: 'Timeout',
    group: 'caution',
    pattern: /\btimeout\b|\btimed\s+out\b/gi,
    // "TimedOut" (no space) is the identifier-friendly spelling of "timed out".
    embeddedPattern: /(?<![A-Z])(?:Timeout|TimedOut)(?![a-z])/g,
  },
  {
    id: 'denied',
    label: 'Denied / Unauthorized / Forbidden',
    group: 'auth',
    pattern: /\b(?:denied|unauthorized|forbidden)\b/gi,
    embeddedPattern: /(?<![A-Z])(?:Denied|Unauthorized|Forbidden)(?![a-z])/g,
  },
  {
    id: 'retry',
    label: 'Retry / Retrying',
    group: 'caution',
    pattern: /\bretr(?:y|ying|ies|ied)\b/gi,
    embeddedPattern: /(?<![A-Z])Retr(?:y|ying|ies|ied)(?![a-z])/g,
  },
]

/** ISO 8601 ("2026-08-30T09:12:03.501Z") and syslog-style ("Jan 12
 * 03:14:15") timestamps. Not exhaustive, but covers the common case. */
export const TIMESTAMP_PATTERN =
  /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?(?:Z|[+-]\d{2}:?\d{2})?|\b[A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\b/g

export interface MatchRange {
  from: number
  to: number
}

/** Runs `source` against `text`, collecting every match as a `MatchRange`.
 * Builds a fresh `RegExp` each call so callers never share `lastIndex` state. */
function scan(text: string, source: RegExp): MatchRange[] {
  const re = new RegExp(source.source, source.flags)
  const matches: MatchRange[] = []
  let match: RegExpExecArray | null
  while ((match = re.exec(text))) {
    matches.push({ from: match.index, to: match.index + match[0].length })
    if (match[0].length === 0) re.lastIndex += 1 // avoid an infinite loop on a zero-width match
  }
  return matches
}

/** Every occurrence of `def` in `text`: standalone-word and PascalCase-embedded
 * matches, merged, position-sorted, and deduped in case a span satisfies both. */
export function findPatternMatches(text: string, def: LogPatternDef): MatchRange[] {
  const matches = [...scan(text, def.pattern), ...scan(text, def.embeddedPattern)]
  matches.sort((a, b) => a.from - b.from || a.to - b.to)
  return matches.filter(
    (match, index) => index === 0 || match.from !== matches[index - 1].from || match.to !== matches[index - 1].to,
  )
}
