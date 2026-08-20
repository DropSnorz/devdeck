import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// EYEDROPPER_SUPPORTED is read once at module load, so each "supported"
// scenario needs `window.EyeDropper` stubbed *before* a fresh import of the
// component — hence vi.resetModules() + a dynamic import per test instead of
// the usual static import.
async function importWithEyeDropper(open: () => Promise<{ sRGBHex: string }>) {
  vi.stubGlobal(
    'EyeDropper',
    class {
      open = open
    },
  )
  vi.resetModules()
  return (await import('./ScreenColorPicker')).ScreenColorPicker
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('ScreenColorPicker', () => {
  it('renders a disabled button when window.EyeDropper is unavailable', async () => {
    vi.resetModules()
    const { ScreenColorPicker } = await import('./ScreenColorPicker')
    render(<ScreenColorPicker onPick={() => {}} />)

    const button = screen.getByRole('button', { name: /pick color from screen/i })
    expect(button).toBeInTheDocument()
    expect(button).toBeDisabled()
  })

  it('calls onPick with the sampled color when supported', async () => {
    const ScreenColorPicker = await importWithEyeDropper(() => Promise.resolve({ sRGBHex: '#ff0000' }))
    const onPick = vi.fn()
    const user = userEvent.setup()
    render(<ScreenColorPicker onPick={onPick} />)

    await user.click(screen.getByRole('button', { name: 'Pick color from screen' }))

    expect(onPick).toHaveBeenCalledWith('#ff0000')
  })

  it('silently returns to idle when the user cancels (AbortError)', async () => {
    const ScreenColorPicker = await importWithEyeDropper(() =>
      Promise.reject(new DOMException('cancelled', 'AbortError')),
    )
    const onPick = vi.fn()
    const user = userEvent.setup()
    render(<ScreenColorPicker onPick={onPick} />)

    await user.click(screen.getByRole('button', { name: 'Pick color from screen' }))

    expect(onPick).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Pick color from screen' })).toBeInTheDocument()
  })

  it('shows a transient failed state on a real error', async () => {
    const ScreenColorPicker = await importWithEyeDropper(() => Promise.reject(new Error('boom')))
    const onPick = vi.fn()
    const user = userEvent.setup()
    render(<ScreenColorPicker onPick={onPick} />)

    await user.click(screen.getByRole('button', { name: 'Pick color from screen' }))

    expect(onPick).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Screen pick failed' })).toBeInTheDocument()
  })
})
