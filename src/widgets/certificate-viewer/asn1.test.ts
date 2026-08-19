import { describe, expect, it } from 'vitest'
import { Asn1Error, oidBytesToString } from './asn1'

describe('oidBytesToString', () => {
  it('decodes a common single-byte-first-subidentifier OID', () => {
    // 2.5.4.3 (commonName): first byte = 2*40 + 5 = 85 = 0x55.
    expect(oidBytesToString(Uint8Array.from([0x55, 0x04, 0x03]))).toBe('2.5.4.3')
  })

  it('decodes a multi-byte non-first subidentifier', () => {
    // 1.2.840.113549.1.1.1 (rsaEncryption).
    const bytes = Uint8Array.from([0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01])
    expect(oidBytesToString(bytes)).toBe('1.2.840.113549.1.1.1')
  })

  it('decodes a root-arc-2 OID whose second arc needs a multi-byte first subidentifier', () => {
    // 2.100.3: first subidentifier = 80 + 100 = 180, which needs two bytes
    // (0x81 0x34) since it doesn't fit under 128.
    const bytes = Uint8Array.from([0x81, 0x34, 0x03])
    expect(oidBytesToString(bytes)).toBe('2.100.3')
  })

  it('throws on a truncated final subidentifier instead of silently dropping it', () => {
    // Last byte still has its continuation bit (0x80) set.
    const bytes = Uint8Array.from([0x55, 0x04, 0x83])
    expect(() => oidBytesToString(bytes)).toThrow(Asn1Error)
  })

  it('throws on empty content', () => {
    expect(() => oidBytesToString(new Uint8Array())).toThrow(Asn1Error)
  })
})
