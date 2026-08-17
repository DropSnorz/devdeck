export interface CharsetOptions {
  uppercase: boolean
  lowercase: boolean
  numbers: boolean
  symbols: boolean
  /** Drops characters that are easy to misread or mistype across common
   * fonts — 1/l/I, 0/O — from whichever sets above are enabled. */
  excludeAmbiguous: boolean
}

export interface PasswordOptions extends CharsetOptions {
  length: number
}

export const CHARSETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
} as const

const AMBIGUOUS = /[Il1O0o|]/g

/** Concatenates the enabled character sets (in a fixed order, so the same
 * options always produce the same charset string) and strips ambiguous
 * characters if requested. Returns `''` when nothing is enabled — the
 * caller treats that as "can't generate" rather than this function
 * throwing. */
export function buildCharset(options: CharsetOptions): string {
  let charset = ''
  if (options.uppercase) charset += CHARSETS.uppercase
  if (options.lowercase) charset += CHARSETS.lowercase
  if (options.numbers) charset += CHARSETS.numbers
  if (options.symbols) charset += CHARSETS.symbols
  if (options.excludeAmbiguous) charset = charset.replace(AMBIGUOUS, '')
  return charset
}

/** Uniform random index in [0, max) via rejection sampling over
 * `crypto.getRandomValues`. A plain `byte % max` would bias low indices
 * whenever `max` doesn't evenly divide 256 — e.g. with a 70-character
 * charset, indices 0-45 would each be very slightly more likely than
 * 46-69. Rejecting bytes that fall in the leftover, unevenly-divided tail
 * removes that skew entirely. `max` is always a charset length here (well
 * under 256), so a single byte per draw is enough. */
function randomIndex(max: number): number {
  const rejectionThreshold = 256 - (256 % max)
  const bytes = new Uint8Array(1)
  let value: number
  do {
    crypto.getRandomValues(bytes)
    value = bytes[0]
  } while (value >= rejectionThreshold)
  return value % max
}

/** Generates a random password from cryptographically secure randomness.
 * Returns `''` if the combined charset is empty (no character set enabled,
 * or `excludeAmbiguous` stripped it bare) or `length` isn't a positive
 * integer, rather than throwing — the widget can call this reactively
 * without guarding every call site. */
export function generatePassword(options: PasswordOptions): string {
  const charset = buildCharset(options)
  if (!charset || !Number.isInteger(options.length) || options.length <= 0) return ''

  let password = ''
  for (let i = 0; i < options.length; i++) {
    password += charset[randomIndex(charset.length)]
  }
  return password
}

export type StrengthLabel = 'Very weak' | 'Weak' | 'Fair' | 'Strong' | 'Very strong'

export interface PasswordStrength {
  /** Bits of entropy for a uniformly-random password of `length` characters
   * drawn from a charset of `charsetSize` options: length * log2(charsetSize). */
  bits: number
  label: StrengthLabel
}

/** Buckets thresholds follow common password-strength rules of thumb
 * (broadly NIST/OWASP-adjacent), not any single spec. */
export function estimatePasswordStrength(length: number, charsetSize: number): PasswordStrength {
  const bits = charsetSize > 0 && length > 0 ? Math.floor(length * Math.log2(charsetSize)) : 0
  const label: StrengthLabel =
    bits < 28 ? 'Very weak' : bits < 36 ? 'Weak' : bits < 60 ? 'Fair' : bits < 90 ? 'Strong' : 'Very strong'
  return { bits, label }
}
