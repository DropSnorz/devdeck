import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
 * (see WidgetGridItem) — so `useState(position)` below always initializes
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
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{`Move & resize — ${title}`}</DialogTitle>
        </DialogHeader>
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
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleApply}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
