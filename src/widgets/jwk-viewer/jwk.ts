/** Parses a JSON Web Key (RFC 7517) or a JWK Set into a plain-data shape the
 * widget can render — key type, size, use/ops/alg metadata, and (for
 * asymmetric keys) whether private material is present — without ever
 * performing a cryptographic operation with the key itself. */

export class JwkParseError extends Error {}

export interface ParsedJwk {
  /** The original object, verbatim — feeds both the "unknown fields" the
   * widget doesn't special-case and the RFC 7638 thumbprint calculation. */
  raw: Record<string, unknown>
  kty: string
  summary: string
  keySizeBits: number | null
  curve: string | null
  /** True when any private/secret component (RSA `d`/`p`/`q`/…, EC/OKP `d`,
   * or oct's `k` itself) is present in the key. */
  isPrivate: boolean
  use: string | null
  keyOps: string[] | null
  alg: string | null
  kid: string | null
  x5t: string | null
  x5tS256: string | null
  x5c: string[] | null
  /** Canonical JSON per RFC 7638 §3, ready to be SHA-256'd for the key
   * thumbprint — null when `kty` isn't one of the four types the RFC
   * defines required members for. */
  thumbprintInput: string | null
}

export type JwkResult = { status: 'ok'; jwk: ParsedJwk } | { status: 'error'; message: string }

/** Private/secret-only members per key type, beyond the public ones every
 * card already shows. oct has no entry here — its one member, `k`, is
 * handled as always-private in `computeIsPrivate` since it has no public
 * counterpart to sit alongside. */
const PRIVATE_FIELDS: Record<string, string[]> = {
  RSA: ['d', 'p', 'q', 'dp', 'dq', 'qi'],
  EC: ['d'],
  OKP: ['d'],
}

/** Members RFC 7518 requires for each key type — checked so a JWK missing
 * its actual key material (a common copy-paste or config bug) surfaces as
 * an error card instead of rendering a key with no key in it. Unlisted
 * (non-standard/unknown) key types skip this check entirely, since their
 * requirements aren't known. */
const REQUIRED_FIELDS: Record<string, string[]> = {
  RSA: ['n', 'e'],
  EC: ['crv', 'x', 'y'],
  OKP: ['crv', 'x'],
  oct: ['k'],
}

/** Required members for the RFC 7638 thumbprint, per key type — order
 * matters, they must be serialized lexicographically. */
const THUMBPRINT_MEMBERS: Record<string, string[]> = {
  RSA: ['e', 'kty', 'n'],
  EC: ['crv', 'kty', 'x', 'y'],
  oct: ['k', 'kty'],
  OKP: ['crv', 'kty', 'x'],
}

/** Bit size of well-known curves, used when it can't be inferred any other
 * way. Falls back to the byte length of `x` for anything unrecognized —
 * exact for OKP, and for EC curves other than P-521 (whose 66-byte
 * coordinate encoding overstates its 521-bit order by 7 bits, hence a
 * dedicated entry here rather than relying on the fallback). */
const EC_CURVE_BITS: Record<string, number> = {
  'P-256': 256,
  'P-384': 384,
  'P-521': 521,
  secp256k1: 256,
}
const OKP_CURVE_BITS: Record<string, number> = {
  Ed25519: 256,
  Ed448: 456,
  X25519: 256,
  X448: 448,
}

function base64UrlToBytes(input: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(input)) {
    throw new JwkParseError(`"${input.slice(0, 20)}…" is not valid base64url`)
  }
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (normalized.length % 4)) % 4
  const binary = atob(normalized + '='.repeat(padLength))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

/** Bit length of a big-endian unsigned integer, dropping a leading 0x00 byte
 * some encoders add so the value round-trips through a signed DER INTEGER —
 * that byte isn't part of the mathematical value RSA's `n` represents. */
function bitLength(bytes: Uint8Array): number {
  if (bytes.length === 0) return 0
  const offset = bytes[0] === 0 && bytes.length > 1 ? 1 : 0
  const leading = bytes[offset]
  const significantBits = leading === 0 ? 0 : 32 - Math.clz32(leading)
  return (bytes.length - offset - 1) * 8 + significantBits
}

function bytesToUnsignedDecimal(bytes: Uint8Array): string {
  let value = 0n
  for (const byte of bytes) value = (value << 8n) | BigInt(byte)
  return value.toString(10)
}

function computeKeySizeBits(kty: string, raw: Record<string, unknown>): number | null {
  try {
    switch (kty) {
      case 'RSA':
        return typeof raw.n === 'string' ? bitLength(base64UrlToBytes(raw.n)) : null
      case 'EC': {
        if (typeof raw.crv === 'string' && raw.crv in EC_CURVE_BITS) return EC_CURVE_BITS[raw.crv]
        return typeof raw.x === 'string' ? base64UrlToBytes(raw.x).length * 8 : null
      }
      case 'OKP': {
        if (typeof raw.crv === 'string' && raw.crv in OKP_CURVE_BITS) return OKP_CURVE_BITS[raw.crv]
        return typeof raw.x === 'string' ? base64UrlToBytes(raw.x).length * 8 : null
      }
      case 'oct':
        return typeof raw.k === 'string' ? base64UrlToBytes(raw.k).length * 8 : null
      default:
        return null
    }
  } catch {
    return null
  }
}

function rsaExponentDecimal(raw: Record<string, unknown>): string | null {
  if (typeof raw.e !== 'string') return null
  try {
    return bytesToUnsignedDecimal(base64UrlToBytes(raw.e))
  } catch {
    return null
  }
}

function summarize(kty: string, keySizeBits: number | null, raw: Record<string, unknown>): string {
  switch (kty) {
    case 'RSA': {
      const exponent = rsaExponentDecimal(raw)
      if (!keySizeBits) return 'RSA'
      return exponent ? `RSA ${keySizeBits}-bit (exponent ${exponent})` : `RSA ${keySizeBits}-bit`
    }
    case 'EC': {
      const curve = typeof raw.crv === 'string' ? raw.crv : 'unknown curve'
      return keySizeBits ? `EC ${curve} (${keySizeBits}-bit)` : `EC ${curve}`
    }
    case 'OKP': {
      const curve = typeof raw.crv === 'string' ? raw.crv : 'unknown curve'
      return keySizeBits ? `${curve} (${keySizeBits}-bit)` : curve
    }
    case 'oct':
      return keySizeBits ? `Symmetric key (${keySizeBits}-bit)` : 'Symmetric key'
    default:
      return kty
  }
}

function computeIsPrivate(kty: string, raw: Record<string, unknown>): boolean {
  if (kty === 'oct') return typeof raw.k === 'string'
  return (PRIVATE_FIELDS[kty] ?? []).some((field) => typeof raw[field] === 'string')
}

function thumbprintCanonicalJson(kty: string, raw: Record<string, unknown>): string | null {
  const members = THUMBPRINT_MEMBERS[kty]
  if (!members) return null
  const parts: string[] = []
  for (const member of members) {
    const value = raw[member]
    if (typeof value !== 'string') return null
    parts.push(`"${member}":${JSON.stringify(value)}`)
  }
  return `{${parts.join(',')}}`
}

function parseJwkEntry(entry: unknown): ParsedJwk {
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    throw new JwkParseError('Each key must be a JSON object')
  }
  const raw = entry as Record<string, unknown>
  const kty = raw.kty
  if (typeof kty !== 'string' || kty.length === 0) {
    throw new JwkParseError('Missing required "kty" (key type) member')
  }
  const missingFields = (REQUIRED_FIELDS[kty] ?? []).filter((field) => typeof raw[field] !== 'string')
  if (missingFields.length > 0) {
    const plural = missingFields.length > 1 ? 's' : ''
    throw new JwkParseError(
      `${kty} key is missing required member${plural} ${missingFields.map((f) => `"${f}"`).join(', ')}`,
    )
  }

  const keySizeBits = computeKeySizeBits(kty, raw)
  const keyOps =
    Array.isArray(raw.key_ops) && raw.key_ops.every((op) => typeof op === 'string') ? (raw.key_ops as string[]) : null
  const x5c = Array.isArray(raw.x5c) && raw.x5c.every((cert) => typeof cert === 'string') ? (raw.x5c as string[]) : null

  return {
    raw,
    kty,
    summary: summarize(kty, keySizeBits, raw),
    keySizeBits,
    curve: typeof raw.crv === 'string' ? raw.crv : null,
    isPrivate: computeIsPrivate(kty, raw),
    use: typeof raw.use === 'string' ? raw.use : null,
    keyOps,
    alg: typeof raw.alg === 'string' ? raw.alg : null,
    kid: typeof raw.kid === 'string' ? raw.kid : null,
    x5t: typeof raw.x5t === 'string' ? raw.x5t : null,
    x5tS256: typeof raw['x5t#S256'] === 'string' ? (raw['x5t#S256'] as string) : null,
    x5c,
    thumbprintInput: thumbprintCanonicalJson(kty, raw),
  }
}

/** Pulls the individual key objects out of whatever shape was pasted: a bare
 * JWK, a JWK Set (`{"keys": [...]}`), or (accepted for robustness, though
 * outside the spec) a bare array of keys. Throws only when the input isn't
 * key-shaped at all — once at least one candidate object is found, each is
 * validated independently by `parseJwkEntry` so one malformed key in a set
 * doesn't hide the rest. */
function extractKeyEntries(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) throw new JwkParseError('This array has no keys')
    return parsed
  }
  if (typeof parsed === 'object' && parsed !== null) {
    const obj = parsed as Record<string, unknown>
    if (Array.isArray(obj.keys)) {
      if (obj.keys.length === 0) throw new JwkParseError('This JWK Set has no keys')
      return obj.keys
    }
    if (typeof obj.kty === 'string') return [obj]
  }
  throw new JwkParseError('Paste a JWK object ({"kty": …}) or a JWK Set ({"keys": [ … ]})')
}

export function parseJwkInput(input: string): JwkResult[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(input)
  } catch {
    throw new JwkParseError('Invalid JSON')
  }

  return extractKeyEntries(parsed).map((entry) => {
    try {
      return { status: 'ok', jwk: parseJwkEntry(entry) }
    } catch (err) {
      return { status: 'error', message: err instanceof Error ? err.message : 'Could not parse this key' }
    }
  })
}

/** RFC 7638 thumbprint: base64url(SHA-256(canonical JSON)). Async because it
 * goes through WebCrypto rather than a bundled hash implementation (same
 * pattern as the certificate viewer's fingerprints). */
export async function computeJwkThumbprint(thumbprintInput: string): Promise<string> {
  const bytes = new TextEncoder().encode(thumbprintInput)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  let binary = ''
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
