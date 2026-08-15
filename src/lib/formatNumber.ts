/** Rounds a number to `precision` decimal places and strips trailing zeros
 * — e.g. `1 / 3` renders as `"0.333333"` instead of the full float noise a
 * plain `String()` would produce. Falls back to scientific notation when a
 * nonzero value is small enough that fixed-precision rounding would
 * otherwise print it as a misleading `"0"` (e.g. 1 byte in GiB). Shared by
 * the math widgets, which all hit the same "how do I print a computed
 * float" problem. */
export function formatNumber(value: number, precision = 6): string {
  if (!Number.isInteger(precision) || precision < 0 || precision > 100) {
    throw new RangeError('precision must be an integer between 0 and 100')
  }
  if (Number.isNaN(value)) return 'NaN'
  if (!Number.isFinite(value)) return value > 0 ? 'Infinity' : '-Infinity'
  if (Number.isInteger(value)) return String(value)

  const rounded = Number(value.toFixed(precision))
  if (rounded !== 0 || value === 0) return String(rounded)

  // Rounds to "0" at this precision but isn't actually zero — switch to
  // scientific notation (trimmed of trailing mantissa zeros) rather than
  // print a value that reads as exactly zero.
  return value
    .toExponential(precision)
    .replace(/(\.\d*?)0+e/, '$1e')
    .replace(/\.e/, 'e')
}
