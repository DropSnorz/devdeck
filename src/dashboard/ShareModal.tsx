import { useMemo, useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { AlertTriangle, Check, Copy, Download } from 'lucide-react'
import { Modal } from '@/components/Modal'
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
    link.download = 'devdeck-dashboard-qr.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <Modal open={open} onClose={onClose} title="Share your workspace">
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
        This link contains all {dashboards.length} dashboard
        {dashboards.length === 1 ? '' : 's'} ({totalWidgets} widget
        {totalWidgets === 1 ? '' : 's'} total). Anyone who opens it gets the same layout on
        their own device — not your widgets' content.
      </p>

      <div className="mb-4 flex items-center gap-2">
        <input
          readOnly
          value={shareUrl}
          onFocus={(event) => event.target.select()}
          className="min-w-0 flex-1 truncate rounded-md border border-slate-300 bg-transparent px-2 py-1.5 font-mono text-xs dark:border-slate-700"
        />
        <button
          type="button"
          onClick={handleCopy}
          aria-live="polite"
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-slate-900 px-2 py-1.5 text-xs font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
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
        </button>
      </div>

      {qrEligible ? (
        <div className="flex flex-col items-center gap-2">
          <div ref={qrContainerRef} className="rounded-lg bg-white p-3">
            <QRCodeCanvas value={shareUrl} size={200} marginSize={2} />
          </div>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Download className="size-3.5" />
            Download QR
          </button>
        </div>
      ) : (
        <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
          This dashboard has too many widgets to fit in a reliably scannable QR
          code — use the copy-link button above instead.
        </p>
      )}
    </Modal>
  )
}
