import { describe, expect, it } from 'vitest'
import { JwkParseError, computeJwkThumbprint, parseJwkInput } from './jwk'
import {
  EC_PRIVATE_JWK,
  EC_PUBLIC_JWK,
  JWK_SET,
  OCT_JWK,
  OKP_PUBLIC_JWK,
  RFC7638_EXAMPLE_JWK,
  RFC7638_EXAMPLE_THUMBPRINT,
  RSA_PRIVATE_JWK,
  RSA_PUBLIC_JWK,
} from './fixtures'

function firstOk(input: string) {
  const [result] = parseJwkInput(input)
  if (result.status !== 'ok') throw new Error(`expected ok, got error: ${result.message}`)
  return result.jwk
}

describe('parseJwkInput', () => {
  it('throws for invalid JSON', () => {
    expect(() => parseJwkInput('not json')).toThrow(JwkParseError)
  })

  it('throws for JSON that is neither a JWK nor a JWK Set', () => {
    expect(() => parseJwkInput('{"hello":"world"}')).toThrow(/JWK object|JWK Set/)
    expect(() => parseJwkInput('42')).toThrow(JwkParseError)
  })

  it('throws for an empty JWK Set', () => {
    expect(() => parseJwkInput('{"keys":[]}')).toThrow(/no keys/)
  })

  it('parses a bare RSA public key', () => {
    const jwk = firstOk(RSA_PUBLIC_JWK)
    expect(jwk.kty).toBe('RSA')
    expect(jwk.keySizeBits).toBe(2048)
    expect(jwk.isPrivate).toBe(false)
    expect(jwk.summary).toBe('RSA 2048-bit (exponent 65537)')
    expect(jwk.use).toBe('sig')
    expect(jwk.alg).toBe('RS256')
    expect(jwk.kid).toBe('rsa-key-1')
  })

  it('flags an RSA private key via its d/p/q members', () => {
    const jwk = firstOk(RSA_PRIVATE_JWK)
    expect(jwk.isPrivate).toBe(true)
    expect(jwk.keySizeBits).toBe(2048)
  })

  it('parses an EC public key and infers its curve size', () => {
    const jwk = firstOk(EC_PUBLIC_JWK)
    expect(jwk.kty).toBe('EC')
    expect(jwk.curve).toBe('P-256')
    expect(jwk.keySizeBits).toBe(256)
    expect(jwk.isPrivate).toBe(false)
    expect(jwk.summary).toBe('EC P-256 (256-bit)')
  })

  it('flags an EC private key via its d member', () => {
    const jwk = firstOk(EC_PRIVATE_JWK)
    expect(jwk.isPrivate).toBe(true)
  })

  it('parses an Ed25519 (OKP) public key', () => {
    const jwk = firstOk(OKP_PUBLIC_JWK)
    expect(jwk.kty).toBe('OKP')
    expect(jwk.curve).toBe('Ed25519')
    expect(jwk.keySizeBits).toBe(256)
    expect(jwk.isPrivate).toBe(false)
  })

  it('treats an oct key as private since its only member is the secret itself', () => {
    const jwk = firstOk(OCT_JWK)
    expect(jwk.kty).toBe('oct')
    expect(jwk.isPrivate).toBe(true)
    expect(jwk.keySizeBits).toBe(256)
    expect(jwk.summary).toBe('Symmetric key (256-bit)')
  })

  it('parses every key in a JWK Set', () => {
    const results = parseJwkInput(JWK_SET)
    expect(results).toHaveLength(2)
    expect(results.every((r) => r.status === 'ok')).toBe(true)
  })

  it('reports a malformed key in a set as an error without losing the others', () => {
    const results = parseJwkInput(
      JSON.stringify({ keys: [JSON.parse(RSA_PUBLIC_JWK), { kty: 'EC' }, 'not an object'] }),
    )
    expect(results).toHaveLength(3)
    expect(results[0]).toMatchObject({ status: 'ok' })
    expect(results[1]).toMatchObject({ status: 'error' })
    expect(results[2]).toMatchObject({ status: 'error' })
  })

  it('throws for a bare object with neither "kty" nor "keys"', () => {
    expect(() => parseJwkInput('{"n":"abc","e":"AQAB"}')).toThrow(JwkParseError)
  })

  it('reports a key missing "kty" inside a set as a per-entry error', () => {
    const [result] = parseJwkInput('{"keys":[{"n":"abc","e":"AQAB"}]}')
    expect(result).toMatchObject({ status: 'error', message: expect.stringMatching(/kty/) })
  })

  it('reports an EC key missing its coordinates as a per-entry error', () => {
    const [result] = parseJwkInput('{"keys":[{"kty":"EC"}]}')
    expect(result).toMatchObject({ status: 'error', message: expect.stringMatching(/crv|x|y/) })
  })

  it('accepts a bare array of keys, outside the formal spec but common in the wild', () => {
    const results = parseJwkInput(`[${RSA_PUBLIC_JWK}, ${EC_PUBLIC_JWK}]`)
    expect(results).toHaveLength(2)
  })
})

describe('computeJwkThumbprint', () => {
  it('matches the RFC 7638 §3.1 worked example', async () => {
    const jwk = firstOk(RFC7638_EXAMPLE_JWK)
    expect(jwk.thumbprintInput).not.toBeNull()
    const thumbprint = await computeJwkThumbprint(jwk.thumbprintInput as string)
    expect(thumbprint).toBe(RFC7638_EXAMPLE_THUMBPRINT)
  })

  it('is null for a key type without defined required members', () => {
    const [result] = parseJwkInput('{"kty":"unknown-type","x":"abc"}')
    if (result.status !== 'ok') throw new Error('expected ok')
    expect(result.jwk.thumbprintInput).toBeNull()
  })
})
