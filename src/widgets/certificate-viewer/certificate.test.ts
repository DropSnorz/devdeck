import { describe, expect, it } from 'vitest'
import {
  CertificateParseError,
  extractPemCertificateBlocks,
  parseCertificateDer,
  parseCertificatesFromInput,
  pemBlockToDer,
} from './certificate'
import { EC_CA_CERT_PEM, RSA_LEAF_CERT_PEM } from './fixtures'

describe('parseCertificatesFromInput — RSA leaf certificate', () => {
  const [cert] = parseCertificatesFromInput(RSA_LEAF_CERT_PEM)

  it('reads version and serial number', () => {
    expect(cert.version).toBe(3)
    expect(cert.serialNumberHex).toBe('20daff65ab5688c27e3a682322690273d34db9dd')
  })

  it('reads subject and issuer (self-signed, so they match)', () => {
    expect(cert.subjectString).toBe(
      'C=US, ST=California, L=San Francisco, O=DevDeck, OU=Engineering, CN=devdeck.example.com',
    )
    expect(cert.issuerString).toBe(cert.subjectString)
  })

  it('reads validity dates', () => {
    expect(cert.notBefore.toISOString()).toBe('2026-08-18T21:27:48.000Z')
    expect(cert.notAfter.toISOString()).toBe('2036-08-15T21:27:48.000Z')
  })

  it('reads the signature algorithm', () => {
    expect(cert.signatureAlgorithmName).toBe('sha256WithRSAEncryption')
  })

  it('reads the RSA public key', () => {
    expect(cert.publicKey).toEqual({ kind: 'rsa', keySizeBits: 2048, exponent: '65537' })
  })

  it('reads basicConstraints', () => {
    const ext = cert.extensions.find((e) => e.oid === '2.5.29.19')
    expect(ext?.critical).toBe(true)
    expect(ext?.detail).toEqual({ kind: 'basicConstraints', isCA: false, pathLenConstraint: undefined })
  })

  it('reads keyUsage bits', () => {
    const ext = cert.extensions.find((e) => e.oid === '2.5.29.15')
    expect(ext?.critical).toBe(true)
    expect(ext?.detail).toEqual({ kind: 'keyUsage', usages: ['digitalSignature', 'keyEncipherment'] })
  })

  it('reads extKeyUsage', () => {
    const ext = cert.extensions.find((e) => e.oid === '2.5.29.37')
    expect(ext?.detail).toEqual({ kind: 'extKeyUsage', usages: ['serverAuth', 'clientAuth'] })
  })

  it('reads subjectAltName entries of every supported type', () => {
    const ext = cert.extensions.find((e) => e.oid === '2.5.29.17')
    expect(ext?.detail).toEqual({
      kind: 'subjectAltName',
      names: [
        { type: 'DNS', value: 'devdeck.example.com' },
        { type: 'DNS', value: 'www.devdeck.example.com' },
        { type: 'IP', value: '127.0.0.1' },
        { type: 'email', value: 'admin@example.com' },
      ],
    })
  })

  it('reads matching subject/authority key identifiers (self-signed)', () => {
    const ski = cert.extensions.find((e) => e.oid === '2.5.29.14')
    const aki = cert.extensions.find((e) => e.oid === '2.5.29.35')
    expect(ski?.detail).toEqual({
      kind: 'keyIdentifier',
      keyId: '1a:ce:bd:d5:ae:3e:aa:8c:38:c9:12:8b:2f:0d:82:83:94:e1:5d:8f',
    })
    expect(aki?.detail).toEqual(ski?.detail)
  })

  it('exposes the raw DER bytes for fingerprinting', () => {
    expect(cert.der.byteLength).toBeGreaterThan(0)
    // DER always opens with a SEQUENCE tag.
    expect(cert.der[0]).toBe(0x30)
  })
})

describe('parseCertificatesFromInput — EC CA certificate', () => {
  const [cert] = parseCertificatesFromInput(EC_CA_CERT_PEM)

  it('reads the EC public key and named curve', () => {
    expect(cert.publicKey).toEqual({ kind: 'ec', curve: 'P-256', keySizeBits: 256 })
  })

  it('reads the ECDSA signature algorithm', () => {
    expect(cert.signatureAlgorithmName).toBe('ecdsaWithSHA256')
  })

  it('reads a CA basicConstraints with a path length', () => {
    const ext = cert.extensions.find((e) => e.oid === '2.5.29.19')
    expect(ext?.detail).toEqual({ kind: 'basicConstraints', isCA: true, pathLenConstraint: 1 })
  })

  it('reads CA-flavored keyUsage bits', () => {
    const ext = cert.extensions.find((e) => e.oid === '2.5.29.15')
    expect(ext?.detail).toEqual({ kind: 'keyUsage', usages: ['keyCertSign', 'cRLSign'] })
  })

  it('has no subjectAltName extension', () => {
    expect(cert.extensions.find((e) => e.oid === '2.5.29.17')).toBeUndefined()
  })
})

describe('extractPemCertificateBlocks', () => {
  it('finds a single block', () => {
    expect(extractPemCertificateBlocks(RSA_LEAF_CERT_PEM)).toHaveLength(1)
  })

  it('finds multiple concatenated blocks, in order', () => {
    const blocks = extractPemCertificateBlocks(`${RSA_LEAF_CERT_PEM}\n${EC_CA_CERT_PEM}`)
    expect(blocks).toHaveLength(2)
    expect(pemBlockToDer(blocks[0])).toEqual(pemBlockToDer(RSA_LEAF_CERT_PEM))
    expect(pemBlockToDer(blocks[1])).toEqual(pemBlockToDer(EC_CA_CERT_PEM))
  })

  it('ignores surrounding prose', () => {
    const blocks = extractPemCertificateBlocks(`Here's our cert:\n\n${RSA_LEAF_CERT_PEM}\n\nThanks!`)
    expect(blocks).toHaveLength(1)
  })

  it('returns no blocks for plain text', () => {
    expect(extractPemCertificateBlocks('not a certificate')).toEqual([])
  })
})

describe('parseCertificatesFromInput — error handling', () => {
  it('throws CertificateParseError when no PEM block is present', () => {
    expect(() => parseCertificatesFromInput('hello world')).toThrow(CertificateParseError)
  })

  it('throws for a PEM block with invalid base64', () => {
    const bad = '-----BEGIN CERTIFICATE-----\nnot-base64!!!\n-----END CERTIFICATE-----'
    expect(() => parseCertificatesFromInput(bad)).toThrow(CertificateParseError)
  })

  it('throws for well-formed base64 that is not a valid certificate', () => {
    const bad = `-----BEGIN CERTIFICATE-----\n${btoa('this is not DER')}\n-----END CERTIFICATE-----`
    expect(() => parseCertificatesFromInput(bad)).toThrow(CertificateParseError)
  })

  it('numbers the failing certificate in a multi-cert paste', () => {
    const bad = `-----BEGIN CERTIFICATE-----\n${btoa('nope')}\n-----END CERTIFICATE-----`
    expect(() => parseCertificatesFromInput(`${RSA_LEAF_CERT_PEM}\n${bad}`)).toThrow('Certificate #2')
  })

  it('parses multiple certificates from one paste', () => {
    const certs = parseCertificatesFromInput(`${RSA_LEAF_CERT_PEM}\n${EC_CA_CERT_PEM}`)
    expect(certs).toHaveLength(2)
    expect(certs[0].publicKey.kind).toBe('rsa')
    expect(certs[1].publicKey.kind).toBe('ec')
  })
})

describe('parseCertificateDer', () => {
  it('is the same as going through parseCertificatesFromInput for a single block', () => {
    const der = pemBlockToDer(RSA_LEAF_CERT_PEM)
    const direct = parseCertificateDer(der)
    const [viaInput] = parseCertificatesFromInput(RSA_LEAF_CERT_PEM)
    expect(direct.subjectString).toBe(viaInput.subjectString)
  })
})
