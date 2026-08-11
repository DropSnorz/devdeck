import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CopyButtonProps {
  value: string
  label?: string
  className?: string
}

type Status = 'idle' | 'copied' | 'failed'

/** Copy-to-clipboard button with a brief "Copied" confirmation state, used by
 * most widgets that produce a single output value worth copying. The
 * Clipboard API can reject (denied permission, insecure context, etc.) —
 * that's surfaced as a "Copy failed" state rather than an unhandled
 * rejection. */
export function CopyButton({
  value,
  label = 'Copy',
  className,
}: CopyButtonProps) {
  const [status, setStatus] = useState<Status>('idle')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )

  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  const handleCopy = async () => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setStatus('copied')
    } catch {
      setStatus('failed')
    }
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setStatus('idle'), 1200)
  }

  const statusLabel =
    status === 'copied' ? 'Copied' : status === 'failed' ? 'Copy failed' : label

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={handleCopy}
      disabled={!value}
      aria-live="polite"
      className={cn(
        'h-auto gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground',
        status === 'failed' && 'text-destructive hover:text-destructive',
        className,
      )}
    >
      {status === 'copied' ? (
        <Check className="size-3.5" />
      ) : status === 'failed' ? (
        <AlertTriangle className="size-3.5" />
      ) : (
        <Copy className="size-3.5" />
      )}
      {statusLabel}
    </Button>
  )
}
