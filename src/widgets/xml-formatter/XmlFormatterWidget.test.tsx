import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import XmlFormatterWidget from './XmlFormatterWidget'
import { setCodeMirrorValue } from '@/test/codemirror'

describe('XmlFormatterWidget', () => {
  it('starts with the sample XML, view defaulted to Plain (no output panel)', () => {
    render(<XmlFormatterWidget instanceId="test" mode="grid" />)

    expect(screen.getByRole('textbox', { name: /xml input/i })).toHaveTextContent('hello')
    expect(screen.queryByRole('tree')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /xml output/i })).not.toBeInTheDocument()
  })

  it('renders the sample XML as a tree once switched to Tree view', async () => {
    const user = userEvent.setup()
    render(<XmlFormatterWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: 'Tree' }))

    expect(within(screen.getByRole('tree')).getByText('"world"')).toBeInTheDocument()
  })

  it('shows an error instead of the tree for invalid XML', async () => {
    const user = userEvent.setup()
    render(<XmlFormatterWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: 'Tree' }))
    const input = screen.getByRole('textbox', { name: /xml input/i })
    setCodeMirrorValue(input, '<root><a>unclosed</root>')

    expect(screen.queryByText('"world"')).not.toBeInTheDocument()
    expect(screen.queryByRole('tree')).not.toBeInTheDocument()
    expect(screen.queryByText(/output will appear here/i)).not.toBeInTheDocument()
  })

  it('renders a compact single-line output in Minified view', async () => {
    const user = userEvent.setup()
    render(<XmlFormatterWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: 'Minified' }))

    expect(screen.getByRole('textbox', { name: /xml output/i })).toHaveValue('<root><hello>world</hello></root>')
  })

  it('renders indented output in Pretty view', async () => {
    const user = userEvent.setup()
    render(<XmlFormatterWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: 'Pretty' }))

    expect(screen.getByRole('textbox', { name: /xml output/i })).toHaveValue('<root>\n  <hello>world</hello>\n</root>')
  })

  it('shows a placeholder instead of an error for empty input', async () => {
    const user = userEvent.setup()
    render(<XmlFormatterWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: 'Tree' }))
    setCodeMirrorValue(screen.getByRole('textbox', { name: /xml input/i }), '')

    expect(screen.getByText(/output will appear here/i)).toBeInTheDocument()
  })
})
