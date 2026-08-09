import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { NumberField } from '@/components/NumberField'
import type { GridPosition } from '@/dashboard/useDashboardStore'

interface GridPositionDialogProps {
  onClose: () => void
  title: string
  position: GridPosition
  minSize: { w: number; h: number }
  maxSize: { w: number; h: number }
  cols: number
  onApply: (next: GridPosition) => void
}

/** Keyboard-operable alternative to dragging/resizing a grid item — react-
 * grid-layout, like essentially every drag-based grid library, has weak
 * keyboard/screen-reader support for repositioning. This dialog is the
 * documented fallback: every field is a plain, tabbable number input.
 *
 * The caller only mounts this component while the dialog should be open
 * (see PortalableWidget) — so `useState(position)` below always initializes
 * from the widget's current committed position on every open, with no
 * separate "resync on open" effect needed. */
export function GridPositionDialog({
  onClose,
  title,
  position,
  minSize,
  maxSize,
  cols,
  onApply,
}: GridPositionDialogProps) {
  const [draft, setDraft] = useState(position)

  const handleApply = () => {
    onApply(draft)
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={`Move & resize — ${title}`}>
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Column"
          value={draft.x}
          min={0}
          max={Math.max(0, cols - draft.w)}
          onChange={(x) => setDraft((prev) => ({ ...prev, x }))}
        />
        <NumberField
          label="Row"
          value={draft.y}
          min={0}
          onChange={(y) => setDraft((prev) => ({ ...prev, y }))}
        />
        <NumberField
          label="Width (columns)"
          value={draft.w}
          min={minSize.w}
          max={Math.min(maxSize.w, cols)}
          onChange={(w) => setDraft((prev) => ({ ...prev, w }))}
        />
        <NumberField
          label="Height (rows)"
          value={draft.h}
          min={minSize.h}
          max={maxSize.h}
          onChange={(h) => setDraft((prev) => ({ ...prev, h }))}
        />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
        >
          Apply
        </button>
      </div>
    </Modal>
  )
}
