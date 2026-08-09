import { useMemo } from 'react'
import ReactGridLayout, {
  useContainerWidth,
  type Layout,
} from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useWidgetDragStore } from '@/sidebar/useWidgetDragStore'
import { getWidgetDefinition } from '@/widgets/registry'
import {
  EDITABLE_BREAKPOINT,
  GRID_COLS,
  GRID_MARGIN,
  GRID_ROW_HEIGHT,
} from './gridConstants'
import { PortalableWidget } from './PortalableWidget'
import { useDashboardStore } from './useDashboardStore'

// Reserve a real drop target height even with zero widgets — react-grid-
// layout's autoSize would otherwise collapse it to ~0px, leaving nowhere to
// drop the first widget.
const EMPTY_GRID_MIN_HEIGHT = 240

export function GridLayout() {
  const widgets = useDashboardStore((state) => state.widgets)
  const removeWidget = useDashboardStore((state) => state.removeWidget)
  const applyLayoutUpdate = useDashboardStore(
    (state) => state.applyLayoutUpdate,
  )
  const addWidgetAt = useDashboardStore((state) => state.addWidgetAt)
  const isEditable = useMediaQuery(EDITABLE_BREAKPOINT)
  const { width, containerRef, mounted } = useContainerWidth()

  const layout: Layout = useMemo(
    () =>
      widgets.map((widget) => ({
        i: widget.instanceId,
        x: widget.x,
        y: widget.y,
        w: widget.w,
        h: widget.h,
      })),
    [widgets],
  )

  // Mobile: static, non-draggable vertical stack in saved order. Same
  // underlying layout data as the grid, just a different CSS arrangement.
  // Expand-to-fullscreen still works here — it isn't a "layout edit", and
  // there's no drag-to-add from the sidebar either (it's hidden on mobile).
  if (!isEditable) {
    if (widgets.length === 0) {
      return (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400">
            No widgets yet — add one to get started.
          </p>
        </div>
      )
    }
    const stacked = [...widgets].sort((a, b) => a.y - b.y || a.x - b.x)
    return (
      <div className="flex flex-1 flex-col gap-4">
        {stacked.map((instance) => (
          <div key={instance.instanceId} className="h-64">
            <PortalableWidget
              instance={instance}
              onRemove={() => removeWidget(instance.instanceId)}
              editable={false}
            />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative flex-1">
      {mounted && (
        <ReactGridLayout
          layout={layout}
          width={width}
          gridConfig={{
            cols: GRID_COLS,
            rowHeight: GRID_ROW_HEIGHT,
            margin: GRID_MARGIN,
          }}
          dragConfig={{ handle: '.widget-drag-handle' }}
          dropConfig={{
            enabled: true,
            onDragOver: () => {
              const { draggingWidgetId } = useWidgetDragStore.getState()
              if (!draggingWidgetId) return false
              // Same one-instance-per-widget-type rule the tool browser
              // enforces — reject the drop (no placeholder) rather than
              // create a duplicate.
              if (useDashboardStore.getState().hasWidget(draggingWidgetId))
                return false
              const widget = getWidgetDefinition(draggingWidgetId)
              if (!widget) return false
              return { w: widget.defaultSize.w, h: widget.defaultSize.h }
            },
          }}
          onLayoutChange={applyLayoutUpdate}
          onDrop={(_layout, item) => {
            const { draggingWidgetId } = useWidgetDragStore.getState()
            // `item` is only defined if onDragOver above accepted the drag,
            // so this already excludes unrecognized drags and duplicates.
            if (!draggingWidgetId || !item) return
            addWidgetAt(draggingWidgetId, {
              x: item.x,
              y: item.y,
              w: item.w,
              h: item.h,
            })
          }}
          style={
            widgets.length === 0
              ? { minHeight: EMPTY_GRID_MIN_HEIGHT }
              : undefined
          }
        >
          {widgets.map((instance) => (
            <div key={instance.instanceId}>
              <PortalableWidget
                instance={instance}
                onRemove={() => removeWidget(instance.instanceId)}
                editable
              />
            </div>
          ))}
        </ReactGridLayout>
      )}
      {widgets.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400">
            No widgets yet — drag a tool in from the sidebar, or use Add widget.
          </p>
        </div>
      )}
    </div>
  )
}
