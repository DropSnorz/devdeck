export interface Statistics {
  count: number
  sum: number
  min: number
  max: number
  range: number
  mean: number
  median: number
  /** Every value tied for the highest occurrence count. Empty when no
   * value repeats — a list where everything is unique has no mode. */
  mode: number[]
  /** Sample variance (divides by `count - 1`), 0 for a single value. */
  variance: number
  standardDeviation: number
}

/** Parses free-form text into numbers, accepting commas, whitespace, and
 * newlines as separators. Tokens that aren't valid numbers are dropped
 * rather than rejected — pasted lists commonly carry stray punctuation. */
export function parseNumberList(input: string): number[] {
  return input
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isFinite(n))
}

function computeMode(values: number[]): number[] {
  const counts = new Map<number, number>()
  for (const n of values) counts.set(n, (counts.get(n) ?? 0) + 1)
  const maxCount = Math.max(...counts.values())
  if (maxCount === 1) return []
  return [...counts.entries()]
    .filter(([, count]) => count === maxCount)
    .map(([n]) => n)
    .sort((a, b) => a - b)
}

/** `null` for an empty list — there's no meaningful statistics summary
 * for zero values. */
export function computeStatistics(values: number[]): Statistics | null {
  if (values.length === 0) return null

  const sorted = [...values].sort((a, b) => a - b)
  const count = values.length
  const sum = values.reduce((acc, n) => acc + n, 0)
  const mean = sum / count
  const min = sorted[0]
  const max = sorted[count - 1]
  const median =
    count % 2 === 0 ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2 : sorted[(count - 1) / 2]
  const variance =
    count > 1 ? values.reduce((acc, n) => acc + (n - mean) ** 2, 0) / (count - 1) : 0

  return {
    count,
    sum,
    min,
    max,
    range: max - min,
    mean,
    median,
    mode: computeMode(values),
    variance,
    standardDeviation: Math.sqrt(variance),
  }
}
