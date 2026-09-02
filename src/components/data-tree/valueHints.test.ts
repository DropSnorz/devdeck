import { describe, expect, it } from 'vitest'
import { describeNode, lengthNote, relativeTime, words } from './valueHints'

const NOW = Date.parse('2024-03-18T12:00:00Z')

function hint(label: string, value: string | number | boolean | null) {
  return describeNode({ label, kind: typeof value === 'number' ? 'number' : 'string', value }, NOW)
}

describe('words', () => {
  it('splits every naming style a key can arrive in', () => {
    expect(words('createdAt')).toEqual(['created', 'at'])
    expect(words('created_at')).toEqual(['created', 'at'])
    expect(words('@user-id')).toEqual(['user', 'id'])
    expect(words('#text')).toEqual(['text'])
  })
})

describe('describeNode: name rules', () => {
  it('recognizes a compound key by its last word', () => {
    expect(hint('orderId', 'x').icon).toBe('id')
    expect(hint('avatarUrl', 'x').icon).toBe('link')
    expect(hint('@user_email', 'x').icon).toBe('mail')
  })

  it('does not read a word that merely ends in a known one', () => {
    // `valid` ends with the letters "id" but is not an id — the whole point
    // of matching words rather than substrings.
    expect(hint('valid', 'yes').icon).toBeUndefined()
  })

  it('flags secret-ish keys with a warn tone', () => {
    expect(hint('clientSecret', 'x')).toMatchObject({ icon: 'secret', tone: 'warn' })
    expect(hint('accessToken', 'x')).toMatchObject({ icon: 'secret', tone: 'warn' })
  })
})

describe('describeNode: value rules', () => {
  it('previews a color value as a swatch', () => {
    expect(hint('accent', '#38bdf8')).toMatchObject({ icon: 'color', swatch: '#38bdf8' })
    expect(hint('shade', 'rgb(1, 2, 3)').swatch).toBe('rgb(1, 2, 3)')
    expect(hint('label', '#nothex').swatch).toBeUndefined()
  })

  it('makes an http value followable, whatever the key is called', () => {
    expect(hint('data', 'https://localgrid.dev').href).toBe('https://localgrid.dev')
    expect(hint('data', 'ftp://localgrid.dev').href).toBeUndefined()
  })

  it('annotates an ISO timestamp with how long ago it is', () => {
    expect(hint('createdAt', '2024-03-11T12:00:00Z')).toMatchObject({ icon: 'time', note: '7 days ago' })
  })

  it('decodes an epoch number only under a time-ish key', () => {
    expect(hint('exp', 1710763200)).toMatchObject({ icon: 'time', note: '2024-03-18 12:00 UTC' })
    expect(hint('exp', 1710763200000).note).toBe('2024-03-18 12:00 UTC')
    // Same magnitude, but a count is not a date.
    expect(hint('total', 1710763200).note).toBeUndefined()
  })

  it('labels UUIDs and JWTs', () => {
    expect(hint('ref', '8f14e45f-ea8b-4f1e-9c0a-2b6d7c3e5a91')).toMatchObject({ icon: 'id', note: 'UUID' })
    expect(hint('data', 'eyJhbGciOiJIUzI1NiJ9.eyJhIjoxfQ.sig')).toMatchObject({ icon: 'secret', note: 'JWT' })
  })

  it('leaves a container alone: nothing to decode without a value', () => {
    expect(describeNode({ label: 'createdAt', kind: 'object', value: undefined }, NOW).note).toBeUndefined()
  })
})

describe('relativeTime', () => {
  it('reads in both directions and collapses the near past', () => {
    expect(relativeTime(new Date(NOW - 5_000), NOW)).toBe('just now')
    expect(relativeTime(new Date(NOW - 3 * 3600_000), NOW)).toBe('3 hours ago')
    expect(relativeTime(new Date(NOW - 25 * 3600_000), NOW)).toBe('1 day ago')
    expect(relativeTime(new Date(NOW + 400 * 24 * 3600_000), NOW)).toBe('in 1 year')
  })
})

describe('lengthNote', () => {
  it('only annotates strings long enough for their size to be the point', () => {
    expect(lengthNote('string', 'short')).toBeNull()
    expect(lengthNote('string', 'x'.repeat(120))).toBe('120 chars')
    expect(lengthNote('number', 123456789)).toBeNull()
  })
})
