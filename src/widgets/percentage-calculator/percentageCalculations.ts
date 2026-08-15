/** `percent`% of `value`. Always defined — no division involved. */
export function percentOf(percent: number, value: number): number {
  return (percent / 100) * value
}

/** What percent `part` is of `whole`. `null` when `whole` is zero, since
 * "part is what % of nothing" has no defined answer. */
export function whatPercent(part: number, whole: number): number | null {
  if (whole === 0) return null
  return (part / whole) * 100
}

/** The whole that `part` is `percent`% of. `null` when `percent` is zero. */
export function findWhole(part: number, percent: number): number | null {
  if (percent === 0) return null
  return (part / percent) * 100
}

/** Percent change from `from` to `to`. `null` when `from` is zero, since
 * a change relative to nothing has no defined answer. */
export function percentChange(from: number, to: number): number | null {
  if (from === 0) return null
  return ((to - from) / from) * 100
}
