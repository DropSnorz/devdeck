import { describe, expect, it } from 'vitest'
import {
  addressTypeOf,
  calculateSubnet,
  formatIPv4,
  ipClassOf,
  maskFromPrefix,
  parseIPv4,
  splitCidrNotation,
  wildcardFromMask,
} from './subnetCalculator'

describe('parseIPv4', () => {
  it('parses a valid dotted-quad address', () => {
    expect(parseIPv4('192.168.1.1')).toBe(0xc0a80101)
    expect(parseIPv4('0.0.0.0')).toBe(0)
    expect(parseIPv4('255.255.255.255')).toBe(0xffffffff)
  })

  it('trims surrounding whitespace', () => {
    expect(parseIPv4('  10.0.0.1  ')).toBe(parseIPv4('10.0.0.1'))
  })

  it('reads a leading zero as decimal, not octal', () => {
    expect(parseIPv4('010.0.0.1')).toBe(parseIPv4('10.0.0.1'))
  })

  it('returns null for the wrong number of parts', () => {
    expect(parseIPv4('1.2.3')).toBeNull()
    expect(parseIPv4('1.2.3.4.5')).toBeNull()
    expect(parseIPv4('')).toBeNull()
  })

  it('returns null for an out-of-range octet', () => {
    expect(parseIPv4('256.0.0.1')).toBeNull()
    expect(parseIPv4('1.2.3.999')).toBeNull()
  })

  it('returns null for non-numeric parts', () => {
    expect(parseIPv4('a.b.c.d')).toBeNull()
    expect(parseIPv4('1.2.3.')).toBeNull()
    expect(parseIPv4('1.2.-3.4')).toBeNull()
  })
})

describe('formatIPv4', () => {
  it('round-trips through parseIPv4', () => {
    for (const ip of ['192.168.1.1', '0.0.0.0', '255.255.255.255', '10.20.30.40']) {
      expect(formatIPv4(parseIPv4(ip)!)).toBe(ip)
    }
  })
})

describe('maskFromPrefix', () => {
  it('computes standard masks', () => {
    expect(maskFromPrefix(24)).toBe(parseIPv4('255.255.255.0'))
    expect(maskFromPrefix(16)).toBe(parseIPv4('255.255.0.0'))
    expect(maskFromPrefix(8)).toBe(parseIPv4('255.0.0.0'))
    expect(maskFromPrefix(32)).toBe(parseIPv4('255.255.255.255'))
  })

  it('handles /0 as all-zero rather than wrapping to all-ones', () => {
    expect(maskFromPrefix(0)).toBe(0)
  })
})

describe('wildcardFromMask', () => {
  it('inverts the mask', () => {
    expect(wildcardFromMask(maskFromPrefix(24))).toBe(parseIPv4('0.0.0.255'))
    expect(wildcardFromMask(maskFromPrefix(0))).toBe(parseIPv4('255.255.255.255'))
  })
})

describe('ipClassOf', () => {
  it('classifies the first octet', () => {
    expect(ipClassOf(parseIPv4('10.0.0.1')!)).toBe('A')
    expect(ipClassOf(parseIPv4('172.16.0.1')!)).toBe('B')
    expect(ipClassOf(parseIPv4('192.168.1.1')!)).toBe('C')
    expect(ipClassOf(parseIPv4('224.0.0.1')!)).toBe('D')
    expect(ipClassOf(parseIPv4('240.0.0.1')!)).toBe('E')
  })
})

describe('addressTypeOf', () => {
  it('labels RFC 1918 private ranges, including their boundaries', () => {
    expect(addressTypeOf(parseIPv4('10.0.0.0')!)).toBe('Private (RFC 1918)')
    expect(addressTypeOf(parseIPv4('10.255.255.255')!)).toBe('Private (RFC 1918)')
    expect(addressTypeOf(parseIPv4('172.16.0.0')!)).toBe('Private (RFC 1918)')
    expect(addressTypeOf(parseIPv4('172.31.255.255')!)).toBe('Private (RFC 1918)')
    expect(addressTypeOf(parseIPv4('192.168.0.0')!)).toBe('Private (RFC 1918)')
    expect(addressTypeOf(parseIPv4('192.168.255.255')!)).toBe('Private (RFC 1918)')
  })

  it('does not treat addresses just outside the 172.16.0.0/12 block as private', () => {
    expect(addressTypeOf(parseIPv4('172.15.255.255')!)).toBe('Public')
    expect(addressTypeOf(parseIPv4('172.32.0.0')!)).toBe('Public')
  })

  it('labels "this network" (0.0.0.0/8)', () => {
    expect(addressTypeOf(parseIPv4('0.0.0.0')!)).toBe('This network (RFC 791)')
    expect(addressTypeOf(parseIPv4('0.255.255.255')!)).toBe('This network (RFC 791)')
  })

  it('labels loopback and link-local ranges', () => {
    expect(addressTypeOf(parseIPv4('127.0.0.1')!)).toBe('Loopback (RFC 1122)')
    expect(addressTypeOf(parseIPv4('127.255.255.255')!)).toBe('Loopback (RFC 1122)')
    expect(addressTypeOf(parseIPv4('169.254.1.1')!)).toBe('Link-local (RFC 3927)')
  })

  it('labels the CGNAT shared address space (100.64.0.0/10), not as public', () => {
    expect(addressTypeOf(parseIPv4('100.64.0.1')!)).toBe('Shared Address Space (RFC 6598)')
    expect(addressTypeOf(parseIPv4('100.127.255.255')!)).toBe('Shared Address Space (RFC 6598)')
  })

  it('does not treat addresses just outside 100.64.0.0/10 as shared address space', () => {
    expect(addressTypeOf(parseIPv4('100.63.255.255')!)).toBe('Public')
    expect(addressTypeOf(parseIPv4('100.128.0.0')!)).toBe('Public')
  })

  it('labels the RFC 5737 documentation ranges', () => {
    expect(addressTypeOf(parseIPv4('192.0.2.1')!)).toBe('Documentation (RFC 5737)')
    expect(addressTypeOf(parseIPv4('198.51.100.1')!)).toBe('Documentation (RFC 5737)')
    expect(addressTypeOf(parseIPv4('203.0.113.1')!)).toBe('Documentation (RFC 5737)')
  })

  it('labels multicast and reserved ranges', () => {
    expect(addressTypeOf(parseIPv4('224.0.0.5')!)).toBe('Multicast')
    expect(addressTypeOf(parseIPv4('239.255.255.255')!)).toBe('Multicast')
    expect(addressTypeOf(parseIPv4('240.0.0.1')!)).toBe('Reserved')
    expect(addressTypeOf(parseIPv4('255.255.255.254')!)).toBe('Reserved')
  })

  it('labels the limited broadcast address distinctly from the surrounding reserved block', () => {
    expect(addressTypeOf(parseIPv4('255.255.255.255')!)).toBe('Limited Broadcast (RFC 919)')
  })

  it('labels everything else public', () => {
    expect(addressTypeOf(parseIPv4('8.8.8.8')!)).toBe('Public')
  })
})

describe('calculateSubnet', () => {
  it('computes a standard /24 subnet', () => {
    const result = calculateSubnet('192.168.1.10', 24)
    expect(result).toMatchObject({
      cidr: '192.168.1.0/24',
      ipAddress: '192.168.1.10',
      networkAddress: '192.168.1.0',
      broadcastAddress: '192.168.1.255',
      subnetMask: '255.255.255.0',
      wildcardMask: '0.0.0.255',
      firstHost: '192.168.1.1',
      lastHost: '192.168.1.254',
      totalAddresses: 256,
      usableHosts: 254,
      ipClass: 'C',
      addressType: 'Private (RFC 1918)',
    })
  })

  it('computes an uneven prefix', () => {
    const result = calculateSubnet('10.4.5.6', 22)
    expect(result).toMatchObject({
      networkAddress: '10.4.4.0',
      broadcastAddress: '10.4.7.255',
      subnetMask: '255.255.252.0',
      firstHost: '10.4.4.1',
      lastHost: '10.4.7.254',
      totalAddresses: 1024,
      usableHosts: 1022,
    })
  })

  it('treats a /31 as a two-address point-to-point link (RFC 3021)', () => {
    const result = calculateSubnet('10.0.0.0', 31)
    expect(result).toMatchObject({
      networkAddress: '10.0.0.0',
      broadcastAddress: '10.0.0.1',
      firstHost: '10.0.0.0',
      lastHost: '10.0.0.1',
      totalAddresses: 2,
      usableHosts: 2,
    })
  })

  it('treats a /32 as a single host route', () => {
    const result = calculateSubnet('10.0.0.5', 32)
    expect(result).toMatchObject({
      networkAddress: '10.0.0.5',
      broadcastAddress: '10.0.0.5',
      firstHost: '10.0.0.5',
      lastHost: '10.0.0.5',
      totalAddresses: 1,
      usableHosts: 1,
    })
  })

  it('computes the whole IPv4 space for /0', () => {
    const result = calculateSubnet('123.45.67.89', 0)
    expect(result).toMatchObject({
      networkAddress: '0.0.0.0',
      broadcastAddress: '255.255.255.255',
      subnetMask: '0.0.0.0',
      wildcardMask: '255.255.255.255',
      totalAddresses: 4294967296,
      usableHosts: 4294967294,
    })
  })

  it('returns null for an invalid address', () => {
    expect(calculateSubnet('999.0.0.1', 24)).toBeNull()
    expect(calculateSubnet('', 24)).toBeNull()
  })

  it('returns null for an out-of-range or non-integer prefix', () => {
    expect(calculateSubnet('10.0.0.1', -1)).toBeNull()
    expect(calculateSubnet('10.0.0.1', 33)).toBeNull()
    expect(calculateSubnet('10.0.0.1', 24.5)).toBeNull()
  })
})

describe('splitCidrNotation', () => {
  it('splits an address and prefix', () => {
    expect(splitCidrNotation('192.168.1.0/24')).toEqual({ address: '192.168.1.0', prefix: 24 })
  })

  it('trims surrounding whitespace', () => {
    expect(splitCidrNotation('  10.0.0.0/8  ')).toEqual({ address: '10.0.0.0', prefix: 8 })
  })

  it('returns null without exactly one slash', () => {
    expect(splitCidrNotation('192.168.1.0')).toBeNull()
    expect(splitCidrNotation('192.168.1.0/24/8')).toBeNull()
  })

  it('returns null for a non-numeric or out-of-range prefix', () => {
    expect(splitCidrNotation('192.168.1.0/abc')).toBeNull()
    expect(splitCidrNotation('192.168.1.0/33')).toBeNull()
    expect(splitCidrNotation('192.168.1.0/-1')).toBeNull()
  })
})
