import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import { getWidgetDefinition } from '@/widgets/registry'
import type { DashboardWidgetInstance } from '@/types/layout'
import { DASHBOARD_STORAGE_KEY, DASHBOARD_STORAGE_VERSION } from './persistence'

interface LayoutUpdate {
  i: string
  x: number
  y: number
  w: number
  h: number
}

export interface GridPosition {
  x: number
  y: number
  w: number
  h: number
}

interface PersistedDashboardState {
  widgets: DashboardWidgetInstance[]
}

interface DashboardState extends PersistedDashboardState {
  addWidget: (widgetId: string) => void
  /** Same as `addWidget`, but at an explicit position/size instead of being
   * appended below everything else — used when a widget is dropped onto the
   * grid from the sidebar. */
  addWidgetAt: (widgetId: string, position: GridPosition) => void
  removeWidget: (instanceId: string) => void
  hasWidget: (widgetId: string) => boolean
  applyLayoutUpdate: (layout: readonly LayoutUpdate[]) => void
  /** Keyboard-accessible alternative to dragging/resizing a grid item — used
   * by the move/resize dialog in the widget shell's "…" menu. */
  setWidgetPosition: (instanceId: string, position: GridPosition) => void
  replaceWidgets: (widgets: DashboardWidgetInstance[]) => void
}

/** Seed shown on a true first visit (nothing in localStorage yet). Once
 * persist hydrates from a real stored value — including an empty array the
 * user arrived at by removing every widget — this is overwritten and never
 * reappears. */
const STARTER_WIDGETS: DashboardWidgetInstance[] = [
  {
    instanceId: 'seed-uuid-generator',
    widgetId: 'uuid-generator',
    x: 0,
    y: 0,
    w: 2,
    h: 3,
  },
  { instanceId: 'seed-base64', widgetId: 'base64', x: 2, y: 0, w: 2, h: 2 },
  {
    instanceId: 'seed-json-formatter',
    widgetId: 'json-formatter',
    x: 4,
    y: 0,
    w: 4,
    h: 4,
  },
]

function nextAvailableY(widgets: DashboardWidgetInstance[]): number {
  return widgets.reduce((max, widget) => Math.max(max, widget.y + widget.h), 0)
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      widgets: STARTER_WIDGETS,

      addWidget: (widgetId) => {
        const definition = getWidgetDefinition(widgetId)
        if (!definition) return
        set((state) => ({
          widgets: [
            ...state.widgets,
            {
              instanceId: nanoid(8),
              widgetId,
              x: 0,
              y: nextAvailableY(state.widgets),
              w: definition.defaultSize.w,
              h: definition.defaultSize.h,
            },
          ],
        }))
      },

      addWidgetAt: (widgetId, position) => {
        if (!getWidgetDefinition(widgetId)) return
        set((state) => ({
          widgets: [
            ...state.widgets,
            { instanceId: nanoid(8), widgetId, ...position },
          ],
        }))
      },

      removeWidget: (instanceId) => {
        set((state) => ({
          widgets: state.widgets.filter(
            (widget) => widget.instanceId !== instanceId,
          ),
        }))
      },

      hasWidget: (widgetId) =>
        get().widgets.some((widget) => widget.widgetId === widgetId),

      applyLayoutUpdate: (layout) => {
        set((state) => ({
          widgets: state.widgets.map((widget) => {
            const updated = layout.find((item) => item.i === widget.instanceId)
            return updated
              ? {
                  ...widget,
                  x: updated.x,
                  y: updated.y,
                  w: updated.w,
                  h: updated.h,
                }
              : widget
          }),
        }))
      },

      setWidgetPosition: (instanceId, position) => {
        set((state) => ({
          widgets: state.widgets.map((widget) =>
            widget.instanceId === instanceId
              ? { ...widget, ...position }
              : widget,
          ),
        }))
      },

      replaceWidgets: (widgets) => set({ widgets }),
    }),
    {
      name: DASHBOARD_STORAGE_KEY,
      version: DASHBOARD_STORAGE_VERSION,
      partialize: (state) => ({ widgets: state.widgets }),
    },
  ),
)
