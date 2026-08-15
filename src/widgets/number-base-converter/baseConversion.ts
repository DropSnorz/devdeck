const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz'

/** Common bases surfaced as a fixed conversion table, in addition to
 * whatever custom base the widget also lets the user pick. */
export const COMMON_BASES: { label: string; base: number }[] = [
  { label: 'Binary', base: 2 },
  { label: 'Octal', base: 8 },
  { label: 'Decimal', base: 10 },
  { label: 'Duodecimal', base: 12 },
  { label: 'Hexadecimal', base: 16 },
]

/** Parses `value` as a signed integer in `base` (2-36). Returns `null`
 * for empty input or a digit outside the given base, rather than
 * throwing — the widget calls this on every keystroke. BigInt-backed so
 * values far past `Number.MAX_SAFE_INTEGER` still round-trip exactly. */
export function parseInBase(value: string, base: number): bigint | null {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return null
  const negative = trimmed.startsWith('-')
  const digits = negative ? trimmed.slice(1) : trimmed
  if (!digits) return null

  const bigBase = BigInt(base)
  let result = 0n
  for (const ch of digits) {
    const digit = DIGITS.indexOf(ch)
    if (digit < 0 || digit >= base) return null
    result = result * bigBase + BigInt(digit)
  }
  return negative ? -result : result
}

/** Formats a signed integer in `base` (2-36) using lowercase digits. */
export function formatInBase(value: bigint, base: number): string {
  if (value === 0n) return '0'
  const negative = value < 0n
  let n = negative ? -value : value
  const bigBase = BigInt(base)
  let out = ''
  while (n > 0n) {
    out = DIGITS[Number(n % bigBase)] + out
    n /= bigBase
  }
  return negative ? `-${out}` : out
}
