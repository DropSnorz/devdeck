import { describe, expect, it } from 'vitest'
import { buildChains } from './detect'

function labels(chain: ReturnType<typeof buildChains>[number]): string[] {
  return chain.map((node) => node.label)
}

describe('buildChains', () => {
  it('returns nothing for blank input', () => {
    expect(buildChains('')).toEqual([])
    expect(buildChains('   \n  ')).toEqual([])
  })

  it('falls back to Plain text for ordinary prose', () => {
    const chains = buildChains('just some ordinary sentence, nothing special here')
    expect(chains).toHaveLength(1)
    expect(labels(chains[0])).toEqual(['Plain text'])
  })

  it('detects a UUID', () => {
    const chains = buildChains('550e8400-e29b-41d4-a716-446655440000')
    expect(labels(chains[0])).toEqual(['UUID'])
  })

  it('detects a URL', () => {
    const chains = buildChains('https://example.com/path?query=1')
    expect(labels(chains[0])).toEqual(['URL'])
  })

  it('detects an IPv4 CIDR', () => {
    const chains = buildChains('192.168.1.0/24')
    expect(labels(chains[0])).toEqual(['IPv4 CIDR'])
  })

  it('detects a plausible unix timestamp in seconds', () => {
    const chains = buildChains('1700000000')
    const chain = chains.find((c) => c[0].type === 'timestamp')
    expect(chain).toBeDefined()
    expect(chain?.[0].value).toBe(new Date(1700000000 * 1000).toISOString())
  })

  it('detects a leading-# hex color with high confidence', () => {
    const chains = buildChains('#1a2b3c')
    expect(labels(chains[0])).toEqual(['Hex color'])
    expect(chains[0][0].value).toBe('#1a2b3c')
  })

  it('offers both hash and hex-bytes readings for a bare hex string', () => {
    // 64 lowercase hex chars ('61' x32, i.e. the byte 0x61 repeated): same
    // shape as a SHA-256 digest, but also decodes (as bytes) to readable
    // ASCII ("aaa…a"), so both readings should surface.
    const hex = '61'.repeat(32)
    const chains = buildChains(hex)
    const allLabels = chains.flatMap(labels)
    expect(allLabels).toContain('Hex string (possible SHA-256 hash)')
    expect(allLabels.some((l) => l === 'Hex-encoded bytes')).toBe(true)
  })

  it('decodes Base64 down to plain text', () => {
    const chains = buildChains(btoa('hello world'))
    const chain = chains.find((c) => labels(c)[0] === 'Base64')
    expect(chain).toBeDefined()
    expect(labels(chain!)).toEqual(['Base64', 'Plain text'])
    expect(chain![1].value).toBe('hello world')
  })

  it('chains Base64 -> JSON', () => {
    const json = JSON.stringify({ hello: 'world' })
    const chains = buildChains(btoa(json))
    const chain = chains.find((c) => labels(c).includes('JSON'))
    expect(chain).toBeDefined()
    expect(labels(chain!)).toEqual(['Base64', 'JSON'])
    expect(chain![1].value).toBe(json)
  })

  it('chains Base64 -> Base64 -> JSON, capped at 3 layers', () => {
    const json = JSON.stringify({ nested: true })
    const doubled = btoa(btoa(json))
    const chains = buildChains(doubled)
    const chain = chains.find((c) => labels(c).join('>') === 'Base64>Base64>JSON')
    expect(chain).toBeDefined()
    expect(chain).toHaveLength(3)
    expect(chain![2].value).toBe(json)
  })

  it('chains Base64 -> JWT', () => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=+$/, '')
    const payload = btoa(JSON.stringify({ sub: '1234' })).replace(/=+$/, '')
    const jwt = `${header}.${payload}.signature`
    const chains = buildChains(btoa(jwt))
    const chain = chains.find((c) => labels(c).join('>') === 'Base64>JWT')
    expect(chain).toBeDefined()
    expect(chain![1].value).toBe(jwt)
  })

  it('detects a bare JWT directly (no Base64 wrapper)', () => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=+$/, '')
    const payload = btoa(JSON.stringify({ sub: '1234' })).replace(/=+$/, '')
    const jwt = `${header}.${payload}.signature`
    const chains = buildChains(jwt)
    expect(labels(chains[0])).toEqual(['JWT'])
  })

  it('decodes percent-encoded text', () => {
    const chains = buildChains(encodeURIComponent('hello world/?'))
    const chain = chains.find((c) => labels(c)[0] === 'URL-encoded (percent)')
    expect(chain).toBeDefined()
    expect(chain![1].value).toBe('hello world/?')
  })

  it('does not treat gibberish base64-shaped noise as a meaningful peel', () => {
    // Valid base64 alphabet/length, but decodes to bytes that aren't valid
    // UTF-8 — should not be offered as a Base64 candidate.
    const chains = buildChains('////////')
    expect(chains.every((c) => !labels(c).includes('Base64'))).toBe(true)
  })
})
