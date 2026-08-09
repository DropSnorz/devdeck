import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import JwtDecoderWidget from './JwtDecoderWidget'

function base64UrlEncode(value: unknown): string {
  const base64 = btoa(JSON.stringify(value))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function buildToken(header: unknown, payload: unknown, signature = 'signature'): string {
  return `${base64UrlEncode(header)}.${base64UrlEncode(payload)}.${signature}`
}

const HEADER = { alg: 'HS256', typ: 'JWT' }

describe('JwtDecoderWidget', () => {
  it('starts empty, with nothing decoded', () => {
    render(<JwtDecoderWidget instanceId="test" mode="grid" />)
    expect(screen.getByPlaceholderText(/paste a jwt/i)).toHaveValue('')
    expect(screen.queryByText(/signature not verified/i)).not.toBeInTheDocument()
  })

  it('decodes a valid token and shows its header and payload', async () => {
    const user = userEvent.setup()
    render(<JwtDecoderWidget instanceId="test" mode="grid" />)

    const token = buildToken(HEADER, { sub: '1234567890', name: 'John Doe' })
    await user.type(screen.getByPlaceholderText(/paste a jwt/i), token)

    expect(screen.getByText(/"john doe"/i)).toBeInTheDocument()
    expect(screen.getByText(/"hs256"/i)).toBeInTheDocument()
    expect(screen.getByText(/signature not verified/i)).toBeInTheDocument()
  })

  it('shows an error for a token that is not 3 dot-separated parts', async () => {
    const user = userEvent.setup()
    render(<JwtDecoderWidget instanceId="test" mode="grid" />)

    await user.type(screen.getByPlaceholderText(/paste a jwt/i), 'not-a-real-jwt')

    expect(
      screen.getByText(/a jwt has 3 dot-separated parts/i),
    ).toBeInTheDocument()
  })

  it('shows an error for a token whose parts are not valid base64/JSON', async () => {
    const user = userEvent.setup()
    const { container } = render(<JwtDecoderWidget instanceId="test" mode="grid" />)

    await user.type(screen.getByPlaceholderText(/paste a jwt/i), 'not.valid.parts')

    expect(screen.queryByText(/signature not verified/i)).not.toBeInTheDocument()
    // Exact wording comes from atob/JSON.parse and isn't worth pinning down
    // — just confirm the error-styled paragraph rendered.
    expect(container.querySelector('p.text-red-600')).not.toBeNull()
  })

  it('shows "Valid until" for a token with a future exp claim', async () => {
    const user = userEvent.setup()
    render(<JwtDecoderWidget instanceId="test" mode="grid" />)

    const futureExp = Math.floor(Date.now() / 1000) + 3600
    const token = buildToken(HEADER, { exp: futureExp })
    await user.type(screen.getByPlaceholderText(/paste a jwt/i), token)

    expect(screen.getByText(/valid until/i)).toBeInTheDocument()
    expect(screen.queryByText(/^expired/i)).not.toBeInTheDocument()
  })

  it('shows "Expired" for a token with a past exp claim', async () => {
    const user = userEvent.setup()
    render(<JwtDecoderWidget instanceId="test" mode="grid" />)

    const pastExp = Math.floor(Date.now() / 1000) - 3600
    const token = buildToken(HEADER, { exp: pastExp })
    await user.type(screen.getByPlaceholderText(/paste a jwt/i), token)

    expect(screen.getByText(/^expired/i)).toBeInTheDocument()
  })

  it('shows no expiry badge for a payload with no exp claim', async () => {
    const user = userEvent.setup()
    render(<JwtDecoderWidget instanceId="test" mode="grid" />)

    const token = buildToken(HEADER, { sub: 'no-exp-here' })
    await user.type(screen.getByPlaceholderText(/paste a jwt/i), token)

    expect(screen.queryByText(/valid until|expired/i)).not.toBeInTheDocument()
  })
})
