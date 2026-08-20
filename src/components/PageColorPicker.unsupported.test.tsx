import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageColorPicker } from './PageColorPicker'

// A separate file so this module-level mock (DISPLAY_CAPTURE_SUPPORTED:
// false) doesn't collide with PageColorPicker.test.tsx's mock of the same
// module (DISPLAY_CAPTURE_SUPPORTED: true) — vi.mock factories are static
// per file, not per test.
vi.mock('./pageCapture', () => ({
  DISPLAY_CAPTURE_SUPPORTED: false,
  captureViewportFrame: vi.fn(),
}))

describe('PageColorPicker (unsupported)', () => {
  it('renders a disabled button when tab/screen capture is unavailable', () => {
    render(<PageColorPicker onPick={() => {}} />)

    const button = screen.getByRole('button', { name: /pick color from page/i })
    expect(button).toBeInTheDocument()
    expect(button).toBeDisabled()
  })
})
