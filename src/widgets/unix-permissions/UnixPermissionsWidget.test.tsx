import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UnixPermissionsWidget from './UnixPermissionsWidget'

function octalField() {
  return screen.getByLabelText<HTMLInputElement>(/^octal/i)
}

function symbolicField() {
  return screen.getByLabelText<HTMLInputElement>(/^symbolic/i)
}

describe('UnixPermissionsWidget', () => {
  it('starts at 644 (rw-r--r--), a common default file mode', () => {
    render(<UnixPermissionsWidget instanceId="test" mode="grid" />)

    expect(octalField()).toHaveValue('644')
    expect(symbolicField()).toHaveValue('-rw-r--r--')
    expect(screen.getByText(/nothing unusual/i)).toBeInTheDocument()
  })

  it('toggling a checkbox updates the octal and symbolic fields', async () => {
    const user = userEvent.setup()
    render(<UnixPermissionsWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: 'Owner execute' }))

    expect(octalField()).toHaveValue('744')
    expect(symbolicField()).toHaveValue('-rwxr--r--')
  })

  it('typing a valid octal value updates the checkboxes and symbolic field', async () => {
    const user = userEvent.setup()
    render(<UnixPermissionsWidget instanceId="test" mode="grid" />)

    await user.clear(octalField())
    await user.type(octalField(), '755')

    expect(symbolicField()).toHaveValue('-rwxr-xr-x')
    expect(screen.getByRole('button', { name: 'Owner execute' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Group write' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows an error for an invalid octal value without discarding the last valid state', async () => {
    const user = userEvent.setup()
    render(<UnixPermissionsWidget instanceId="test" mode="grid" />)

    await user.clear(octalField())
    await user.type(octalField(), '899')

    expect(screen.getByText(/0-7/)).toBeInTheDocument()
    expect(symbolicField()).toHaveValue('-rw-r--r--')
  })

  it('typing a symbolic value updates the file type and checkboxes', async () => {
    const user = userEvent.setup()
    render(<UnixPermissionsWidget instanceId="test" mode="grid" />)

    await user.clear(symbolicField())
    await user.type(symbolicField(), 'drwxr-xr-x')

    expect(octalField()).toHaveValue('755')
    expect(screen.getByRole('button', { name: 'Directory' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('applies a preset when clicked', async () => {
    const user = userEvent.setup()
    render(<UnixPermissionsWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: '777' }))

    expect(octalField()).toHaveValue('777')
    expect(symbolicField()).toHaveValue('-rwxrwxrwx')
  })

  it('warns when a file is made world-writable', () => {
    render(<UnixPermissionsWidget instanceId="test" mode="grid" />)

    fireEvent.change(octalField(), { target: { value: '646' } })

    expect(screen.getByText(/world-writable: any user/i)).toBeInTheDocument()
  })

  it('flags setuid combined with world-writable as the top danger', () => {
    render(<UnixPermissionsWidget instanceId="test" mode="grid" />)

    // Owner execute must be on too: setuid on a file nobody can execute has
    // no effect, so it doesn't reach "severe risk" (see permissions.test.ts).
    fireEvent.change(octalField(), { target: { value: '4746' } })

    expect(screen.getByText(/setuid combined with world-writable/i)).toBeInTheDocument()
  })

  it('reflects the target name in the generated chmod commands', async () => {
    const user = userEvent.setup()
    render(<UnixPermissionsWidget instanceId="test" mode="grid" />)

    const targetInput = screen.getByLabelText(/^on$/i)
    await user.clear(targetInput)
    await user.type(targetInput, 'script.sh')

    expect(screen.getByText("chmod 644 -- 'script.sh'")).toBeInTheDocument()
    expect(screen.getByText("chmod u=rw,g=r,o=r -- 'script.sh'")).toBeInTheDocument()
  })
})
