import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import JwkViewerWidget from './JwkViewerWidget'
import { EC_PUBLIC_JWK, JWK_SET, OCT_JWK, RSA_PRIVATE_JWK, RSA_PUBLIC_JWK } from './fixtures'

describe('JwkViewerWidget', () => {
  it('starts empty, with no error and no output', () => {
    render(<JwkViewerWidget instanceId="test" mode="grid" />)
    expect(screen.getByPlaceholderText(/paste a jwk/i)).toHaveValue('')
    expect(screen.queryByText(/RSA/)).not.toBeInTheDocument()
  })

  it('shows an error for text that is not a JWK', async () => {
    const user = userEvent.setup()
    render(<JwkViewerWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByPlaceholderText(/paste a jwk/i))
    await user.paste('{"hello":"world"}')

    expect(await screen.findByText(/jwk object|jwk set/i)).toBeInTheDocument()
  })

  it('parses a pasted RSA public key and shows its summary, expanded by default, keyed by its kid', async () => {
    const user = userEvent.setup()
    render(<JwkViewerWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByPlaceholderText(/paste a jwk/i))
    await user.paste(RSA_PUBLIC_JWK)

    // Appears both as the card's header (its kid) and in the "Key ID" row.
    expect(await screen.findAllByText('rsa-key-1')).toHaveLength(2)
    expect(screen.getByText('RSA 2048-bit (exponent 65537)')).toBeInTheDocument()
    expect(screen.getByText('sig')).toBeInTheDocument()
    expect(screen.queryByText('Private')).not.toBeInTheDocument()
  })

  it('computes the RFC 7638 thumbprint asynchronously', async () => {
    const user = userEvent.setup()
    render(<JwkViewerWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByPlaceholderText(/paste a jwk/i))
    await user.paste(RSA_PUBLIC_JWK)

    await waitFor(() => {
      expect(screen.getByText('kUfbzJAoCvmkUX3TrZXBKsSGc0lGXnxAd_E3qu6ouu4')).toBeInTheDocument()
    })
  })

  it('flags a private key and masks its private material until revealed', async () => {
    const user = userEvent.setup()
    render(<JwkViewerWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByPlaceholderText(/paste a jwk/i))
    await user.paste(RSA_PRIVATE_JWK)

    expect(await screen.findByText('Private')).toBeInTheDocument()
    expect(screen.getByText(/treat this like a password/i)).toBeInTheDocument()

    const revealButton = screen.getByRole('button', { name: /reveal private material/i })
    expect(screen.queryByText(/^I2tGRyqqmqf0/)).not.toBeInTheDocument()

    await user.click(revealButton)
    expect(await screen.findByText(/^I2tGRyqqmqf0/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /hide private material/i })).toBeInTheDocument()
  })

  it('has no copy control for a masked field, only for the revealed value', async () => {
    const user = userEvent.setup()
    render(<JwkViewerWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByPlaceholderText(/paste a jwk/i))
    await user.paste(RSA_PRIVATE_JWK)
    await screen.findByText('Private')

    // Masked: no copy button lets the value out before it's revealed.
    expect(screen.queryByRole('button', { name: /copy d$/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /reveal private material/i }))

    // Revealed: the value is visible and now has its own copy button.
    await screen.findByText(/^I2tGRyqqmqf0/)
    expect(screen.getByRole('button', { name: /copy d$/i })).toBeInTheDocument()
  })

  it('treats an oct key as private since it is pure secret material', async () => {
    const user = userEvent.setup()
    render(<JwkViewerWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByPlaceholderText(/paste a jwk/i))
    await user.paste(OCT_JWK)

    expect(await screen.findByText('Private')).toBeInTheDocument()
    expect(screen.getByText('Symmetric key (256-bit)')).toBeInTheDocument()
    // The secret itself stays masked until revealed, even though the key as
    // a whole is already flagged Private above.
    expect(screen.queryByText(/^W6N-FgU5pH0r3gwzITFs/)).not.toBeInTheDocument()
  })

  it('parses a JWK Set as separate, individually labeled keys', async () => {
    const user = userEvent.setup()
    render(<JwkViewerWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByPlaceholderText(/paste a jwk/i))
    await user.paste(JWK_SET)

    expect(await screen.findByText('Key 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('Key 2 of 2')).toBeInTheDocument()
    expect(screen.getAllByText('rsa-key-1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('ec-key-1').length).toBeGreaterThan(0)
  })

  it('still renders the valid key when a set includes one bad entry', async () => {
    const user = userEvent.setup()
    render(<JwkViewerWidget instanceId="test" mode="grid" />)

    const set = JSON.stringify({ keys: [JSON.parse(EC_PUBLIC_JWK), { kty: 'EC' }] })
    await user.click(screen.getByPlaceholderText(/paste a jwk/i))
    await user.paste(set)

    expect(await screen.findAllByText('ec-key-1')).not.toHaveLength(0)
    expect(screen.getByText(/missing required member/i)).toBeInTheDocument()
  })

  it('clears the parsed output when the input is cleared', async () => {
    const user = userEvent.setup()
    render(<JwkViewerWidget instanceId="test" mode="grid" />)

    const textarea = screen.getByPlaceholderText(/paste a jwk/i)
    await user.click(textarea)
    await user.paste(RSA_PUBLIC_JWK)
    await screen.findAllByText('rsa-key-1')

    await user.clear(textarea)

    expect(screen.queryByText('rsa-key-1')).not.toBeInTheDocument()
  })
})
