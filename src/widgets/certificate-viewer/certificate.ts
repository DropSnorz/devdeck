/** Parses PEM-encoded X.509 certificates into a plain-data shape the widget
 * can render — no chain building, no signature verification, just "what
 * does this certificate say about itself". */
import {
  Asn1Class,
  Asn1Tag,
  type Asn1Node,
  bytesToHex,
  childAt,
  expectUniversalTag,
  oidBytesToString,
  parseAsn1,
  readAnyString,
  readBitString,
  readIntegerHex,
  readObjectIdentifier,
  readOctetString,
  readSmallInteger,
  readTime,
} from './asn1'
import { describeOid } from './oids'

export class CertificateParseError extends Error {}

export interface RdnAttribute {
  oid: string
  name: string
  value: string
}
/** A RelativeDistinguishedName — usually one attribute, occasionally more
 * (a multi-valued RDN, e.g. `CN=x+OU=y`). */
export type Rdn = RdnAttribute[]

export interface GeneralNameEntry {
  type: string
  value: string
}

export type ExtensionDetail =
  | { kind: 'basicConstraints'; isCA: boolean; pathLenConstraint?: number }
  | { kind: 'keyUsage'; usages: string[] }
  | { kind: 'extKeyUsage'; usages: string[] }
  | { kind: 'subjectAltName' | 'issuerAltName'; names: GeneralNameEntry[] }
  | { kind: 'keyIdentifier'; keyId: string }
  | { kind: 'authorityInfoAccess'; entries: { method: string; location: string }[] }
  /** Recognized but not deeply decoded, or genuinely unknown — the raw
   * extension bytes are always shown alongside this. */
  | { kind: 'raw' }

export interface ParsedExtension {
  oid: string
  name: string
  critical: boolean
  detail: ExtensionDetail
  rawHex: string
}

export type PublicKeyInfo =
  | { kind: 'rsa'; keySizeBits: number; exponent: string }
  | { kind: 'ec'; curve: string; keySizeBits: number }
  | { kind: 'eddsa'; algorithm: 'Ed25519' | 'Ed448'; keySizeBits: number }
  | { kind: 'dsa'; keySizeBits: number | null }
  | { kind: 'unknown'; oid: string; name: string }

export interface ParsedCertificate {
  version: number
  serialNumberHex: string
  signatureAlgorithmOid: string
  signatureAlgorithmName: string
  issuer: Rdn[]
  issuerString: string
  subject: Rdn[]
  subjectString: string
  notBefore: Date
  notAfter: Date
  publicKeyAlgorithmOid: string
  publicKey: PublicKeyInfo
  extensions: ParsedExtension[]
  signatureValueHex: string
  /** Raw DER bytes of the whole certificate — what fingerprints hash. */
  der: Uint8Array
}

const CURVE_SIZE_BITS: Record<string, number> = {
  'P-256': 256,
  'P-384': 384,
  'P-521': 521,
  secp256k1: 256,
}

const KEY_USAGE_BITS = [
  'digitalSignature',
  'nonRepudiation',
  'keyEncipherment',
  'dataEncipherment',
  'keyAgreement',
  'keyCertSign',
  'cRLSign',
  'encipherOnly',
  'decipherOnly',
]

const textDecoder = new TextDecoder()

/** Number of significant bits in a DER INTEGER given as hex (from
 * `readIntegerHex`, which already strips the mandatory sign-padding byte).
 * Used for RSA modulus / DSA prime sizes — "2048-bit key" means the true
 * value needs 2048 bits, not that it occupies a round number of bytes. */
function bitLengthFromHex(hex: string): number {
  if (hex === '00') return 0
  let bits = (hex.length / 2 - 1) * 8
  let firstByte = Number.parseInt(hex.slice(0, 2), 16)
  while (firstByte > 0) {
    bits++
    firstByte >>= 1
  }
  return bits
}

function formatIpAddress(bytes: Uint8Array): string {
  if (bytes.length === 4) return Array.from(bytes).join('.')
  if (bytes.length === 16) {
    const groups: number[] = []
    for (let i = 0; i < 16; i += 2) groups.push((bytes[i] << 8) | bytes[i + 1])
    return compressIPv6(groups)
  }
  return bytesToHex(bytes, ':')
}

/** Collapses the longest run of two-or-more zero groups into `::`, per
 * RFC 5952's canonical IPv6 text form. */
function compressIPv6(groups: number[]): string {
  let bestStart = -1
  let bestLen = 0
  let curStart = -1
  let curLen = 0
  for (let i = 0; i < groups.length; i++) {
    if (groups[i] === 0) {
      if (curStart === -1) curStart = i
      curLen++
      if (curLen > bestLen) {
        bestLen = curLen
        bestStart = curStart
      }
    } else {
      curStart = -1
      curLen = 0
    }
  }
  const hex = groups.map((g) => g.toString(16))
  if (bestLen >= 2) {
    const before = hex.slice(0, bestStart).join(':')
    const after = hex.slice(bestStart + bestLen).join(':')
    return `${before}::${after}`
  }
  return hex.join(':')
}

function parseName(node: Asn1Node): Rdn[] {
  expectUniversalTag(node, Asn1Tag.Sequence, 'Name')
  return (node.children ?? []).map((rdnSet) => {
    expectUniversalTag(rdnSet, Asn1Tag.Set, 'RelativeDistinguishedName')
    return (rdnSet.children ?? []).map((attr): RdnAttribute => {
      const oid = readObjectIdentifier(childAt(attr, 0, 'AttributeType'))
      const valueNode = childAt(attr, 1, 'AttributeValue')
      const value =
        valueNode.class === Asn1Class.Universal && valueNode.tag === Asn1Tag.Integer
          ? readIntegerHex(valueNode)
          : readAnyString(valueNode)
      return { oid, name: describeOid(oid), value }
    })
  })
}

export function formatRdns(rdns: Rdn[]): string {
  if (rdns.length === 0) return '(empty)'
  return rdns.map((rdn) => rdn.map((a) => `${a.name}=${a.value}`).join('+')).join(', ')
}

function decodeGeneralName(node: Asn1Node): GeneralNameEntry {
  if (node.class !== Asn1Class.ContextSpecific) {
    return { type: 'other', value: bytesToHex(node.content) }
  }
  switch (node.tag) {
    case 1:
      return { type: 'email', value: textDecoder.decode(node.content) }
    case 2:
      return { type: 'DNS', value: textDecoder.decode(node.content) }
    case 4: {
      // directoryName [4]: Name is itself a CHOICE type, so per X.680 this
      // tag is EXPLICIT even though GeneralName otherwise tags implicitly —
      // our generic DER walker already parsed the wrapped Name SEQUENCE as
      // this node's one child.
      const inner = node.children?.[0]
      return { type: 'directoryName', value: inner ? formatRdns(parseName(inner)) : '' }
    }
    case 6:
      return { type: 'URI', value: textDecoder.decode(node.content) }
    case 7:
      return { type: 'IP', value: formatIpAddress(node.content) }
    case 8:
      return { type: 'registeredID', value: oidBytesToString(node.content) }
    case 0:
      return { type: 'otherName', value: bytesToHex(node.content) }
    default:
      return { type: `[${node.tag}]`, value: bytesToHex(node.content) }
  }
}

function decodeExtensionDetail(oid: string, valueBytes: Uint8Array): ExtensionDetail {
  switch (oid) {
    case '2.5.29.19': {
      // basicConstraints ::= SEQUENCE { cA BOOLEAN DEFAULT FALSE, pathLenConstraint INTEGER OPTIONAL }
      const seq = parseAsn1(valueBytes)
      const children = seq.children ?? []
      let idx = 0
      let isCA = false
      if (children[idx]?.class === Asn1Class.Universal && children[idx].tag === Asn1Tag.Boolean) {
        isCA = children[idx].content.length > 0 && children[idx].content[0] !== 0
        idx++
      }
      const pathLenNode = children[idx]
      return {
        kind: 'basicConstraints',
        isCA,
        pathLenConstraint: pathLenNode ? readSmallInteger(pathLenNode) : undefined,
      }
    }
    case '2.5.29.15': {
      // keyUsage ::= BIT STRING (named bits)
      const { bytes, unusedBits } = readBitString(parseAsn1(valueBytes))
      const totalBits = bytes.length * 8 - unusedBits
      const usages: string[] = []
      for (let i = 0; i < totalBits && i < KEY_USAGE_BITS.length; i++) {
        const byteIdx = Math.floor(i / 8)
        const bitIdx = 7 - (i % 8)
        if ((bytes[byteIdx] >> bitIdx) & 1) usages.push(KEY_USAGE_BITS[i])
      }
      return { kind: 'keyUsage', usages }
    }
    case '2.5.29.37': {
      // extKeyUsage ::= SEQUENCE OF KeyPurposeId (OID)
      const seq = parseAsn1(valueBytes)
      const usages = (seq.children ?? []).map((c) => describeOid(readObjectIdentifier(c)))
      return { kind: 'extKeyUsage', usages }
    }
    case '2.5.29.17':
    case '2.5.29.18': {
      // subjectAltName / issuerAltName ::= SEQUENCE OF GeneralName
      const seq = parseAsn1(valueBytes)
      const names = (seq.children ?? []).map(decodeGeneralName)
      return { kind: oid === '2.5.29.17' ? 'subjectAltName' : 'issuerAltName', names }
    }
    case '2.5.29.14': {
      // subjectKeyIdentifier ::= OCTET STRING
      return { kind: 'keyIdentifier', keyId: bytesToHex(readOctetString(parseAsn1(valueBytes)), ':') }
    }
    case '2.5.29.35': {
      // authorityKeyIdentifier ::= SEQUENCE { keyIdentifier [0] IMPLICIT OCTET STRING OPTIONAL, ... }
      // Only the keyIdentifier is surfaced — issuer name + serial (the
      // alternative, rarer form) are left in the raw fallback.
      const seq = parseAsn1(valueBytes)
      const first = seq.children?.[0]
      if (first?.class === Asn1Class.ContextSpecific && first.tag === 0) {
        return { kind: 'keyIdentifier', keyId: bytesToHex(first.content, ':') }
      }
      return { kind: 'raw' }
    }
    case '1.3.6.1.5.5.7.1.1':
    case '1.3.6.1.5.5.7.1.11': {
      // authorityInfoAccess / subjectInfoAccess ::= SEQUENCE OF AccessDescription
      const seq = parseAsn1(valueBytes)
      const entries = (seq.children ?? []).map((ad) => {
        const method = describeOid(readObjectIdentifier(childAt(ad, 0, 'accessMethod')))
        const location = decodeGeneralName(childAt(ad, 1, 'accessLocation')).value
        return { method, location }
      })
      return { kind: 'authorityInfoAccess', entries }
    }
    default:
      return { kind: 'raw' }
  }
}

function parseExtension(node: Asn1Node): ParsedExtension {
  expectUniversalTag(node, Asn1Tag.Sequence, 'Extension')
  const oid = readObjectIdentifier(childAt(node, 0, 'extnID'))
  const children = node.children ?? []
  let idx = 1
  let critical = false
  if (children[idx]?.class === Asn1Class.Universal && children[idx].tag === Asn1Tag.Boolean) {
    critical = children[idx].content.length > 0 && children[idx].content[0] !== 0
    idx++
  }
  const valueBytes = readOctetString(childAt(node, idx, 'extnValue'))
  // A malformed or exotic extension body shouldn't sink the whole
  // certificate — fall back to showing it as raw bytes.
  let detail: ExtensionDetail
  try {
    detail = decodeExtensionDetail(oid, valueBytes)
  } catch {
    detail = { kind: 'raw' }
  }
  return { oid, name: describeOid(oid), critical, detail, rawHex: bytesToHex(valueBytes) }
}

function parsePublicKey(node: Asn1Node): { algorithmOid: string; info: PublicKeyInfo } {
  expectUniversalTag(node, Asn1Tag.Sequence, 'subjectPublicKeyInfo')
  const algIdNode = childAt(node, 0, 'public key algorithm identifier')
  const algOid = readObjectIdentifier(childAt(algIdNode, 0, 'public key algorithm OID'))
  const { bytes: keyBytes } = readBitString(childAt(node, 1, 'subjectPublicKey'))

  if (algOid === '1.2.840.113549.1.1.1') {
    // RSA: subjectPublicKey wraps SEQUENCE { INTEGER modulus, INTEGER publicExponent }
    const rsaSeq = parseAsn1(keyBytes)
    const modulusHex = readIntegerHex(childAt(rsaSeq, 0, 'modulus'))
    const exponentHex = readIntegerHex(childAt(rsaSeq, 1, 'publicExponent'))
    return {
      algorithmOid: algOid,
      info: { kind: 'rsa', keySizeBits: bitLengthFromHex(modulusHex), exponent: BigInt(`0x${exponentHex}`).toString() },
    }
  }

  if (algOid === '1.2.840.10045.2.1') {
    // EC: algorithm parameters name the curve; subjectPublicKey is the raw point.
    const paramsNode = algIdNode.children?.[1]
    let curve = 'unknown'
    if (paramsNode) {
      try {
        curve = describeOid(readObjectIdentifier(paramsNode))
      } catch {
        // Explicit curve parameters instead of a named curve — rare, and
        // not worth decoding for a viewer widget.
      }
    }
    const keySizeBits =
      keyBytes.length > 0 && keyBytes[0] === 0x04 ? ((keyBytes.length - 1) / 2) * 8 : (CURVE_SIZE_BITS[curve] ?? 0)
    return { algorithmOid: algOid, info: { kind: 'ec', curve, keySizeBits } }
  }

  if (algOid === '1.3.101.112' || algOid === '1.3.101.113') {
    return {
      algorithmOid: algOid,
      info: {
        kind: 'eddsa',
        algorithm: algOid === '1.3.101.112' ? 'Ed25519' : 'Ed448',
        keySizeBits: keyBytes.length * 8,
      },
    }
  }

  if (algOid === '1.2.840.10040.4.1') {
    // DSA: key size comes from the modulus `p` in the algorithm's own parameters.
    const paramsNode = algIdNode.children?.[1]
    let keySizeBits: number | null = null
    const pNode = paramsNode?.children?.[0]
    if (pNode) {
      try {
        keySizeBits = bitLengthFromHex(readIntegerHex(pNode))
      } catch {
        keySizeBits = null
      }
    }
    return { algorithmOid: algOid, info: { kind: 'dsa', keySizeBits } }
  }

  return { algorithmOid: algOid, info: { kind: 'unknown', oid: algOid, name: describeOid(algOid) } }
}

export function parseCertificateDer(der: Uint8Array): ParsedCertificate {
  const top = parseAsn1(der)
  expectUniversalTag(top, Asn1Tag.Sequence, 'Certificate')
  const tbs = childAt(top, 0, 'tbsCertificate')
  const outerSigAlgNode = childAt(top, 1, 'signatureAlgorithm')
  const signatureValueNode = childAt(top, 2, 'signatureValue')

  const tbsChildren = tbs.children ?? []
  let i = 0
  let version = 1
  if (tbsChildren[i]?.class === Asn1Class.ContextSpecific && tbsChildren[i].tag === 0) {
    version = readSmallInteger(childAt(tbsChildren[i], 0, 'version INTEGER')) + 1
    i++
  }
  const serialNumberHex = readIntegerHex(childAt(tbs, i, 'serialNumber'))
  i++
  const tbsSigAlgOid = readObjectIdentifier(childAt(childAt(tbs, i, 'signature'), 0, 'signature algorithm OID'))
  i++
  const issuer = parseName(childAt(tbs, i, 'issuer'))
  i++
  const validityNode = childAt(tbs, i, 'validity')
  const notBefore = readTime(childAt(validityNode, 0, 'notBefore'))
  const notAfter = readTime(childAt(validityNode, 1, 'notAfter'))
  i++
  const subject = parseName(childAt(tbs, i, 'subject'))
  i++
  const { algorithmOid: publicKeyAlgorithmOid, info: publicKey } = parsePublicKey(
    childAt(tbs, i, 'subjectPublicKeyInfo'),
  )
  i++
  // Skip the rarely-used issuerUniqueID [1] / subjectUniqueID [2], if present.
  while (
    tbsChildren[i]?.class === Asn1Class.ContextSpecific &&
    (tbsChildren[i].tag === 1 || tbsChildren[i].tag === 2)
  ) {
    i++
  }
  let extensions: ParsedExtension[] = []
  if (tbsChildren[i]?.class === Asn1Class.ContextSpecific && tbsChildren[i].tag === 3) {
    const extSeq = childAt(tbsChildren[i], 0, 'extensions SEQUENCE')
    extensions = (extSeq.children ?? []).map(parseExtension)
  }

  const signatureAlgorithmOid = readObjectIdentifier(childAt(outerSigAlgNode, 0, 'signature algorithm OID'))
  if (signatureAlgorithmOid !== tbsSigAlgOid) {
    throw new CertificateParseError('tbsCertificate.signature does not match the outer signatureAlgorithm')
  }
  const { bytes: signatureBytes } = readBitString(signatureValueNode)

  return {
    version,
    serialNumberHex,
    signatureAlgorithmOid,
    signatureAlgorithmName: describeOid(signatureAlgorithmOid),
    issuer,
    issuerString: formatRdns(issuer),
    subject,
    subjectString: formatRdns(subject),
    notBefore,
    notAfter,
    publicKeyAlgorithmOid,
    publicKey,
    extensions,
    signatureValueHex: bytesToHex(signatureBytes),
    der,
  }
}

const PEM_CERTIFICATE_RE = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g

/** Splits input text into individual PEM certificate blocks, so a pasted
 * chain (leaf + intermediates) renders as one certificate per block. */
export function extractPemCertificateBlocks(input: string): string[] {
  return input.match(PEM_CERTIFICATE_RE) ?? []
}

export function pemBlockToDer(block: string): Uint8Array {
  const body = block
    .replace('-----BEGIN CERTIFICATE-----', '')
    .replace('-----END CERTIFICATE-----', '')
    .replace(/\s/g, '')
  if (!body) throw new CertificateParseError('Empty certificate body')
  let binary: string
  try {
    binary = atob(body)
  } catch {
    throw new CertificateParseError('Not valid base64 inside the PEM block')
  }
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Parses every certificate found in the pasted text. Throws if none were
 * found at all; a failure decoding one certificate in a multi-cert paste is
 * reported with its position so the user can tell which block is bad. */
export function parseCertificatesFromInput(input: string): ParsedCertificate[] {
  const blocks = extractPemCertificateBlocks(input)
  if (blocks.length === 0) {
    throw new CertificateParseError(
      'No "-----BEGIN CERTIFICATE-----" block found. Paste a PEM-encoded X.509 certificate.',
    )
  }
  return blocks.map((block, index) => {
    try {
      return parseCertificateDer(pemBlockToDer(block))
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      throw new CertificateParseError(blocks.length > 1 ? `Certificate #${index + 1}: ${reason}` : reason)
    }
  })
}
