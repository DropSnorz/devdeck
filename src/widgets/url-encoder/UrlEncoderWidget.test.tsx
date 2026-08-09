import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UrlEncoderWidget from './UrlEncoderWidget'

describe('UrlEncoderWidget', () => {
  it('starts empty, with no output', () => {
    render(<UrlEncoderWidget instanceId="test" mode="grid" />)
    expect(screen.getByPlaceholderText('Output')).toHaveValue('')
  })

  it('encodes with encodeURIComponent by default (Component mode)', async () => {
    const user = userEvent.setup()
    render(<UrlEncoderWidget instanceId="test" mode="grid" />)

    await user.type(screen.getByPlaceholderText(/text or url to encode/i), 'a/b?c=d')

    expect(screen.getByPlaceholderText('Output')).toHaveValue(encodeURIComponent('a/b?c=d'))
  })

  it('decodes back to the original text once Decode is selected', async () => {
    const user = userEvent.setup()
    render(<UrlEncoderWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: 'Decode' }))
    await user.type(screen.getByPlaceholderText(/url to decode/i), encodeURIComponent('a/b?c=d'))

    expect(screen.getByPlaceholderText('Output')).toHaveValue('a/b?c=d')
  })

  it('Full URI mode leaves URL-structural characters like "/" unescaped, unlike Component mode', async () => {
    const user = userEvent.setup()
    render(<UrlEncoderWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: 'Full URI' }))
    await user.type(screen.getByPlaceholderText(/text or url to encode/i), 'a/b c')

    expect(screen.getByPlaceholderText('Output')).toHaveValue(encodeURI('a/b c'))
    expect(screen.getByPlaceholderText('Output')).not.toHaveValue(encodeURIComponent('a/b c'))
  })

  it('shows an error for input that cannot be decoded', async () => {
    const user = userEvent.setup()
    render(<UrlEncoderWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: 'Decode' }))
    // A lone "%" is not a valid percent-escape sequence.
    await user.type(screen.getByPlaceholderText(/url to decode/i), '%')

    expect(screen.getByPlaceholderText('Output')).toHaveValue('Invalid input for decoding')
  })
})
