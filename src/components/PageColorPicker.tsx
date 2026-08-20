import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { colord } from 'colord'
import { AlertTriangle, Camera, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { mapClientPointToCanvasPixel } from '@/components/canvasCoordinates'
import { captureViewportFrame, DISPLAY_CAPTURE_SUPPORTED } from '@/components/pageCapture'
import { cn } from '@/lib/utils'

interface PageColorPickerProps {
  onPick: (hex: string) => void
  className?: string
}

type Status = 'idle' | 'requesting' | 'picking' | 'failed'

interface CursorSample {
  clientX: number
  clientY: number
  px: number
  py: number
  hex: string
}

interface CaptureSize {
  width: number
  height: number
}

const MAGNIFIER_SIZE = 80 // on-screen px of the zoomed preview
const SAMPLE_RADIUS = 6 // source canvas px sampled around the cursor, each side

/** Samples a color from a screenshot of the user's own screen: captures one
 * real frame via getDisplayMedia (see pageCapture.ts), then shows that
 * picture so the user clicks directly on the pixel they want. Because the
 * pick happens on the picture itself — not on an invisible overlay mapped
 * back onto the live page — this is correct no matter what the user chose
 * to share (a browser tab, a window, or the entire screen); there's no
 * offset to compute or get wrong. */
export function PageColorPicker({ onPick, className }: PageColorPickerProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [cursor, setCursor] = useState<CursorSample | null>(null)
  // The display <canvas>'s intrinsic size needs to be read during render
  // (its width/height attributes), so it's tracked in state rather than
  // read off a ref there — refs are only safe to read in effects/handlers.
  const [captureSize, setCaptureSize] = useState<CaptureSize | null>(null)
  const capturedCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const capturedCtxRef = useRef<CanvasRenderingContext2D | null>(null)
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const magnifierRef = useRef<HTMLCanvasElement | null>(null)
  const failTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const reset = () => {
    capturedCanvasRef.current = null
    capturedCtxRef.current = null
    setCaptureSize(null)
    setCursor(null)
  }

  const fail = () => {
    reset()
    setStatus('failed')
    clearTimeout(failTimeoutRef.current)
    failTimeoutRef.current = setTimeout(() => setStatus('idle'), 1500)
  }

  const startPicking = async () => {
    setStatus('requesting')
    try {
      const canvas = await captureViewportFrame()
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        fail()
        return
      }
      capturedCanvasRef.current = canvas
      capturedCtxRef.current = ctx
      setCaptureSize({ width: canvas.width, height: canvas.height })
      setStatus('picking')
    } catch (err) {
      // The user declined/cancelled the native "choose what to share"
      // prompt — not a failure worth surfacing an error for.
      if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'AbortError')) {
        setStatus('idle')
        return
      }
      fail()
    }
  }

  const stopPicking = () => {
    reset()
    setStatus('idle')
  }

  const hexAt = (px: number, py: number): string | null => {
    const ctx = capturedCtxRef.current
    if (!ctx) return null
    try {
      const [r, g, b] = ctx.getImageData(px, py, 1, 1).data
      return colord({ r, g, b }).toHex()
    } catch {
      // Should not happen for our own captured frame, but guard anyway.
      return null
    }
  }

  const handleMouseMove = (event: ReactMouseEvent<HTMLCanvasElement>) => {
    const canvas = displayCanvasRef.current
    const sample = canvas && mapClientPointToCanvasPixel(canvas, event.clientX, event.clientY)
    if (!sample) {
      setCursor(null)
      return
    }
    const hex = hexAt(sample.px, sample.py)
    if (!hex) return
    setCursor({ clientX: event.clientX, clientY: event.clientY, px: sample.px, py: sample.py, hex })
  }

  const handleClick = (event: ReactMouseEvent<HTMLCanvasElement>) => {
    event.stopPropagation()
    const canvas = displayCanvasRef.current
    const sample = canvas && mapClientPointToCanvasPixel(canvas, event.clientX, event.clientY)
    const hex = sample && hexAt(sample.px, sample.py)
    if (hex) onPick(hex)
    stopPicking()
  }

  useEffect(() => () => clearTimeout(failTimeoutRef.current), [])

  // Paints the captured frame onto the on-screen canvas once it mounts. The
  // display canvas keeps the source's native pixel resolution (so sampling
  // stays pixel-accurate) and is only scaled visually via CSS object-fit —
  // its own bounding box is what click coordinates are mapped against.
  useEffect(() => {
    if (status !== 'picking') return
    const source = capturedCanvasRef.current
    const target = displayCanvasRef.current
    const ctx = target?.getContext('2d')
    if (!source || !ctx) return
    ctx.drawImage(source, 0, 0)
  }, [status])

  // Draws the magnifier after `cursor` commits, not inline in the move
  // handler — the magnifier <canvas> only exists in the DOM once `cursor`
  // is non-null, so drawing from the event handler would miss the first
  // sample.
  useEffect(() => {
    if (!cursor) return
    const source = capturedCanvasRef.current
    const target = magnifierRef.current
    const ctx = target?.getContext('2d')
    if (!source || !ctx) return
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, MAGNIFIER_SIZE, MAGNIFIER_SIZE)
    ctx.drawImage(
      source,
      cursor.px - SAMPLE_RADIUS,
      cursor.py - SAMPLE_RADIUS,
      SAMPLE_RADIUS * 2,
      SAMPLE_RADIUS * 2,
      0,
      0,
      MAGNIFIER_SIZE,
      MAGNIFIER_SIZE,
    )
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'
    ctx.lineWidth = 1
    ctx.strokeRect(MAGNIFIER_SIZE / 2 - 5, MAGNIFIER_SIZE / 2 - 5, 10, 10)
  }, [cursor])

  useEffect(() => {
    if (status !== 'picking') return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') stopPicking()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stopPicking is
    // recreated every render but is stable in behavior; including it would
    // just re-attach the identical listener on every render.
  }, [status])

  // All hooks above this line run on every render regardless of support —
  // only bail out afterwards, so hook call order never depends on it.
  if (!DISPLAY_CAPTURE_SUPPORTED) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        disabled
        aria-label="Pick color from page — not supported in this browser"
        title="Tab/screen capture isn't available in this browser or context"
        className={className}
      >
        <Camera />
      </Button>
    )
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        onClick={startPicking}
        disabled={status === 'requesting' || status === 'picking'}
        aria-label={status === 'failed' ? "Couldn't capture page" : 'Pick color from page'}
        className={cn(status === 'failed' && 'text-destructive hover:text-destructive', className)}
      >
        {status === 'requesting' ? (
          <Loader2 className="animate-spin" />
        ) : status === 'failed' ? (
          <AlertTriangle />
        ) : (
          <Camera />
        )}
      </Button>
      {status === 'picking' &&
        createPortal(
          <div
            data-testid="page-color-picker-overlay"
            className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-3 bg-black/80 p-6"
            onClick={stopPicking}
          >
            <p className="sr-only" aria-live="polite">
              Review the captured screenshot below. Click a color to select it, or press Escape to cancel.
            </p>
            <span className="text-xs text-white/70">Click a color below · Esc to cancel</span>
            <canvas
              ref={displayCanvasRef}
              data-testid="page-color-picker-canvas"
              width={captureSize?.width ?? 0}
              height={captureSize?.height ?? 0}
              onClick={handleClick}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setCursor(null)}
              className="h-full w-full max-w-full flex-1 cursor-crosshair rounded object-contain shadow-2xl"
            />
            {cursor && (
              <div
                className="pointer-events-none fixed flex flex-col items-center gap-1"
                style={{ left: cursor.clientX + 16, top: cursor.clientY + 16 }}
              >
                <canvas
                  ref={magnifierRef}
                  width={MAGNIFIER_SIZE}
                  height={MAGNIFIER_SIZE}
                  className="rounded border border-border bg-background shadow-md"
                />
                <span className="rounded bg-popover px-1.5 py-0.5 font-mono text-xs text-popover-foreground shadow-md">
                  {cursor.hex}
                </span>
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}
