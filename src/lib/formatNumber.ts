/** Rounds a number to `precision` decimal places and strips trailing zeros
 * — e.g. `1 / 3` renders as `"0.333333"` instead of the full float noise a
 * plain `String()` would produce. Shared by the math widgets, which all
 * hit the same "how do I print a computed float" problem. */
export function formatNumber(value: number, precision = 6): string {
  if (Number.isNaN(value)) return 'NaN'
  if (!Number.isFinite(value)) return value > 0 ? 'Infinity' : '-Infinity'
  if (Number.isInteger(value)) return String(value)
  return String(Number(value.toFixed(precision)))
}
