import { create } from 'zustand'

interface WidgetDragState {
  draggingWidgetId: string | null
  startDragging: (widgetId: string) => void
  stopDragging: () => void
}

/** Tracks which widget (by id) is currently being dragged out of the
 * sidebar. The native HTML5 drag-and-drop API only exposes the
 * `dataTransfer` payload reliably in the final `drop` event — not during
 * `dragover` — but the grid needs to know *while* dragging in order to size
 * the drop placeholder to match that widget's default size. This store is
 * how the sidebar (drag source) and the grid (drop target), two unrelated
 * components, share that one bit of state for the duration of a drag. */
export const useWidgetDragStore = create<WidgetDragState>((set) => ({
  draggingWidgetId: null,
  startDragging: (widgetId) => set({ draggingWidgetId: widgetId }),
  stopDragging: () => set({ draggingWidgetId: null }),
}))
