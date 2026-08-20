import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { captureViewportFrame } from './pageCapture'
import { PageColorPicker } from './PageColorPicker'

// pageCapture.ts wraps getDisplayMedia/<video>/<canvas> browser plumbing
// jsdom can't run for real (no getDisplayMedia, no canvas 2D backend, no
// video playback) — mock the module boundary instead. pageCapture.ts itself
// is thin orchestration over those APIs and is verified manually in a real
// browser rather than unit-tested.
vi.mock('./pageCapture', () => ({
  DISPLAY_CAPTURE_SUPPORTED: true,
  captureViewportFrame: vi.fn(),
}))

const CANVAS_SIZE = 100

// A stand-in for the canvas captureViewportFrame would normally return —
// square, matching the display canvas's mocked bounding rect below, so
// clicking at (x, y) samples pixel (x, y) with no letterbox math involved
// (that math has its own dedicated tests in canvasCoordinates.test.ts).
// Only the pieces PageColorPicker actually reads (getContext('2d') /
// getImageData / width / height) need to behave.
function fakeCapturedCanvas(pixel: [number, number, number, number]) {
  return {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    getContext: (type: string) => (type === '2d' ? { getImageData: () => ({ data: pixel }) } : null),
  } as unknown as HTMLCanvasElement
}

const mockedCaptureViewportFrame = vi.mocked(captureViewportFrame)

beforeEach(() => {
  // jsdom canvases report a zero-size bounding rect by default, which
  // mapClientPointToCanvasPixel treats as "not rendered yet" and rejects.
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    right: CANVAS_SIZE,
    bottom: CANVAS_SIZE,
    x: 0,
    y: 0,
    toJSON: () => {},
  } as DOMRect)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

async function openPicker(onPick: (hex: string) => void) {
  const user = userEvent.setup()
  render(<PageColorPicker onPick={onPick} />)
  await user.click(screen.getByRole('button', { name: 'Pick color from page' }))
  await waitFor(() => screen.getByTestId('page-color-picker-overlay'))
  return user
}

describe('PageColorPicker', () => {
  it('captures the tab and shows the captured picture to review', async () => {
    mockedCaptureViewportFrame.mockResolvedValue(fakeCapturedCanvas([255, 0, 0, 255]))
    await openPicker(() => {})

    expect(screen.getByTestId('page-color-picker-canvas')).toBeInTheDocument()
  })

  it('samples the pixel clicked on the captured picture and reports it', async () => {
    mockedCaptureViewportFrame.mockResolvedValue(fakeCapturedCanvas([0, 255, 0, 255]))
    const onPick = vi.fn()
    await openPicker(onPick)

    const canvas = screen.getByTestId('page-color-picker-canvas')
    fireEvent.mouseMove(canvas, { clientX: 42, clientY: 24 })
    fireEvent.click(canvas, { clientX: 42, clientY: 24 })

    expect(onPick).toHaveBeenCalledWith('#00ff00')
    expect(screen.queryByTestId('page-color-picker-overlay')).not.toBeInTheDocument()
  })

  it('cancels without picking when clicking outside the picture', async () => {
    mockedCaptureViewportFrame.mockResolvedValue(fakeCapturedCanvas([0, 0, 255, 255]))
    const onPick = vi.fn()
    await openPicker(onPick)

    fireEvent.click(screen.getByTestId('page-color-picker-overlay'))

    expect(onPick).not.toHaveBeenCalled()
    expect(screen.queryByTestId('page-color-picker-overlay')).not.toBeInTheDocument()
  })

  it('cancels without picking when Escape is pressed', async () => {
    mockedCaptureViewportFrame.mockResolvedValue(fakeCapturedCanvas([0, 0, 255, 255]))
    const onPick = vi.fn()
    await openPicker(onPick)

    const canvas = screen.getByTestId('page-color-picker-canvas')
    fireEvent.mouseMove(canvas, { clientX: 10, clientY: 10 })
    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onPick).not.toHaveBeenCalled()
    expect(screen.queryByTestId('page-color-picker-overlay')).not.toBeInTheDocument()
  })

  it('returns to idle without an error when the share prompt is declined', async () => {
    mockedCaptureViewportFrame.mockRejectedValue(new DOMException('denied', 'NotAllowedError'))
    const onPick = vi.fn()
    const user = userEvent.setup()
    render(<PageColorPicker onPick={onPick} />)

    await user.click(screen.getByRole('button', { name: 'Pick color from page' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Pick color from page' })).not.toBeDisabled())
    expect(screen.queryByTestId('page-color-picker-overlay')).not.toBeInTheDocument()
    expect(onPick).not.toHaveBeenCalled()
  })

  it('shows a transient failed state on a real capture error', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mockedCaptureViewportFrame.mockRejectedValue(new Error('capture failed'))
    const onPick = vi.fn()
    render(<PageColorPicker onPick={onPick} />)

    fireEvent.click(screen.getByRole('button', { name: 'Pick color from page' }))
    await waitFor(() => screen.getByRole('button', { name: "Couldn't capture page" }))

    expect(screen.queryByTestId('page-color-picker-overlay')).not.toBeInTheDocument()

    // Advancing fake timers fires our setTimeout(() => setStatus('idle'), …)
    // callback, but that state update happens outside any React-managed
    // event — without act() here, React isn't guaranteed to have flushed it
    // to the DOM by the time the assertion below runs.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })
    expect(screen.getByRole('button', { name: 'Pick color from page' })).toBeInTheDocument()
  })
})
