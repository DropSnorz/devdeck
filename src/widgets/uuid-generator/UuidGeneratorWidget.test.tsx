import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UuidGeneratorWidget from './UuidGeneratorWidget'

const UUID_TEXT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// The version nibble is the first character of the third dash-separated group.
function versionOf(uuid: string): string {
  return uuid.split('-')[2][0]
}

describe('UuidGeneratorWidget', () => {
  it('starts empty, with no UUID pre-generated', () => {
    render(<UuidGeneratorWidget instanceId="test" mode="grid" />)
    expect(screen.queryByText(UUID_TEXT)).not.toBeInTheDocument()
    expect(
      screen.getByText(/generated uuids will appear here/i),
    ).toBeInTheDocument()
  })

  it('generates a v4 UUID by default once Generate is clicked', async () => {
    const user = userEvent.setup()
    render(<UuidGeneratorWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: /generate/i }))

    const [latest] = await screen.findAllByText(UUID_TEXT)
    expect(versionOf(latest.textContent ?? '')).toBe('4')
  })

  it('generates a v1 UUID once v1 is selected', async () => {
    const user = userEvent.setup()
    render(<UuidGeneratorWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: 'v1' }))
    await user.click(screen.getByRole('button', { name: /generate/i }))

    const [latest] = await screen.findAllByText(UUID_TEXT)
    expect(versionOf(latest.textContent ?? '')).toBe('1')
  })

  it('generates a v7 UUID once v7 is selected', async () => {
    const user = userEvent.setup()
    render(<UuidGeneratorWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: 'v7' }))
    await user.click(screen.getByRole('button', { name: /generate/i }))

    const [latest] = await screen.findAllByText(UUID_TEXT)
    expect(versionOf(latest.textContent ?? '')).toBe('7')
  })

  it('disables Generate for v5 until a name is entered, and is deterministic for the same input', async () => {
    const user = userEvent.setup()
    render(<UuidGeneratorWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: 'v5' }))
    const generateButton = screen.getByRole('button', { name: /generate/i })
    expect(generateButton).toBeDisabled()

    await user.type(screen.getByPlaceholderText(/name to hash/i), 'example.com')
    expect(generateButton).not.toBeDisabled()

    await user.click(generateButton)
    await user.click(generateButton)

    const uuids = await screen.findAllByText(UUID_TEXT)
    expect(versionOf(uuids[0].textContent ?? '')).toBe('5')
    // Same name + namespace (DNS, the default preset) must hash identically
    // every time — that's the entire point of v5.
    expect(uuids[0].textContent).toBe(uuids[1].textContent)
  })

  it('rejects an invalid custom namespace for v3', async () => {
    const user = userEvent.setup()
    render(<UuidGeneratorWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: 'v3' }))
    await user.click(screen.getByRole('button', { name: 'Custom' }))
    await user.type(
      screen.getByPlaceholderText(/namespace uuid/i),
      'not-a-uuid',
    )
    await user.type(screen.getByPlaceholderText(/name to hash/i), 'anything')

    expect(
      screen.getByText(/namespace must be a valid uuid/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generate/i })).toBeDisabled()
  })
})
