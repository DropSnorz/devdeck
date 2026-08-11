/** Largest-unit relative time formatting, e.g. `in 2d`, `in 5s`, `in 3mo`.
 * Deliberately compact (one unit, no rounding tricks) rather than a full
 * `Intl.RelativeTimeFormat`-style sentence — this is a small annotation
 * next to an absolute date/time, not the primary display. */

const UNITS: { unit: string; ms: number }[] = [
  { unit: 'y', ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: 'mo', ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: 'd', ms: 24 * 60 * 60 * 1000 },
  { unit: 'h', ms: 60 * 60 * 1000 },
  { unit: 'm', ms: 60 * 1000 },
  { unit: 's', ms: 1000 },
]

/** Formats `target` relative to `from` (defaults to now) as `in <n><unit>`,
 * picking the largest whole unit that fits. Returns `now` for a target at or
 * before `from`. */
export function formatRelativeTime(
  target: Date,
  from: Date = new Date(),
): string {
  const diffMs = target.getTime() - from.getTime()
  if (diffMs <= 0) return 'now'

  for (const { unit, ms } of UNITS) {
    if (diffMs >= ms) {
      return `in ${Math.floor(diffMs / ms)}${unit}`
    }
  }
  return 'in <1s'
}
