import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Move } from 'lucide-react'
import { cn } from '@/lib/cn'
import { WidgetShell } from '@/widget-shell/WidgetShell'
import { GridPositionDialog } from '@/widget-shell/GridPositionDialog'
import { WIDGET_REGISTRY } from '@/widgets/registry'
import { useOverlaySlot } from '@/overlay/OverlaySlotContext'
import { useOverlayStore } from '@/overlay/useOverlayStore'
import { useWidgetResetGeneration } from '@/widgets/useWidgetDirty'
import type { DashboardWidgetInstance } from '@/types/layout'
import { GRID_COLS, GRID_MAX_ROW_SPAN } from './gridConstants'
import { useDashboardStore } from './useDashboardStore'

interface PortalableWidgetProps {
  instance: DashboardWidgetInstance
  onRemove: () => void
  /** Whether the surrounding grid is in its draggable/resizable form
   * (desktop/tablet) — the keyboard move/resize dialog is offered here too,
   * as the documented accessible alternative to dragging. On the read-only
   * mobile stack there's no layout to edit, so it's hidden. */
  editable: boolean
}

/** Renders a pinned widget's content through a portal into a "carrier" DOM
 * node created once and never replaced — then physically moves *that node*
 * between this grid cell and the shared overlay slot with plain DOM calls,
 * outside React's reconciliation.
 *
 * This indirection matters: React's portal reconciliation compares the
 * `container` argument passed to `createPortal` across renders, and
 * unmounts/remounts the whole portaled subtree if it differs — passing a
 * *different* container each time a widget expands or collapses (the
 * grid cell one render, the overlay slot the next) looks like it should
 * preserve state but actually doesn't; the widget's own component instance
 * gets torn down and rebuilt on every transition, losing whatever it was
 * holding. Keeping `createPortal`'s target fixed at this stable carrier
 * node — and moving the carrier itself imperatively — is what actually
 * keeps the widget mounted continuously. See WidgetOverlay for the other
 * half of this mechanism. */
export function PortalableWidget({
  instance,
  onRemove,
  editable,
}: PortalableWidgetProps) {
  const widget = WIDGET_REGISTRY[instance.widgetId]
  const [gridHost, setGridHost] = useState<HTMLDivElement | null>(null)
  const [positionDialogOpen, setPositionDialogOpen] = useState(false)
  const overlaySlot = useOverlaySlot()
  const overlayTarget = useOverlayStore((state) => state.target)
  const expandPinned = useOverlayStore((state) => state.expandPinned)
  const closeOverlay = useOverlayStore((state) => state.close)
  const setWidgetPosition = useDashboardStore(
    (state) => state.setWidgetPosition,
  )
  const resetGeneration = useWidgetResetGeneration()

  const [carrier] = useState(() => {
    const node = document.createElement('div')
    node.className = 'h-full w-full'
    return node
  })

  const isExpanded =
    overlayTarget?.kind === 'pinned' &&
    overlayTarget.instanceId === instance.instanceId
  const mountTarget = isExpanded ? overlaySlot : gridHost

  // Runs before paint so the carrier never visibly sits in its old spot for
  // a frame after `isExpanded` flips.
  useLayoutEffect(() => {
    if (mountTarget && carrier.parentNode !== mountTarget) {
      mountTarget.appendChild(carrier)
    }
  }, [mountTarget, carrier])

  if (!widget) return null

  const WidgetComponent = widget.component
  const showMoveControl = editable && !isExpanded

  const content = (
    <WidgetShell
      instanceId={instance.instanceId}
      title={widget.name}
      icon={widget.icon}
      dragHandleClassName={
        isExpanded ? undefined : 'widget-drag-handle cursor-move'
      }
      isExpanded={isExpanded}
      onToggleExpand={() =>
        isExpanded ? closeOverlay() : expandPinned(instance.instanceId)
      }
      onRemove={isExpanded ? undefined : onRemove}
      extraActions={
        showMoveControl && (
          <button
            type="button"
            onClick={() => setPositionDialogOpen(true)}
            aria-label={`Move or resize ${widget.name}`}
            title="Move or resize with the keyboard"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <Move className="size-3.5" />
          </button>
        )
      }
    >
      <WidgetComponent
        key={`${instance.instanceId}-${resetGeneration}`}
        instanceId={instance.instanceId}
        mode={isExpanded ? 'overlay' : 'grid'}
      />
    </WidgetShell>
  )

  return (
    <>
      {/* Empty while the carrier is parked in the overlay slot instead —
          shows a placeholder so the reserved grid cell isn't confusingly
          blank. */}
      <div
        ref={setGridHost}
        className={cn(
          'h-full w-full',
          isExpanded &&
            'flex items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400 dark:border-slate-700',
        )}
      >
        {isExpanded && 'Expanded'}
      </div>
      {createPortal(content, carrier)}
      {showMoveControl && positionDialogOpen && (
        <GridPositionDialog
          onClose={() => setPositionDialogOpen(false)}
          title={widget.name}
          position={{
            x: instance.x,
            y: instance.y,
            w: instance.w,
            h: instance.h,
          }}
          minSize={widget.minSize ?? { w: 1, h: 1 }}
          maxSize={widget.maxSize ?? { w: GRID_COLS, h: GRID_MAX_ROW_SPAN }}
          cols={GRID_COLS}
          onApply={(next) => setWidgetPosition(instance.instanceId, next)}
        />
      )}
    </>
  )
}
