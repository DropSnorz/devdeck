import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommandPalette } from './CommandPalette'
import { useCommandPaletteStore } from './useCommandPaletteStore'

describe('CommandPalette', () => {
  beforeEach(() => {
    useCommandPaletteStore.setState({ open: false })
  })

  it('renders nothing when closed', () => {
    render(<CommandPalette />)
    expect(
      screen.queryByPlaceholderText(/search tools or actions/i),
    ).not.toBeInTheDocument()
  })

  it('shows the full tool list and narrows it as you type', async () => {
    useCommandPaletteStore.setState({ open: true })
    render(<CommandPalette />)
    const user = userEvent.setup()

    expect(await screen.findByText('JSON Formatter')).toBeInTheDocument()
    expect(screen.getByText('UUID Generator')).toBeInTheDocument()

    const input = screen.getByPlaceholderText(/search tools or actions/i)
    await user.type(input, 'json')

    expect(screen.getByText('JSON Formatter')).toBeInTheDocument()
    expect(screen.queryByText('UUID Generator')).not.toBeInTheDocument()
  })

  it('includes the always-available actions alongside the tool list', () => {
    useCommandPaletteStore.setState({ open: true })
    render(<CommandPalette />)
    expect(screen.getByText(/add a widget/i)).toBeInTheDocument()
    expect(screen.getByText(/share dashboard/i)).toBeInTheDocument()
  })
})
