const OCTET = /^\d{1,3}$/

/** Parses a dotted-quad IPv4 address into an unsigned 32-bit integer.
 * Returns `null` for anything that isn't exactly four decimal octets in
 * [0, 255] — including addresses with too few/many parts, non-digit
 * characters, or an out-of-range octet — rather than throwing, since the
 * widget calls this on every keystroke. Octets are read as plain decimal
 * (a leading zero is just a leading zero, not an octal escape), unlike
 * some OS resolvers — this is a calculator, not something parsing
 * untrusted network input. */
export function parseIPv4(value: string): number | null {
  const parts = value.trim().split('.')
  if (parts.length !== 4) return null

  let result = 0
  for (const part of parts) {
    if (!OCTET.test(part)) return null
    const octet = Number(part)
    if (octet > 255) return null
    result = result * 256 + octet
  }
  return result >>> 0
}

/** Formats an unsigned 32-bit integer back into dotted-quad notation. */
export function formatIPv4(ip: number): string {
  return [ip >>> 24, (ip >>> 16) & 255, (ip >>> 8) & 255, ip & 255].join('.')
}

function isValidPrefix(prefix: number): boolean {
  return Number.isInteger(prefix) && prefix >= 0 && prefix <= 32
}

/** Subnet mask for a given prefix length, as an unsigned 32-bit integer.
 * Handled separately from the `<<` below because `x << 32` is a no-op in
 * JS (shift amounts wrap mod 32), which would otherwise turn /0 into a
 * full mask instead of 0.0.0.0. */
export function maskFromPrefix(prefix: number): number {
  if (!isValidPrefix(prefix)) return 0
  if (prefix === 0) return 0
  return (0xffffffff << (32 - prefix)) >>> 0
}

export function wildcardFromMask(mask: number): number {
  return ~mask >>> 0
}

/** First octet's class per the historical A/B/C/D/E scheme. Classful
 * routing hasn't mattered since CIDR, but the label is still commonly
 * expected on a subnet calculator. */
export function ipClassOf(ip: number): 'A' | 'B' | 'C' | 'D' | 'E' {
  const firstOctet = ip >>> 24
  if (firstOctet < 128) return 'A'
  if (firstOctet < 192) return 'B'
  if (firstOctet < 224) return 'C'
  if (firstOctet < 240) return 'D'
  return 'E'
}

/** Labels the well-known special-use ranges (RFC 1918 private space,
 * loopback, link-local, multicast, reserved) and falls back to "Public"
 * for everything else. */
export function addressTypeOf(ip: number): string {
  const a = ip >>> 24
  const b = (ip >>> 16) & 255
  if (a === 10) return 'Private (RFC 1918)'
  if (a === 172 && b >= 16 && b <= 31) return 'Private (RFC 1918)'
  if (a === 192 && b === 168) return 'Private (RFC 1918)'
  if (a === 127) return 'Loopback'
  if (a === 169 && b === 254) return 'Link-local'
  if (a >= 224 && a <= 239) return 'Multicast'
  if (a >= 240) return 'Reserved'
  return 'Public'
}

export interface SubnetResult {
  cidr: string
  ipAddress: string
  networkAddress: string
  broadcastAddress: string
  subnetMask: string
  wildcardMask: string
  firstHost: string
  lastHost: string
  totalAddresses: number
  usableHosts: number
  ipClass: 'A' | 'B' | 'C' | 'D' | 'E'
  addressType: string
}

/** Usable host count for a prefix: /32 is a single host route (1), /31 is
 * a point-to-point link where RFC 3021 treats both addresses as usable
 * (2), and everything else loses the network and broadcast addresses from
 * the block total. */
function usableHostCount(prefix: number, totalAddresses: number): number {
  if (prefix === 32) return 1
  if (prefix === 31) return 2
  return Math.max(totalAddresses - 2, 0)
}

/** Computes full subnet details for `ipInput` (a dotted-quad address) and
 * `prefix` (a /0-/32 CIDR prefix length). Returns `null` if either input
 * is invalid rather than throwing, since the widget recomputes on every
 * keystroke. */
export function calculateSubnet(ipInput: string, prefix: number): SubnetResult | null {
  const ip = parseIPv4(ipInput)
  if (ip === null || !isValidPrefix(prefix)) return null

  const mask = maskFromPrefix(prefix)
  const wildcard = wildcardFromMask(mask)
  const network = (ip & mask) >>> 0
  const broadcast = (network | wildcard) >>> 0
  const totalAddresses = 2 ** (32 - prefix)

  const [firstHost, lastHost] =
    prefix === 32 ? [network, network] : prefix === 31 ? [network, broadcast] : [network + 1, broadcast - 1]

  return {
    cidr: `${formatIPv4(network)}/${prefix}`,
    ipAddress: formatIPv4(ip),
    networkAddress: formatIPv4(network),
    broadcastAddress: formatIPv4(broadcast),
    subnetMask: formatIPv4(mask),
    wildcardMask: formatIPv4(wildcard),
    firstHost: formatIPv4(firstHost),
    lastHost: formatIPv4(lastHost),
    totalAddresses,
    usableHosts: usableHostCount(prefix, totalAddresses),
    ipClass: ipClassOf(ip),
    addressType: addressTypeOf(ip),
  }
}

/** Splits `"192.168.1.0/24"` into its address and prefix parts, e.g. for
 * pasting a full CIDR block into the address field. Returns `null` unless
 * there's exactly one `/` and the suffix is a valid /0-/32 prefix — the
 * address half is returned unparsed/unvalidated so the caller can still
 * surface an address-specific error. */
export function splitCidrNotation(input: string): { address: string; prefix: number } | null {
  const parts = input.trim().split('/')
  if (parts.length !== 2) return null
  const [address, prefixPart] = parts
  if (!/^\d{1,2}$/.test(prefixPart)) return null
  const prefix = Number(prefixPart)
  if (!isValidPrefix(prefix)) return null
  return { address, prefix }
}
