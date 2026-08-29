import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TokenCounterWidget from './TokenCounterWidget'

describe('TokenCounterWidget', () => {
  it('starts at zero', () => {
    render(<TokenCounterWidget instanceId="test" mode="grid" />)
    expect(screen.getByText('ChatGPT / Claude tokens')).toBeInTheDocument()
    expect(screen.getByText('~0')).toBeInTheDocument()
  })

  it('shows a single estimated token count once text is entered', async () => {
    const user = userEvent.setup()
    render(<TokenCounterWidget instanceId="test" mode="grid" />)

    await user.type(screen.getByPlaceholderText(/paste a prompt/i), 'Hello, world!')

    expect(screen.getByText(/^~\d+$/)).toBeInTheDocument()
  })

  it('shows character and word counts', async () => {
    const user = userEvent.setup()
    render(<TokenCounterWidget instanceId="test" mode="grid" />)

    await user.type(screen.getByPlaceholderText(/paste a prompt/i), 'hello world')

    expect(screen.getByText(/11 characters/)).toBeInTheDocument()
    expect(screen.getByText(/2 words/)).toBeInTheDocument()
  })

  it('links to the real count_tokens API for an exact Claude count', () => {
    render(<TokenCounterWidget instanceId="test" mode="grid" />)
    expect(screen.getByRole('link', { name: /count_tokens api/i })).toHaveAttribute(
      'href',
      'https://platform.claude.com/docs/en/build-with-claude/token-counting',
    )
  })
})
