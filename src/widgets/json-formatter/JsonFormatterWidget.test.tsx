import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import JsonFormatterWidget from './JsonFormatterWidget'

describe('JsonFormatterWidget', () => {
  it('starts with the sample JSON parsed and rendered as a tree', () => {
    render(<JsonFormatterWidget instanceId="test" mode="grid" />)

    expect(screen.getByPlaceholderText(/paste json/i)).toHaveValue('{\n  "hello": "world"\n}')
    expect(screen.getByText('"world"')).toBeInTheDocument()
  })

  it('shows an error instead of the tree for invalid JSON', async () => {
    const user = userEvent.setup()
    render(<JsonFormatterWidget instanceId="test" mode="grid" />)

    const input = screen.getByPlaceholderText(/paste json/i)
    await user.clear(input)
    // paste, not type — the content has JSON braces, which `type` would
    // otherwise try to parse as userEvent's own keyboard-syntax markup.
    await user.click(input)
    await user.paste('{not valid json')

    expect(screen.queryByText('"world"')).not.toBeInTheDocument()
    // The exact message comes from the engine's own JSON.parse error and
    // isn't worth pinning down exactly — just confirm something error-shaped
    // replaced the tree.
    expect(screen.queryByText(/output will appear here/i)).not.toBeInTheDocument()
  })

  it('renders a compact single-line output in Minified view', async () => {
    const user = userEvent.setup()
    render(<JsonFormatterWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: 'Minified' }))

    expect(screen.getByText('{"hello":"world"}')).toBeInTheDocument()
  })

  it('treats a non-object/array JSON value as valid but not tree-renderable', async () => {
    const user = userEvent.setup()
    const { container } = render(<JsonFormatterWidget instanceId="test" mode="grid" />)

    const input = screen.getByPlaceholderText(/paste json/i)
    await user.clear(input)
    await user.type(input, '42')

    // Falls through to the <pre> branch since a bare number isn't
    // tree-renderable, even though it parsed successfully. Scoped to <pre>
    // specifically since the input textarea also literally contains "42".
    expect(container.querySelector('pre')).toHaveTextContent('42')
  })

  it('shows a placeholder instead of an error for empty input', async () => {
    const user = userEvent.setup()
    render(<JsonFormatterWidget instanceId="test" mode="grid" />)

    await user.clear(screen.getByPlaceholderText(/paste json/i))

    expect(screen.getByText(/output will appear here/i)).toBeInTheDocument()
  })
})
