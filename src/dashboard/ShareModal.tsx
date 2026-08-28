import { useMemo, useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { AlertTriangle, Check, Copy, Download } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDashboardStore } from './useDashboardStore'
import { buildShareUrl } from './shareUrl'

type CopyStatus = 'idle' | 'copied' | 'failed'

interface ShareModalProps {
  open: boolean
  onClose: () => void
}

// Conservative character-count guard, well under a QR code's real capacity
// (~2953 bytes at the lowest error-correction level for byte data) — once a
// dashboard has enough widgets to cross this, offer copy-link only rather
// than rendering a QR code that may fail to scan reliably.
const QR_LENGTH_LIMIT = 1500

export function ShareModal({ open, onClose }: ShareModalProps) {
  const dashboards = useDashboardStore((state) => state.dashboards)
  const activeDashboardId = useDashboardStore((state) => state.activeDashboardId)
  const qrContainerRef = useRef<HTMLDivElement>(null)
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')

  const shareUrl = useMemo(
    () => (open ? buildShareUrl(dashboards, activeDashboardId) : ''),
    [open, dashboards, activeDashboardId],
  )
  const qrEligible = shareUrl.length <= QR_LENGTH_LIMIT
  const totalWidgets = dashboards.reduce((sum, dashboard) => sum + dashboard.widgets.length, 0)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('failed')
    }
    setTimeout(() => setCopyStatus('idle'), 1200)
  }

  const handleDownload = () => {
    const canvas = qrContainerRef.current?.querySelector('canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.download = 'localgrid-dashboard-qr.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share your workspace</DialogTitle>
          <DialogDescription>
            This link contains all {dashboards.length} dashboard
            {dashboards.length === 1 ? '' : 's'} ({totalWidgets} widget
            {totalWidgets === 1 ? '' : 's'} total). Anyone who opens it gets the
            same layout on their own device — not your widgets' content.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={shareUrl}
            onFocus={(event) => event.target.select()}
            className="min-w-0 flex-1 truncate font-mono text-xs"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleCopy}
            aria-live="polite"
            className="shrink-0"
          >
            {copyStatus === 'copied' ? (
              <Check className="size-3.5" />
            ) : copyStatus === 'failed' ? (
              <AlertTriangle className="size-3.5" />
            ) : (
              <Copy className="size-3.5" />
            )}
            {copyStatus === 'copied'
              ? 'Copied'
              : copyStatus === 'failed'
                ? 'Copy failed'
                : 'Copy'}
          </Button>
        </div>

        {qrEligible ? (
          <div className="flex flex-col items-center gap-2">
            {/* Always a plain white surface, regardless of theme — a dark
             * QR container would hurt scan contrast, so this is a
             * deliberate exception to token adoption, not an oversight. */}
            <div ref={qrContainerRef} className="rounded-lg bg-white p-3">
              <QRCodeCanvas value={shareUrl} size={200} marginSize={2} />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="text-muted-foreground"
            >
              <Download className="size-3.5" />
              Download QR
            </Button>
          </div>
        ) : (
          // Amber warning tone has no dedicated semantic token (only one
          // call site app-wide) — kept literal rather than overloading
          // `highlight` (defined for RegexTesterWidget's <mark> background,
          // not text-on-tint) or inventing a token for a single usage.
          <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
            This dashboard has too many widgets to fit in a reliably scannable
            QR code — use the copy-link button above instead.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
