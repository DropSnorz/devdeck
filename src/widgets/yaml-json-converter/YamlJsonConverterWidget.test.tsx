import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import YamlJsonConverterWidget from './YamlJsonConverterWidget'
import { setCodeMirrorValue } from '@/test/codemirror'

describe('YamlJsonConverterWidget', () => {
  it('shows a placeholder instead of an error for empty input', () => {
    render(<YamlJsonConverterWidget instanceId="test" mode="grid" />)

    expect(screen.getByText(/output will appear here/i)).toBeInTheDocument()
  })

  it('converts JSON input to YAML output by default', () => {
    render(<YamlJsonConverterWidget instanceId="test" mode="grid" />)

    setCodeMirrorValue(screen.getByRole('textbox', { name: /json input/i }), '{"hello":"world"}')

    expect(screen.getByRole('textbox', { name: /yaml output/i })).toHaveValue('hello: world\n')
  })

  it('shows an error instead of output for invalid JSON', () => {
    render(<YamlJsonConverterWidget instanceId="test" mode="grid" />)

    setCodeMirrorValue(screen.getByRole('textbox', { name: /json input/i }), '{not valid')

    expect(screen.queryByRole('textbox', { name: /yaml output/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/output will appear here/i)).not.toBeInTheDocument()
  })

  it('switches direction and converts YAML input to JSON output', async () => {
    const user = userEvent.setup()
    render(<YamlJsonConverterWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: 'YAML → JSON' }))
    setCodeMirrorValue(screen.getByRole('textbox', { name: /yaml input/i }), 'hello: world')

    expect(screen.getByRole('textbox', { name: /json output/i })).toHaveValue('{\n  "hello": "world"\n}')
  })
})
