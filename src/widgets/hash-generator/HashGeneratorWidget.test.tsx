import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SparkMD5 from 'spark-md5'
import HashGeneratorWidget from './HashGeneratorWidget'

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

describe('HashGeneratorWidget', () => {
  it('starts empty, with no hash shown', () => {
    render(<HashGeneratorWidget instanceId="test" mode="grid" />)
    expect(screen.getByPlaceholderText(/hash output/i)).toHaveValue('')
  })

  it('computes a SHA-256 hash for the given input (default algorithm)', async () => {
    const user = userEvent.setup()
    render(<HashGeneratorWidget instanceId="test" mode="grid" />)

    await user.type(screen.getByPlaceholderText(/text to hash/i), 'hello world')

    const expected = await sha256Hex('hello world')
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/hash output/i)).toHaveValue(expected)
    })
  })

  it('computes an MD5 hash once that algorithm is selected', async () => {
    const user = userEvent.setup()
    render(<HashGeneratorWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: 'MD5' }))
    await user.type(screen.getByPlaceholderText(/text to hash/i), 'hello world')

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/hash output/i)).toHaveValue(
        SparkMD5.hash('hello world'),
      )
    })
  })

  it('recomputes the hash when the algorithm changes for the same input', async () => {
    const user = userEvent.setup()
    render(<HashGeneratorWidget instanceId="test" mode="grid" />)

    await user.type(screen.getByPlaceholderText(/text to hash/i), 'hello world')
    const expectedSha256 = await sha256Hex('hello world')
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/hash output/i)).toHaveValue(expectedSha256)
    })

    await user.click(screen.getByRole('button', { name: 'MD5' }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/hash output/i)).toHaveValue(
        SparkMD5.hash('hello world'),
      )
    })
  })

  it('clears the displayed hash instantly when the input is cleared', async () => {
    const user = userEvent.setup()
    render(<HashGeneratorWidget instanceId="test" mode="grid" />)

    const input = screen.getByPlaceholderText(/text to hash/i)
    await user.type(input, 'hello world')
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/hash output/i)).not.toHaveValue('')
    })

    await user.clear(input)

    expect(screen.getByPlaceholderText(/hash output/i)).toHaveValue('')
  })

  it('settles on the hash of the final input after rapid edits, not a stale one', async () => {
    const user = userEvent.setup()
    render(<HashGeneratorWidget instanceId="test" mode="grid" />)

    const input = screen.getByPlaceholderText(/text to hash/i)
    await user.type(input, 'a')
    await user.type(input, 'b')
    await user.type(input, 'c')

    const expected = await sha256Hex('abc')
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/hash output/i)).toHaveValue(expected)
    })
  })
})
