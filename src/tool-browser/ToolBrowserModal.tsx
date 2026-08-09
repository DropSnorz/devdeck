import { useMemo, useState } from 'react'
import { Check, ExternalLink, Plus } from 'lucide-react'
import { Modal } from '@/components/Modal'
import { WIDGET_LIST } from '@/widgets/registry'
import { useDashboardStore } from '@/dashboard/useDashboardStore'
import { useOverlayStore } from '@/overlay/useOverlayStore'

interface ToolBrowserModalProps {
  open: boolean
  onClose: () => void
}

/** Browsable catalog of every widget in the registry. "Add" pins a widget to
 * the dashboard; "Open" launches it fullscreen without pinning it — the same
 * ephemeral path the command palette uses. MVP restricts pinning to one
 * instance per widget type in this UI, even though the underlying layout
 * model supports multiple. */
export function ToolBrowserModal({ open, onClose }: ToolBrowserModalProps) {
  const [query, setQuery] = useState('')
  const widgets = useDashboardStore((state) => state.widgets)
  const addWidget = useDashboardStore((state) => state.addWidget)
  const openEphemeral = useOverlayStore((state) => state.openEphemeral)

  const addedWidgetIds = useMemo(
    () => new Set(widgets.map((widget) => widget.widgetId)),
    [widgets],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return WIDGET_LIST
    return WIDGET_LIST.filter((widget) =>
      [widget.name, widget.description, ...(widget.keywords ?? [])].some(
        (text) => text.toLowerCase().includes(q),
      ),
    )
  }, [query])

  return (
    <Modal open={open} onClose={onClose} title="Add a widget">
      <input
        autoFocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search tools…"
        className="mb-3 w-full rounded-md border border-slate-300 bg-transparent px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700"
      />
      <ul className="space-y-1">
        {filtered.map((widget) => {
          const added = addedWidgetIds.has(widget.id)
          const Icon = widget.icon
          return (
            <li
              key={widget.id}
              className="flex items-center gap-3 rounded-md p-2 hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <Icon className="size-4 shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{widget.name}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {widget.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  openEphemeral(widget.id)
                  onClose()
                }}
                aria-label={`Open ${widget.name} fullscreen`}
                title="Open without pinning to dashboard"
                className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ExternalLink className="size-3.5" />
                Open
              </button>
              <button
                type="button"
                onClick={() => addWidget(widget.id)}
                disabled={added}
                className="inline-flex shrink-0 items-center gap-1 rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white disabled:bg-slate-200 disabled:text-slate-400 dark:bg-slate-100 dark:text-slate-900 dark:disabled:bg-slate-800 dark:disabled:text-slate-600"
              >
                {added ? (
                  <Check className="size-3.5" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                {added ? 'Added' : 'Add'}
              </button>
            </li>
          )
        })}
        {filtered.length === 0 && (
          <li className="p-4 text-center text-sm text-slate-400">
            No tools match &ldquo;{query}&rdquo;
          </li>
        )}
      </ul>
    </Modal>
  )
}
