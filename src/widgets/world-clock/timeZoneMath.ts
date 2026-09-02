export interface ZonedParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((p) => p.type === type)?.value ?? ''
}

/** The wall-clock date/time an instant reads as in a given IANA zone. Used
 * as the basis for both the offset math below and the "is it a different
 * calendar day there" check, so both stay consistent with each other. */
export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)
  return {
    year: Number(part(parts, 'year')),
    month: Number(part(parts, 'month')),
    day: Number(part(parts, 'day')),
    hour: Number(part(parts, 'hour')),
    minute: Number(part(parts, 'minute')),
    second: Number(part(parts, 'second')),
  }
}

/** UTC offset in minutes a zone is at for a given instant (so it already
 * accounts for DST), via the standard trick of re-reading the zone's wall
 * clock as if it were UTC and diffing against the real instant. */
export function getUtcOffsetMinutes(date: Date, timeZone: string): number {
  const p = getZonedParts(date, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return Math.round((asUtc - date.getTime()) / 60000)
}

/** e.g. `UTC+5:30`, `UTC-8`, `UTC+0`. */
export function formatOffsetLabel(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? '-' : '+'
  const abs = Math.abs(offsetMinutes)
  const hours = Math.floor(abs / 60)
  const minutes = abs % 60
  return `UTC${sign}${hours}${minutes ? `:${String(minutes).padStart(2, '0')}` : ''}`
}

export function formatZonedTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

export function formatZonedDateLabel(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

/** Null when the zone is on the same calendar date as `referenceTimeZone`
 * for this instant, otherwise a signed day count (`+1d`, `-1d`, ...) —
 * lets a row flag "it's tomorrow there" the way worldtimebuddy-style
 * converters do. */
export function dayOffsetLabel(date: Date, timeZone: string, referenceTimeZone: string): string | null {
  const zoned = getZonedParts(date, timeZone)
  const reference = getZonedParts(date, referenceTimeZone)
  const zonedDay = Date.UTC(zoned.year, zoned.month - 1, zoned.day)
  const referenceDay = Date.UTC(reference.year, reference.month - 1, reference.day)
  const diffDays = Math.round((zonedDay - referenceDay) / 86400000)
  if (diffDays === 0) return null
  return diffDays > 0 ? `+${diffDays}d` : `${diffDays}d`
}

export function getZonedHour(date: Date, timeZone: string): number {
  return getZonedParts(date, timeZone).hour
}
