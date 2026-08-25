import { describe, expect, it } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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

  it('offers a copy button for the decoded header and payload', async () => {
    const user = userEvent.setup()
    render(<JwtDecoderWidget instanceId="test" mode="grid" />)

    const token = buildToken(HEADER, { sub: '1234567890' })
    await user.type(screen.getByPlaceholderText(/paste a jwt/i), token)

    expect(screen.getByRole('button', { name: /copy header/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copy payload/i })).toBeInTheDocument()
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
    // — just confirm the error-styled paragraph (ErrorMessage) rendered.
    expect(container.querySelector('p.text-destructive')).not.toBeNull()
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

  describe('encode mode', () => {
    function getTokenOutput() {
      return screen.getByDisplayValue(/^ey/, { exact: false }) as HTMLTextAreaElement
    }

    it('produces an unsigned token by default (no secret provided)', async () => {
      const user = userEvent.setup()
      render(<JwtDecoderWidget instanceId="test" mode="grid" />)

      await user.click(screen.getByRole('button', { name: 'Encode' }))

      await waitFor(() => expect(getTokenOutput().value).toMatch(/^ey\S+\.ey\S+\.$/))
      expect(screen.getByText(/provide a secret above to sign the token/i)).toBeInTheDocument()
    })

    it('hints that only HS256 is supported once the header uses another alg', async () => {
      const user = userEvent.setup()
      render(<JwtDecoderWidget instanceId="test" mode="grid" />)

      await user.click(screen.getByRole('button', { name: 'Encode' }))
      fireEvent.change(screen.getByLabelText(/^header$/i), {
        target: { value: '{"alg":"RS256","typ":"JWT"}' },
      })
      await user.type(screen.getByLabelText(/^secret$/i), 'whatever')

      await waitFor(() => expect(getTokenOutput().value).toMatch(/^ey\S+\.ey\S+\.$/))
      expect(screen.getByText(/only hs256 signing is supported/i)).toBeInTheDocument()
    })

    it('signs a real HS256 token matching a known reference value', async () => {
      // The widget's default header/payload are the well-known jwt.io
      // example — with its example secret, the output must match the
      // exact published token byte-for-byte, which verifies both the
      // encoding (JSON + base64url) and the HMAC-SHA256 signature itself,
      // not just that *some* signature got appended.
      const user = userEvent.setup()
      render(<JwtDecoderWidget instanceId="test" mode="grid" />)

      await user.click(screen.getByRole('button', { name: 'Encode' }))
      await user.type(screen.getByLabelText(/^secret$/i), 'your-256-bit-secret')

      await waitFor(() =>
        expect(getTokenOutput().value).toBe(
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        ),
      )
    })

    it('round-trips through decode mode', async () => {
      const user = userEvent.setup()
      render(<JwtDecoderWidget instanceId="test" mode="grid" />)

      await user.click(screen.getByRole('button', { name: 'Encode' }))
      await user.type(screen.getByLabelText(/^secret$/i), 'a-secret')
      await waitFor(() => expect(getTokenOutput().value).toMatch(/^ey\S+\.ey\S+\.\S+$/))
      const token = getTokenOutput().value

      await user.click(screen.getByRole('button', { name: 'Decode' }))
      await user.type(screen.getByPlaceholderText(/paste a jwt/i), token)

      expect(screen.getByText(/"john doe"/i)).toBeInTheDocument()
    })

    it('shows an error for invalid header/payload JSON', async () => {
      const user = userEvent.setup()
      const { container } = render(<JwtDecoderWidget instanceId="test" mode="grid" />)

      await user.click(screen.getByRole('button', { name: 'Encode' }))
      await user.clear(screen.getByLabelText(/^header$/i))
      await user.type(screen.getByLabelText(/^header$/i), 'not json')

      // Exact wording comes from JSON.parse's own error and isn't worth
      // pinning down exactly — just confirm the error-styled paragraph
      // (ErrorMessage) rendered instead of the "only HS256" hint.
      await waitFor(() => expect(container.querySelector('p.text-destructive')).not.toBeNull())
      expect(screen.queryByText(/only hs256/i)).not.toBeInTheDocument()
    })

    it('offers a copy button for the encoded token', async () => {
      const user = userEvent.setup()
      render(<JwtDecoderWidget instanceId="test" mode="grid" />)

      await user.click(screen.getByRole('button', { name: 'Encode' }))

      await waitFor(() => expect(getTokenOutput().value).not.toBe(''))
      expect(screen.getByRole('button', { name: /^copy$/i })).toBeInTheDocument()
    })
  })
})
