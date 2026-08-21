/** Pure detection engine behind the Content Type Detector widget.
 *
 * The core idea: some inputs are themselves a recognizable format (JSON,
 * JWT, UUID, a URL, …) and some are just an *encoding* wrapped around
 * something else (Base64, hex, percent-encoding). For the latter we decode
 * one layer and run detection again on the result, so pasting something
 * like base64(base64(JSON)) surfaces as a chain: Base64 → Base64 → JSON,
 * not just "Base64" with an unreadable blob underneath.
 */

/** One layer of a detection chain. `value` is what that layer represents —
 * the decoded text for a peeled encoding layer, or a display-friendly
 * preview for a terminal ("leaf") classification like a UUID or timestamp. */
export interface DetectionNode {
  /** Stable key for the type, e.g. 'base64', 'jwt', 'json'. Not shown in the UI. */
  type: string
  /** Human label shown in the UI, e.g. 'Base64', 'JWT', 'JSON'. */
  label: string
  /** 0..1 confidence this layer's classification is correct. */
  confidence: number
  value: string
}

export type DetectionChain = DetectionNode[]

/** Candidate produced by `detectCandidates` for one piece of text. Leaf
 * candidates (no `decode`) end a chain; peelable candidates may continue
 * into another round of detection on their decoded output. */
interface Candidate extends DetectionNode {
  decode?: () => string
}

/** Chain length is capped at 3 layers — deep chains stop being informative
 * and just as often mean we're peeling noise, not signal. */
const MAX_CHAIN_LENGTH = 3
/** Only the top-N candidates are explored per layer, to keep the branching
 * factor (and the list of chains shown) manageable. */
const MAX_BRANCHES_PER_LEVEL = 3
const MAX_CHAINS_SHOWN = 6
/** Guards against pathological input (huge pastes) making detection slow. */
const MAX_INPUT_LENGTH = 20_000

const HASH_HEX_LENGTHS: Record<number, string> = {
  32: 'MD5',
  40: 'SHA-1',
  64: 'SHA-256',
  96: 'SHA-384',
  128: 'SHA-512',
}

/** Fraction of characters that are "normal" text rather than control bytes —
 * used to tell a meaningful decode (readable text, JSON, …) from noise that
 * happened to survive a UTF-8 decode. Tab/CR/LF count as printable; general
 * non-ASCII (accented text, CJK, emoji, …) does too, since this is meant to
 * accept real-world Unicode content, not just ASCII. */
function printableRatio(text: string): number {
  if (text.length === 0) return 0
  let printable = 0
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0
    if (code === 9 || code === 10 || code === 13 || (code >= 32 && code < 127) || code > 160) {
      printable++
    }
  }
  return printable / text.length
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

/** Decodes standard Base64 or Base64URL, tolerating missing padding.
 * Returns null for anything that isn't validly-shaped Base64, or whose
 * bytes aren't valid UTF-8 (rules out most raw-binary false positives). */
function decodeBase64Flexible(text: string): string | null {
  if (text.length < 4 || !/^[A-Za-z0-9+/_-]+={0,2}$/.test(text)) return null
  const normalized = text.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (normalized.length % 4)) % 4
  if (padLength === 3) return null // not a valid base64 length
  try {
    const binary = atob(normalized + '='.repeat(padLength))
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return null
  }
}

function decodeJwtHeader(token: string): Record<string, unknown> | null {
  try {
    const [header] = token.split('.')
    const json = decodeBase64Flexible(header.replace(/-/g, '+').replace(/_/g, '/'))
    if (!json) return null
    const parsed = JSON.parse(json) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/** Returns every pattern `text` plausibly matches, most confident first.
 * Several candidates can (and often do) apply at once — e.g. a lowercase
 * hex string is simultaneously "possible SHA-256 hash" and "hex bytes" —
 * callers explore more than one. */
export function detectCandidates(input: string): Candidate[] {
  const text = input.trim()
  const candidates: Candidate[] = []
  if (!text) return candidates

  // Base64/hex are commonly wrapped at a fixed line width (PEM-style) or
  // copied with surrounding whitespace; the other detectors care about
  // exact shape, so only these two tolerate that by working on a
  // whitespace-stripped copy.
  const compact = text.replace(/\s+/g, '')

  // JWT — three dot-separated Base64URL segments whose header decodes to a
  // JSON object with the claims a JWT header actually has.
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(text)) {
    const header = decodeJwtHeader(text)
    if (header && ('alg' in header || 'typ' in header)) {
      candidates.push({ type: 'jwt', label: 'JWT', confidence: 0.97, value: text })
    }
  }

  // JSON object/array (a bare string/number/bool isn't distinctive enough
  // to call out as "JSON").
  if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
    try {
      JSON.parse(text)
      candidates.push({ type: 'json', label: 'JSON', confidence: 0.9, value: text })
    } catch {
      // not valid JSON
    }
  }

  // UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)) {
    candidates.push({ type: 'uuid', label: 'UUID', confidence: 0.95, value: text })
  }

  // URL
  try {
    const url = new URL(text)
    if (/^https?:$/.test(url.protocol) || /^[a-z][a-z0-9+.-]*:$/i.test(url.protocol)) {
      candidates.push({ type: 'url', label: 'URL', confidence: 0.9, value: text })
    }
  } catch {
    // not a URL
  }

  // IPv4 address / CIDR
  const ipv4Match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(\/(\d{1,2}))?$/.exec(text)
  if (ipv4Match) {
    const octets = [ipv4Match[1], ipv4Match[2], ipv4Match[3], ipv4Match[4]].map(Number)
    const prefix = ipv4Match[6] === undefined ? null : Number(ipv4Match[6])
    if (octets.every((n) => n <= 255) && (prefix === null || prefix <= 32)) {
      candidates.push({
        type: 'ipv4',
        label: prefix === null ? 'IPv4 address' : 'IPv4 CIDR',
        confidence: 0.9,
        value: text,
      })
    }
  }

  // Unix timestamp (seconds or milliseconds), sanity-checked against a
  // plausible calendar range rather than accepted on digit-count alone.
  if (/^\d{9,13}$/.test(text)) {
    const n = Number(text)
    const isMillis = text.length >= 13
    const date = new Date(isMillis ? n : n * 1000)
    const year = date.getUTCFullYear()
    if (year >= 1990 && year <= 2100) {
      candidates.push({
        type: 'timestamp',
        label: `Unix timestamp (${isMillis ? 'ms' : 'seconds'})`,
        confidence: 0.55,
        value: date.toISOString(),
      })
    }
  }

  // Hex color — with a leading # this is unambiguous; without one it's the
  // same alphabet as hex bytes/Base64, so it's kept but heavily discounted.
  if (/^#?[0-9a-f]{3}$|^#?[0-9a-f]{6}$|^#?[0-9a-f]{8}$/i.test(text)) {
    candidates.push({
      type: 'color',
      label: 'Hex color',
      confidence: text.startsWith('#') ? 0.85 : 0.4,
      value: text.startsWith('#') ? text : `#${text}`,
    })
  }

  // Hex string matching a common hash digest length. This never decodes
  // into anything, so it's a leaf — offered alongside (not instead of) the
  // "hex bytes" peel below, since either reading can be right.
  if (/^[0-9a-f]+$/i.test(compact) && HASH_HEX_LENGTHS[compact.length]) {
    candidates.push({
      type: 'hash',
      label: `Hex string (possible ${HASH_HEX_LENGTHS[compact.length]} hash)`,
      confidence: 0.35,
      value: compact,
    })
  }

  // Hex-encoded bytes, peelable when they decode to readable UTF-8 text.
  if (/^[0-9a-f]+$/i.test(compact) && compact.length >= 4 && compact.length % 2 === 0) {
    try {
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(hexToBytes(compact))
      const ratio = printableRatio(decoded)
      if (ratio > 0.85) {
        candidates.push({
          type: 'hex',
          label: 'Hex-encoded bytes',
          confidence: 0.4 + 0.3 * ratio,
          value: decoded,
          decode: () => decoded,
        })
      }
    } catch {
      // not valid UTF-8 once decoded — not a useful peel
    }
  }

  // Base64 / Base64URL, peelable under the same readable-UTF-8 bar as hex.
  const base64Decoded = decodeBase64Flexible(compact)
  if (base64Decoded !== null && base64Decoded !== compact) {
    const ratio = printableRatio(base64Decoded)
    if (ratio > 0.85) {
      const urlSafe = /[-_]/.test(compact)
      candidates.push({
        type: 'base64',
        label: urlSafe ? 'Base64 (URL-safe)' : 'Base64',
        confidence: 0.5 + 0.4 * ratio,
        value: base64Decoded,
        decode: () => base64Decoded,
      })
    }
  }

  // Percent-encoding (URI component escaping)
  if (/%[0-9a-f]{2}/i.test(text)) {
    try {
      const decoded = decodeURIComponent(text)
      if (decoded !== text) {
        candidates.push({
          type: 'url-encoded',
          label: 'URL-encoded (percent)',
          confidence: 0.65,
          value: decoded,
          decode: () => decoded,
        })
      }
    } catch {
      // malformed percent-encoding
    }
  }

  return candidates.sort((a, b) => b.confidence - a.confidence)
}

function chainKey(chain: DetectionChain): string {
  return chain.map((node) => `${node.type}:${node.value.slice(0, 80)}`).join('|')
}

function chainScore(chain: DetectionChain): number {
  return chain.reduce((score, node) => score * node.confidence, 1)
}

/** Detects what `input` might be, peeling recognized encodings (Base64,
 * hex, percent-encoding) up to `MAX_CHAIN_LENGTH` layers deep and running
 * detection again on each decoded result. Returns the resulting chains —
 * each one a top-to-bottom read like "Base64 → JSON" — ranked by their
 * combined confidence, most likely first. Always non-empty for non-blank
 * input: a chain that recognizes nothing still ends in a "Plain text" leaf. */
export function buildChains(rawInput: string): DetectionChain[] {
  const text = rawInput.trim().slice(0, MAX_INPUT_LENGTH)
  if (!text) return []

  const chains: DetectionChain[] = []
  const seen = new Set<string>()

  function pushChain(chain: DetectionChain) {
    const key = chainKey(chain)
    if (seen.has(key)) return
    seen.add(key)
    chains.push(chain)
  }

  function walk(current: string, path: DetectionChain) {
    const candidates = detectCandidates(current).slice(0, MAX_BRANCHES_PER_LEVEL)

    if (candidates.length === 0) {
      pushChain([
        ...path,
        { type: 'text', label: 'Plain text', confidence: path.length > 0 ? 0.6 : 0.3, value: current },
      ])
      return
    }

    for (const { decode, ...node } of candidates) {
      const nextPath = [...path, node]
      if (decode && nextPath.length < MAX_CHAIN_LENGTH) {
        const decoded = decode()
        if (decoded && decoded !== current) {
          walk(decoded, nextPath)
          continue
        }
      }
      pushChain(nextPath)
    }
  }

  walk(text, [])

  return chains.sort((a, b) => chainScore(b) - chainScore(a)).slice(0, MAX_CHAINS_SHOWN)
}
