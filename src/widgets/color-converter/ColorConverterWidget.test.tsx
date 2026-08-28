import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ColorConverterWidget from './ColorConverterWidget'

// Matched by their "HEX"/"RGB"/"HSL" label text, not by display value — the
// native color-picker input also starts with "#", which collides with
// getByDisplayValue(/^#/) for the hex field otherwise.
function hexField() {
  return screen.getByLabelText(/hex/i)
}
function rgbField() {
  return screen.getByLabelText(/rgb/i)
}
function hslField() {
  return screen.getByLabelText(/hsl/i)
}

describe('ColorConverterWidget', () => {
  it('starts at the default blue, with hex/rgb/hsl all in sync', () => {
    render(<ColorConverterWidget instanceId="test" mode="grid" />)

    expect(hexField()).toHaveValue('#65a1fe')
    expect(rgbField()).toHaveValue('rgb(101, 161, 254)')
    expect(hslField()).toHaveValue('hsl(216, 99%, 70%)')
  })

  it('typing a new hex value updates rgb and hsl to match', async () => {
    const user = userEvent.setup()
    render(<ColorConverterWidget instanceId="test" mode="grid" />)

    await user.clear(hexField())
    await user.type(hexField(), '#ff0000')

    expect(rgbField()).toHaveValue('rgb(255, 0, 0)')
    expect(hslField()).toHaveValue('hsl(0, 100%, 50%)')
  })

  it('leaves the other fields untouched while a hex value is invalid/in progress', async () => {
    const user = userEvent.setup()
    render(<ColorConverterWidget instanceId="test" mode="grid" />)

    const rgbBefore = (rgbField() as HTMLInputElement).value
    await user.clear(hexField())
    await user.type(hexField(), 'not-a-color')

    // The field being typed into shows exactly what was typed...
    expect(hexField()).toHaveValue('not-a-color')
    // ...but nothing else updates until it parses as a valid color.
    expect(rgbField()).toHaveValue(rgbBefore)
  })

  it('typing a new rgb value updates hex and hsl to match', async () => {
    const user = userEvent.setup()
    render(<ColorConverterWidget instanceId="test" mode="grid" />)

    await user.clear(rgbField())
    await user.type(rgbField(), 'rgb(0, 255, 0)')

    expect(hexField()).toHaveValue('#00ff00')
    expect(hslField()).toHaveValue('hsl(120, 100%, 50%)')
  })

  it('picking a color with the native color input updates every field', () => {
    render(<ColorConverterWidget instanceId="test" mode="grid" />)

    fireEvent.change(screen.getByLabelText('Pick a color'), { target: { value: '#00ff00' } })

    expect(hexField()).toHaveValue('#00ff00')
    expect(rgbField()).toHaveValue('rgb(0, 255, 0)')
  })

  it('shows both picker buttons, disabled where the browser lacks the underlying API', () => {
    // jsdom has neither window.EyeDropper nor navigator.mediaDevices.getDisplayMedia
    // (matching e.g. Firefox for the screen picker) — both buttons should stay
    // visible rather than disappear, just disabled. Their supported behavior
    // is covered by PageColorPicker's and ScreenColorPicker's own tests.
    render(<ColorConverterWidget instanceId="test" mode="grid" />)

    expect(screen.getByRole('button', { name: /pick color from page/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /pick color from screen/i })).toBeDisabled()
  })
})
