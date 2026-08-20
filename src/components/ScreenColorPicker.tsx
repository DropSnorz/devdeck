import { useState } from 'react'
import { AlertTriangle, Pipette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Evaluated once at module load, not per-render: whether `window.EyeDropper`
// exists can't change over the page's lifetime. Chromium-only as of 2026 —
// Firefox and Safari have no implementation, so the button simply doesn't
// render there instead of failing when clicked.
const EYEDROPPER_SUPPORTED = typeof window !== 'undefined' && 'EyeDropper' in window

interface ScreenColorPickerProps {
  onPick: (hex: string) => void
  className?: string
}

type Status = 'idle' | 'picking' | 'failed'

/** Samples a color from anywhere on the physical screen — including outside
 * the browser window — via the native `window.EyeDropper` API. Stays
 * visible but disabled on browsers that don't implement it, rather than
 * disappearing, so the picker's presence doesn't shift around depending on
 * the browser. */
export function ScreenColorPicker({ onPick, className }: ScreenColorPickerProps) {
  const [status, setStatus] = useState<Status>('idle')

  if (!EYEDROPPER_SUPPORTED) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        disabled
        aria-label="Pick color from screen — not supported in this browser"
        title="Not supported in this browser — try Chrome, Edge, or another Chromium-based browser"
        className={className}
      >
        <Pipette />
      </Button>
    )
  }

  const handleClick = async () => {
    setStatus('picking')
    try {
      const result = await new window.EyeDropper!().open()
      onPick(result.sRGBHex)
      setStatus('idle')
    } catch (err) {
      // The user cancelled (Escape / right-click) — not a failure.
      if (err instanceof DOMException && err.name === 'AbortError') {
        setStatus('idle')
        return
      }
      setStatus('failed')
      setTimeout(() => setStatus('idle'), 1500)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      onClick={handleClick}
      disabled={status === 'picking'}
      aria-label={status === 'failed' ? 'Screen pick failed' : 'Pick color from screen'}
      className={cn(status === 'failed' && 'text-destructive hover:text-destructive', className)}
    >
      {status === 'failed' ? <AlertTriangle /> : <Pipette />}
    </Button>
  )
}
