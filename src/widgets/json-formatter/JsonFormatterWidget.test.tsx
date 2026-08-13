import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import JsonFormatterWidget from './JsonFormatterWidget'
import { setCodeMirrorValue } from '@/test/codemirror'

describe('JsonFormatterWidget', () => {
  it('starts with the sample JSON parsed and rendered as a tree', () => {
    render(<JsonFormatterWidget instanceId="test" mode="grid" />)

    // CodeMirror renders each line as its own DOM node, so exact-whitespace
    // equality (the old <textarea>.toHaveValue check) doesn't carry over —
    // a substring check on the rendered text content is the reliable check.
    expect(screen.getByRole('textbox', { name: /json input/i })).toHaveTextContent('"hello"')
    // Scoped to the tree, since the input editor's own text content now
    // also literally contains `"world"` (it's a real contenteditable DOM
    // tree, unlike the old <textarea> whose .value wasn't text-queryable).
    expect(within(screen.getByRole('tree')).getByText('"world"')).toBeInTheDocument()
  })

  it('shows an error instead of the tree for invalid JSON', () => {
    render(<JsonFormatterWidget instanceId="test" mode="grid" />)

    const input = screen.getByRole('textbox', { name: /json input/i })
    setCodeMirrorValue(input, '{not valid json')

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

    // Output is a plain readOnly <textarea>, not a CodeMirror instance —
    // its current value lives in the DOM `.value` property (jest-dom's
    // toHaveValue), not as text content the way CodeMirror's contenteditable
    // renders its lines.
    expect(screen.getByRole('textbox', { name: /json output/i })).toHaveValue(
      '{"hello":"world"}',
    )
  })

  it('treats a non-object/array JSON value as valid but not tree-renderable', () => {
    render(<JsonFormatterWidget instanceId="test" mode="grid" />)

    setCodeMirrorValue(screen.getByRole('textbox', { name: /json input/i }), '42')

    // Falls through to the output textarea since a bare number isn't
    // tree-renderable, even though it parsed successfully.
    expect(screen.getByRole('textbox', { name: /json output/i })).toHaveValue('42')
  })

  it('shows a placeholder instead of an error for empty input', () => {
    render(<JsonFormatterWidget instanceId="test" mode="grid" />)

    setCodeMirrorValue(screen.getByRole('textbox', { name: /json input/i }), '')

    expect(screen.getByText(/output will appear here/i)).toBeInTheDocument()
  })
})
