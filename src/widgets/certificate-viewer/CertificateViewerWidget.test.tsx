import { describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CertificateViewerWidget from './CertificateViewerWidget'
import { EC_CA_CERT_PEM, RSA_LEAF_CERT_PEM } from './fixtures'

describe('CertificateViewerWidget', () => {
  it('starts empty, with no error and no output', () => {
    render(<CertificateViewerWidget instanceId="test" mode="grid" />)
    expect(screen.getByPlaceholderText(/paste one or more pem certificates/i)).toHaveValue('')
    expect(screen.queryByText(/CN=/)).not.toBeInTheDocument()
  })

  it('shows an error for text that has no PEM block', async () => {
    const user = userEvent.setup()
    render(<CertificateViewerWidget instanceId="test" mode="grid" />)

    await user.type(screen.getByPlaceholderText(/paste one or more pem certificates/i), 'not a certificate')

    expect(await screen.findByText(/no.*begin certificate.*block found/i)).toBeInTheDocument()
  })

  it('parses a pasted RSA certificate and shows its subject, expanded by default', async () => {
    const user = userEvent.setup()
    render(<CertificateViewerWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByPlaceholderText(/paste one or more pem certificates/i))
    await user.paste(RSA_LEAF_CERT_PEM)

    expect(await screen.findByText('devdeck.example.com')).toBeInTheDocument()
    // Self-signed, so subject and issuer render as the identical string.
    expect(
      screen.getAllByText('C=US, ST=California, L=San Francisco, O=DevDeck, OU=Engineering, CN=devdeck.example.com'),
    ).toHaveLength(2)
    expect(screen.getByText('RSA 2048-bit (exponent 65537)')).toBeInTheDocument()
    expect(screen.getByText('Valid')).toBeInTheDocument()
  })

  it('shows the subject alternative names as chips', async () => {
    const user = userEvent.setup()
    render(<CertificateViewerWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByPlaceholderText(/paste one or more pem certificates/i))
    await user.paste(RSA_LEAF_CERT_PEM)

    expect(await screen.findByText('DNS: devdeck.example.com')).toBeInTheDocument()
    expect(screen.getByText('DNS: www.devdeck.example.com')).toBeInTheDocument()
    expect(screen.getByText('IP: 127.0.0.1')).toBeInTheDocument()
    expect(screen.getByText('email: admin@example.com')).toBeInTheDocument()
  })

  it('computes SHA-256/SHA-1 fingerprints asynchronously', async () => {
    const user = userEvent.setup()
    render(<CertificateViewerWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByPlaceholderText(/paste one or more pem certificates/i))
    await user.paste(RSA_LEAF_CERT_PEM)

    await waitFor(() => {
      expect(
        screen.getByText(
          '0a:8f:3a:3c:60:bc:b4:d9:17:15:9a:b6:bc:88:fc:d0:65:81:9e:de:9f:5e:d0:bd:3b:ed:0c:33:1e:65:ad:1f',
        ),
      ).toBeInTheDocument()
    })
    expect(screen.getByText('97:a9:a6:d6:68:a1:db:74:1f:b8:2c:fb:1d:f6:ff:db:ee:a9:73:d1')).toBeInTheDocument()
  })

  it('renders CA:TRUE with a path length for the EC CA certificate', async () => {
    const user = userEvent.setup()
    render(<CertificateViewerWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByPlaceholderText(/paste one or more pem certificates/i))
    await user.paste(EC_CA_CERT_PEM)

    expect(await screen.findByText('EC P-256 (256-bit)')).toBeInTheDocument()
    expect(screen.getByText('CA:TRUE, path length 1')).toBeInTheDocument()
  })

  it('parses a pasted chain as separate, individually labeled certificates', async () => {
    const user = userEvent.setup()
    render(<CertificateViewerWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByPlaceholderText(/paste one or more pem certificates/i))
    await user.paste(`${RSA_LEAF_CERT_PEM}\n${EC_CA_CERT_PEM}`)

    expect(await screen.findByText('Certificate 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('Certificate 2 of 2')).toBeInTheDocument()
    expect(screen.getByText('devdeck.example.com')).toBeInTheDocument()
    expect(screen.getByText('DevDeck Root CA')).toBeInTheDocument()
  })

  it('clears the parsed output when the input is cleared', async () => {
    const user = userEvent.setup()
    render(<CertificateViewerWidget instanceId="test" mode="grid" />)

    const textarea = screen.getByPlaceholderText(/paste one or more pem certificates/i)
    await user.click(textarea)
    await user.paste(RSA_LEAF_CERT_PEM)
    await screen.findByText('devdeck.example.com')

    await user.clear(textarea)

    expect(screen.queryByText('devdeck.example.com')).not.toBeInTheDocument()
  })

  it('marks the keyUsage extension as critical', async () => {
    const user = userEvent.setup()
    render(<CertificateViewerWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByPlaceholderText(/paste one or more pem certificates/i))
    await user.paste(RSA_LEAF_CERT_PEM)

    const keyUsageLabel = await screen.findByText('keyUsage')
    expect(within(keyUsageLabel.parentElement as HTMLElement).getByText('critical')).toBeInTheDocument()
  })
})
