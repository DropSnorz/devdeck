/** Parsing and next-occurrence logic for standard 5-field cron expressions
 * (`minute hour day-of-month month day-of-week`), plus the handful of
 * `@`-shorthands most cron implementations accept. No external dependency —
 * this is the whole engine the widget (and its tests) run on. */

export type CronField = 'minute' | 'hour' | 'dayOfMonth' | 'month' | 'dayOfWeek'

export interface CronFields {
  minute: Set<number>
  hour: Set<number>
  dayOfMonth: Set<number>
  month: Set<number>
  dayOfWeek: Set<number>
  /** Original (post `@shorthand`/`?` normalization) per-field source text —
   * used both to render the field back and to tell "restricted" fields
   * apart from a bare `*` for the day-of-month/day-of-week OR rule below. */
  raw: Record<CronField, string>
}

export class CronParseError extends Error {}

interface FieldConfig {
  min: number
  max: number
  aliases?: Record<string, number>
}

const MONTH_ALIASES: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
}

const DAY_ALIASES: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
}

const FIELD_CONFIG: Record<CronField, FieldConfig> = {
  minute: { min: 0, max: 59 },
  hour: { min: 0, max: 23 },
  dayOfMonth: { min: 1, max: 31 },
  month: { min: 1, max: 12, aliases: MONTH_ALIASES },
  dayOfWeek: { min: 0, max: 7, aliases: DAY_ALIASES },
}

export const FIELD_LABELS: Record<CronField, string> = {
  minute: 'minute',
  hour: 'hour',
  dayOfMonth: 'day-of-month',
  month: 'month',
  dayOfWeek: 'day-of-week',
}

const FIELD_ORDER: CronField[] = [
  'minute',
  'hour',
  'dayOfMonth',
  'month',
  'dayOfWeek',
]

/** Well-known `@`-shorthands, expanded to their 5-field equivalent before
 * parsing. `@reboot` has no fixed schedule, so it's deliberately left out —
 * callers see it rejected as an unknown token, which is accurate: this
 * widget only describes time-based schedules. */
const SHORTHANDS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
}

function resolveToken(token: string, field: CronField): number {
  const config = FIELD_CONFIG[field]
  const alias = config.aliases?.[token.toLowerCase()]
  if (alias !== undefined) return alias
  if (!/^\d+$/.test(token)) {
    throw new CronParseError(
      `Invalid value "${token}" in ${FIELD_LABELS[field]} field`,
    )
  }
  const value = Number(token)
  if (value < config.min || value > config.max) {
    throw new CronParseError(
      `Value ${value} out of range in ${FIELD_LABELS[field]} field (expected ${config.min}-${config.max})`,
    )
  }
  return value
}

/** Sunday is both 0 and 7 in standard cron; normalized to 0 everywhere. */
function normalizeDayOfWeek(field: CronField, value: number): number {
  return field === 'dayOfWeek' && value === 7 ? 0 : value
}

function parseCronField(fieldStr: string, field: CronField): Set<number> {
  const config = FIELD_CONFIG[field]
  const values = new Set<number>()

  for (const rawPart of fieldStr.split(',')) {
    const part = rawPart.trim()
    if (!part) {
      throw new CronParseError(`Empty value in ${FIELD_LABELS[field]} field`)
    }

    const [rangePart, stepPart, ...rest] = part.split('/')
    if (rest.length > 0) {
      throw new CronParseError(
        `Invalid value "${part}" in ${FIELD_LABELS[field]} field`,
      )
    }

    let step = 1
    if (stepPart !== undefined) {
      if (!/^\d+$/.test(stepPart) || Number(stepPart) < 1) {
        throw new CronParseError(
          `Invalid step "${stepPart}" in ${FIELD_LABELS[field]} field`,
        )
      }
      step = Number(stepPart)
    }

    let start: number
    let end: number
    if (rangePart === '*') {
      start = config.min
      end = config.max
    } else if (rangePart.includes('-')) {
      const [startTok, endTok] = rangePart.split('-')
      if (!startTok || !endTok) {
        throw new CronParseError(
          `Invalid range "${rangePart}" in ${FIELD_LABELS[field]} field`,
        )
      }
      start = resolveToken(startTok, field)
      end = resolveToken(endTok, field)
      if (start > end) {
        throw new CronParseError(
          `Range start (${start}) is after range end (${end}) in ${FIELD_LABELS[field]} field`,
        )
      }
    } else {
      const value = resolveToken(rangePart, field)
      start = value
      // "a/step" (no range) means "from a to the field's max, stepped".
      end = stepPart !== undefined ? config.max : value
    }

    for (let v = start; v <= end; v += step) {
      values.add(normalizeDayOfWeek(field, v))
    }
  }

  return values
}

/** Parses a 5-field cron expression (or one of the `@` shorthands) into
 * per-field sets of matching numeric values. Throws `CronParseError` with a
 * message safe to show directly to the user. */
export function parseCron(expression: string): CronFields {
  const trimmed = expression.trim()
  if (!trimmed) {
    throw new CronParseError('Cron expression is empty')
  }

  const normalized = SHORTHANDS[trimmed.toLowerCase()] ?? trimmed
  const parts = normalized.split(/\s+/)
  if (parts.length !== 5) {
    throw new CronParseError(
      `Expected 5 fields (minute hour day-of-month month day-of-week), got ${parts.length}`,
    )
  }

  const rawByField: Record<CronField, string> = {
    minute: parts[0],
    hour: parts[1],
    // "?" is a common alias for "*" in day-of-month/day-of-week (used to
    // disambiguate which of the two drives the schedule).
    dayOfMonth: parts[2] === '?' ? '*' : parts[2],
    month: parts[3],
    dayOfWeek: parts[4] === '?' ? '*' : parts[4],
  }

  const fields = {} as Record<CronField, Set<number>>
  for (const field of FIELD_ORDER) {
    fields[field] = parseCronField(rawByField[field], field)
  }

  return { ...fields, raw: rawByField }
}

export interface CronOccurrenceOptions {
  /** How many upcoming trigger times to return. Defaults to 3. */
  count?: number
  /** Reference instant to search forward from (exclusive). Defaults to now. */
  from?: Date
  /** Search horizon, so patterns that never actually fire (e.g. `0 0 30 2
   * *` — February never has a 30th) terminate instead of looping forever. */
  maxYearsAhead?: number
}

/** Finds the next matching minute-aligned instants for a parsed cron
 * expression, in local time (matching how cron daemons run on a machine's
 * own clock). Field checks jump straight to the next candidate month/
 * day/hour instead of stepping minute-by-minute, so even rare patterns
 * (once-a-year, Feb 29 only, ...) resolve in a handful of iterations. */
export function getNextOccurrences(
  fields: CronFields,
  options: CronOccurrenceOptions = {},
): Date[] {
  const { count = 3, from = new Date(), maxYearsAhead = 5 } = options
  const results: Date[] = []

  // Standard POSIX cron quirk: if *both* day-of-month and day-of-week are
  // restricted (i.e. not a bare "*"), a day matches when *either* field
  // matches, not both.
  const domRestricted = fields.raw.dayOfMonth !== '*'
  const dowRestricted = fields.raw.dayOfWeek !== '*'

  const candidate = new Date(
    from.getFullYear(),
    from.getMonth(),
    from.getDate(),
    from.getHours(),
    from.getMinutes(),
    0,
    0,
  )
  candidate.setMinutes(candidate.getMinutes() + 1)

  const limit = new Date(candidate)
  limit.setFullYear(limit.getFullYear() + maxYearsAhead)

  while (results.length < count && candidate <= limit) {
    if (!fields.month.has(candidate.getMonth() + 1)) {
      candidate.setMonth(candidate.getMonth() + 1, 1)
      candidate.setHours(0, 0, 0, 0)
      continue
    }

    const dayMatches =
      domRestricted && dowRestricted
        ? fields.dayOfMonth.has(candidate.getDate()) ||
          fields.dayOfWeek.has(candidate.getDay())
        : (!domRestricted || fields.dayOfMonth.has(candidate.getDate())) &&
          (!dowRestricted || fields.dayOfWeek.has(candidate.getDay()))
    if (!dayMatches) {
      candidate.setDate(candidate.getDate() + 1)
      candidate.setHours(0, 0, 0, 0)
      continue
    }

    if (!fields.hour.has(candidate.getHours())) {
      candidate.setHours(candidate.getHours() + 1, 0, 0, 0)
      continue
    }

    if (!fields.minute.has(candidate.getMinutes())) {
      candidate.setMinutes(candidate.getMinutes() + 1)
      continue
    }

    results.push(new Date(candidate))
    candidate.setMinutes(candidate.getMinutes() + 1)
  }

  return results
}

/** Finds the single matching instant immediately *before* `before` — the
 * mirror image of `getNextOccurrences`, stepping backward with the same
 * month/day/hour jumps. Used to anchor the progress bar of an upcoming
 * trigger against the real preceding one (whose distance can differ from
 * the gaps between later triggers for an irregular expression), rather
 * than assuming evenly spaced triggers. Returns `null` if nothing matches
 * within the search horizon. */
export function getPreviousOccurrence(
  fields: CronFields,
  before: Date,
  maxYearsBack = 5,
): Date | null {
  const domRestricted = fields.raw.dayOfMonth !== '*'
  const dowRestricted = fields.raw.dayOfWeek !== '*'

  const candidate = new Date(
    before.getFullYear(),
    before.getMonth(),
    before.getDate(),
    before.getHours(),
    before.getMinutes(),
    0,
    0,
  )
  candidate.setMinutes(candidate.getMinutes() - 1)

  const limit = new Date(candidate)
  limit.setFullYear(limit.getFullYear() - maxYearsBack)

  while (candidate >= limit) {
    if (!fields.month.has(candidate.getMonth() + 1)) {
      // Day 0 of the current month is the last day of the previous one.
      candidate.setMonth(candidate.getMonth(), 0)
      candidate.setHours(23, 59, 0, 0)
      continue
    }

    const dayMatches =
      domRestricted && dowRestricted
        ? fields.dayOfMonth.has(candidate.getDate()) ||
          fields.dayOfWeek.has(candidate.getDay())
        : (!domRestricted || fields.dayOfMonth.has(candidate.getDate())) &&
          (!dowRestricted || fields.dayOfWeek.has(candidate.getDay()))
    if (!dayMatches) {
      candidate.setDate(candidate.getDate() - 1)
      candidate.setHours(23, 59, 0, 0)
      continue
    }

    if (!fields.hour.has(candidate.getHours())) {
      candidate.setHours(candidate.getHours() - 1, 59, 0, 0)
      continue
    }

    if (!fields.minute.has(candidate.getMinutes())) {
      candidate.setMinutes(candidate.getMinutes() - 1)
      continue
    }

    return new Date(candidate)
  }

  return null
}
