import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TextCaseConverterWidget from './TextCaseConverterWidget'

describe('TextCaseConverterWidget', () => {
  it('shows an em dash placeholder for every case when empty', () => {
    render(<TextCaseConverterWidget instanceId="test" mode="grid" />)
    expect(screen.getAllByText('—')).toHaveLength(6)
  })

  it('converts space-separated words into every case', async () => {
    const user = userEvent.setup()
    render(<TextCaseConverterWidget instanceId="test" mode="grid" />)

    await user.type(screen.getByPlaceholderText(/enter text/i), 'hello world')

    expect(screen.getByText('helloWorld')).toBeInTheDocument()
    expect(screen.getByText('HelloWorld')).toBeInTheDocument()
    expect(screen.getByText('hello_world')).toBeInTheDocument()
    expect(screen.getByText('hello-world')).toBeInTheDocument()
    expect(screen.getByText('HELLO_WORLD')).toBeInTheDocument()
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('splits an already-camelCased input on word boundaries too', async () => {
    const user = userEvent.setup()
    render(<TextCaseConverterWidget instanceId="test" mode="grid" />)

    await user.type(screen.getByPlaceholderText(/enter text/i), 'myVariableName')

    expect(screen.getByText('my_variable_name')).toBeInTheDocument()
    expect(screen.getByText('my-variable-name')).toBeInTheDocument()
    expect(screen.getByText('MY_VARIABLE_NAME')).toBeInTheDocument()
  })

  it('splits on hyphens and underscores as word boundaries too', async () => {
    const user = userEvent.setup()
    render(<TextCaseConverterWidget instanceId="test" mode="grid" />)

    await user.type(screen.getByPlaceholderText(/enter text/i), 'foo-bar_baz')

    expect(screen.getByText('fooBarBaz')).toBeInTheDocument()
    expect(screen.getByText('Foo Bar Baz')).toBeInTheDocument()
  })
})
