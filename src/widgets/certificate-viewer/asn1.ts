/** Minimal ASN.1 DER reader — just enough of BER/DER to walk an X.509
 * certificate's TLV (tag, length, value) structure. Not a general BER
 * decoder: no indefinite-length support, since DER (which X.509 always
 * uses) forbids it. */

// Plain `as const` objects rather than `enum` — this project's tsconfig
// enables `erasableSyntaxOnly`, which rejects real TS enums.
export const Asn1Class = {
  Universal: 0,
  Application: 1,
  ContextSpecific: 2,
  Private: 3,
} as const
export type Asn1Class = (typeof Asn1Class)[keyof typeof Asn1Class]

/** Universal tag numbers used while walking a certificate. */
export const Asn1Tag = {
  Boolean: 1,
  Integer: 2,
  BitString: 3,
  OctetString: 4,
  Null: 5,
  ObjectIdentifier: 6,
  UTF8String: 12,
  Sequence: 16,
  Set: 17,
  PrintableString: 19,
  T61String: 20,
  IA5String: 22,
  UTCTime: 23,
  GeneralizedTime: 24,
  BMPString: 30,
} as const
export type Asn1Tag = (typeof Asn1Tag)[keyof typeof Asn1Tag]

export interface Asn1Node {
  // `number`, not the narrower `Asn1Class` type — parsed straight out of two
  // bits of arbitrary input, so nothing statically guarantees it lands on
  // one of the four named values (though in practice it always does).
  class: number
  constructed: boolean
  /** Tag number within its class — only meaningful together with `class`.
   * For Universal-class nodes this doubles as the `Asn1Tag`. */
  tag: number
  /** Content bytes, excluding the tag/length header. */
  content: Uint8Array
  /** Parsed children, present only for constructed nodes. */
  children?: Asn1Node[]
}

export class Asn1Error extends Error {}

/** Parses a single TLV node starting at `offset`. Returns the node plus the
 * offset just past it, so callers can walk a SEQUENCE's children in a loop
 * without re-scanning from the start each time. */
function readNode(bytes: Uint8Array, offset: number): [Asn1Node, number] {
  if (offset >= bytes.length) {
    throw new Asn1Error('Unexpected end of data while reading a tag')
  }

  const tagByte = bytes[offset]
  const cls = (tagByte >> 6) & 0b11
  const constructed = (tagByte & 0b0010_0000) !== 0
  let tag = tagByte & 0b0001_1111
  let pos = offset + 1

  // Multi-byte tag number (high-tag-number form): not used by anything in
  // an X.509 certificate, but skip it correctly rather than misreading the
  // length that follows.
  if (tag === 0b0001_1111) {
    tag = 0
    let byte: number
    do {
      if (pos >= bytes.length) throw new Asn1Error('Truncated tag number')
      byte = bytes[pos]
      tag = (tag << 7) | (byte & 0b0111_1111)
      pos++
    } while (byte & 0b1000_0000)
  }

  if (pos >= bytes.length) throw new Asn1Error('Unexpected end of data while reading a length')
  const lengthByte = bytes[pos]
  pos++
  let length: number
  if ((lengthByte & 0b1000_0000) === 0) {
    length = lengthByte
  } else {
    const numLengthBytes = lengthByte & 0b0111_1111
    if (numLengthBytes === 0) throw new Asn1Error('Indefinite-length encoding is not valid DER')
    if (pos + numLengthBytes > bytes.length) throw new Asn1Error('Truncated length')
    length = 0
    for (let i = 0; i < numLengthBytes; i++) {
      length = length * 256 + bytes[pos]
      pos++
    }
  }

  if (pos + length > bytes.length) throw new Asn1Error('Declared length runs past the end of data')
  const content = bytes.subarray(pos, pos + length)
  const node: Asn1Node = { class: cls, constructed, tag, content }
  if (constructed) node.children = readChildren(content)
  return [node, pos + length]
}

function readChildren(bytes: Uint8Array): Asn1Node[] {
  const children: Asn1Node[] = []
  let offset = 0
  while (offset < bytes.length) {
    const [node, next] = readNode(bytes, offset)
    children.push(node)
    offset = next
  }
  return children
}

/** Parses a full DER document, expecting exactly one top-level node. */
export function parseAsn1(bytes: Uint8Array): Asn1Node {
  const [node, end] = readNode(bytes, 0)
  if (end !== bytes.length) {
    throw new Asn1Error('Trailing data after the top-level DER element')
  }
  return node
}

export function expectUniversalTag(node: Asn1Node, tag: Asn1Tag, what: string): void {
  if (node.class !== Asn1Class.Universal || node.tag !== tag) {
    throw new Asn1Error(`Expected ${what}, got class=${node.class} tag=${node.tag}`)
  }
}

export function childAt(node: Asn1Node, index: number, what: string): Asn1Node {
  const child = node.children?.[index]
  if (!child) throw new Asn1Error(`Missing ${what}`)
  return child
}

/** Reads an INTEGER as a non-negative hex string (no leading "0x"), which is
 * how certificate fields like serial numbers are conventionally displayed —
 * they're often too wide for a JS number and their sign bit is packaging,
 * not a real negative value. */
export function readIntegerHex(node: Asn1Node): string {
  expectUniversalTag(node, Asn1Tag.Integer, 'INTEGER')
  let bytes = node.content
  // Strip a single DER-mandated leading 0x00 padding byte (added whenever
  // the true value's high bit would otherwise be mistaken for a sign bit).
  if (bytes.length > 1 && bytes[0] === 0x00 && (bytes[1] & 0x80) !== 0) {
    bytes = bytes.subarray(1)
  }
  if (bytes.length === 0) return '00'
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Reads an INTEGER as a JS number. Only safe for fields known to be small
 * (version numbers, path lengths) — callers needing the full range should
 * use `readIntegerHex` instead. */
export function readSmallInteger(node: Asn1Node): number {
  const hex = readIntegerHex(node)
  const value = Number.parseInt(hex, 16)
  if (!Number.isSafeInteger(value)) throw new Asn1Error('INTEGER is too large for a small-integer read')
  return value
}

/** Decodes the raw content octets of an OBJECT IDENTIFIER. Split out from
 * `readObjectIdentifier` so GeneralName's `registeredID [8]` choice — which
 * IMPLICITly retags an OID's content bytes under a context-specific tag —
 * can reuse the same arc-decoding without a bogus universal-tag check. */
export function oidBytesToString(bytes: Uint8Array): string {
  if (bytes.length === 0) throw new Asn1Error('Empty OBJECT IDENTIFIER')
  // Decode every subidentifier with the same base-128 continuation logic —
  // including the first one, which also happens to encode two arcs at once.
  // Decoding it with plain division (arc1 = floor(first/40)) only works
  // while the first subidentifier fits in one byte; a root arc of 2 allows
  // arc2 to run arbitrarily high (e.g. 2.100.3), which needs the same
  // multi-byte form as any other subidentifier.
  const subIds: number[] = []
  let value = 0
  let pending = false
  for (const byte of bytes) {
    value = value * 128 + (byte & 0x7f)
    pending = true
    if ((byte & 0x80) === 0) {
      subIds.push(value)
      value = 0
      pending = false
    }
  }
  if (pending) throw new Asn1Error('Truncated OBJECT IDENTIFIER')
  const first = subIds[0]
  const arc1 = first < 80 ? Math.floor(first / 40) : 2
  const arc2 = first < 80 ? first % 40 : first - 80
  return [arc1, arc2, ...subIds.slice(1)].join('.')
}

export function readObjectIdentifier(node: Asn1Node): string {
  expectUniversalTag(node, Asn1Tag.ObjectIdentifier, 'OBJECT IDENTIFIER')
  return oidBytesToString(node.content)
}

/** Reads a BIT STRING, returning its raw octets and the count of unused
 * trailing bits in the last octet (DER's own encoding of that count). */
export function readBitString(node: Asn1Node): { bytes: Uint8Array; unusedBits: number } {
  expectUniversalTag(node, Asn1Tag.BitString, 'BIT STRING')
  if (node.content.length === 0) throw new Asn1Error('Empty BIT STRING')
  return { unusedBits: node.content[0], bytes: node.content.subarray(1) }
}

export function readOctetString(node: Asn1Node): Uint8Array {
  expectUniversalTag(node, Asn1Tag.OctetString, 'OCTET STRING')
  return node.content
}

const textDecoder = new TextDecoder()

/** Reads any of the ASN.1 string types a certificate's RDNs and extensions
 * commonly use. DER technically distinguishes their charsets (e.g.
 * PrintableString is ASCII-only, T61String is quirky Teletex) but treating
 * them all as UTF-8-ish text is what every practical viewer does — the
 * bytes are ASCII-compatible in the overwhelming majority of real
 * certificates. */
export function readAnyString(node: Asn1Node): string {
  switch (node.tag) {
    case Asn1Tag.BMPString: {
      // UCS-2BE, not UTF-8 — decode manually.
      let out = ''
      for (let i = 0; i + 1 < node.content.length; i += 2) {
        out += String.fromCharCode((node.content[i] << 8) | node.content[i + 1])
      }
      return out
    }
    case Asn1Tag.UTF8String:
    case Asn1Tag.PrintableString:
    case Asn1Tag.T61String:
    case Asn1Tag.IA5String:
      return textDecoder.decode(node.content)
    default:
      throw new Asn1Error(`Unsupported string tag ${node.tag}`)
  }
}

/** Reads UTCTime (YYMMDDHHMMSSZ, two-digit year — RFC 5280 maps 50-99 to
 * 19xx and 00-49 to 20xx) or GeneralizedTime (YYYYMMDDHHMMSSZ). Certificates
 * only ever use the UTC ("Z") forms in practice; fractional seconds and
 * explicit offsets aren't handled since DER disallows them here. */
export function readTime(node: Asn1Node): Date {
  const raw = textDecoder.decode(node.content)
  const match =
    node.tag === Asn1Tag.UTCTime
      ? /^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/.exec(raw)
      : /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/.exec(raw)
  if (!match) throw new Asn1Error(`Unrecognized time format: ${raw}`)

  if (node.tag === Asn1Tag.UTCTime) {
    const [, yy, mm, dd, hh, min, ss] = match
    const year = Number(yy) >= 50 ? 1900 + Number(yy) : 2000 + Number(yy)
    return new Date(Date.UTC(year, Number(mm) - 1, Number(dd), Number(hh), Number(min), Number(ss)))
  }
  const [, yyyy, mm, dd, hh, min, ss] = match
  return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min), Number(ss)))
}

export function bytesToHex(bytes: Uint8Array, separator = ''): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(separator)
}
