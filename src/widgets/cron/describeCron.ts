import type { CronFields } from './cronParser'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function sorted(values: Set<number>): number[] {
  return Array.from(values).sort((a, b) => a - b)
}

/** Joins items as "a", "a and b", or "a, b and c" — no Oxford comma. */
function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/** Recognizes a bare "every N units" step (`*` followed by a slash and a
 * number) — other step forms (`0-30/5`, `5/15`) fall through to the generic
 * list wording. */
function bareStep(raw: string): number | null {
  const match = /^\*\/(\d+)$/.exec(raw)
  return match ? Number(match[1]) : null
}

function describeTime(fields: CronFields): string {
  const minuteIsWildcard = fields.raw.minute === '*'
  const hourIsWildcard = fields.raw.hour === '*'

  if (minuteIsWildcard && hourIsWildcard) return 'Every minute'

  const minuteStep = bareStep(fields.raw.minute)
  if (minuteStep && hourIsWildcard) return `Every ${minuteStep} minutes`

  const hourStep = bareStep(fields.raw.hour)
  if (hourStep && minuteIsWildcard)
    return `Every minute, every ${hourStep} hours`

  // A single exact minute + single exact hour reads best as a clock time.
  if (
    !minuteIsWildcard &&
    !hourIsWildcard &&
    fields.minute.size === 1 &&
    fields.hour.size === 1
  ) {
    const [minute] = fields.minute
    const [hour] = fields.hour
    return `At ${pad(hour)}:${pad(minute)}`
  }

  if (hourIsWildcard) {
    return `At minute ${joinList(sorted(fields.minute).map(String))} of every hour`
  }
  if (minuteIsWildcard) {
    return `Every minute, during hour ${joinList(sorted(fields.hour).map(String))}`
  }
  return `At minute ${joinList(sorted(fields.minute).map(String))} past hour ${joinList(sorted(fields.hour).map(String))}`
}

function describeDay(fields: CronFields): string {
  const parts: string[] = []

  if (fields.raw.month !== '*') {
    parts.push(
      `in ${joinList(sorted(fields.month).map((m) => MONTH_NAMES[m - 1]))}`,
    )
  }
  if (fields.raw.dayOfMonth !== '*') {
    parts.push(
      `on day ${joinList(sorted(fields.dayOfMonth).map(String))} of the month`,
    )
  }
  if (fields.raw.dayOfWeek !== '*') {
    parts.push(
      `on ${joinList(sorted(fields.dayOfWeek).map((d) => DAY_NAMES[d]))}`,
    )
  }

  if (parts.length === 0) return 'every day'
  return parts.join(', ')
}

/** Builds a plain-English description of a parsed cron expression, e.g.
 * `"Every 15 minutes, every day"` or `"At 09:00, on Monday and Friday"`. */
export function describeCron(fields: CronFields): string {
  return `${describeTime(fields)}, ${describeDay(fields)}`
}
