import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Base64Widget from './Base64Widget'

describe('Base64Widget', () => {
  it('starts empty, with no output', () => {
    render(<Base64Widget instanceId="test" mode="grid" />)
    expect(screen.getByPlaceholderText('Output')).toHaveValue('')
  })

  it('encodes text to base64 by default', async () => {
    const user = userEvent.setup()
    render(<Base64Widget instanceId="test" mode="grid" />)

    await user.type(screen.getByPlaceholderText(/text to encode/i), 'hello')

    expect(screen.getByPlaceholderText('Output')).toHaveValue(btoa('hello'))
  })

  it('decodes base64 back to text once Decode is selected', async () => {
    const user = userEvent.setup()
    render(<Base64Widget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: 'Decode' }))
    await user.type(screen.getByPlaceholderText(/base64 to decode/i), btoa('hello'))

    expect(screen.getByPlaceholderText('Output')).toHaveValue('hello')
  })

  it('shows an error instead of output for invalid base64 input', async () => {
    const user = userEvent.setup()
    render(<Base64Widget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: 'Decode' }))
    await user.type(screen.getByPlaceholderText(/base64 to decode/i), '!!!not base64!!!')

    expect(screen.getByPlaceholderText('Output')).toHaveValue('Invalid base64 input')
  })

  it('round-trips unicode text correctly', async () => {
    const user = userEvent.setup()
    render(<Base64Widget instanceId="test" mode="grid" />)

    await user.type(screen.getByPlaceholderText(/text to encode/i), 'héllo 世界')

    // Capture the encoded string now, as a plain value — the output
    // textarea's own value changes once direction switches below.
    const encodedValue = (screen.getByPlaceholderText('Output') as HTMLTextAreaElement).value
    expect(encodedValue).not.toBe('')

    await user.click(screen.getByRole('button', { name: 'Decode' }))
    await user.clear(screen.getByPlaceholderText(/base64 to decode/i))
    await user.type(screen.getByPlaceholderText(/base64 to decode/i), encodedValue)

    expect(screen.getByPlaceholderText('Output')).toHaveValue('héllo 世界')
  })
})
