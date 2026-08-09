import { useEffect } from 'react'
import { create } from 'zustand'

interface WidgetDirtyState {
  dirtyByInstance: Record<string, boolean>
  /** Bumped by `resetAll`; folded into each widget's `key` wherever it's
   * rendered so changing it forces a remount — the only way to snap a
   * widget's local `useState` back to its initial values from the outside. */
  generation: number
  setDirty: (instanceId: string, isDirty: boolean) => void
  resetAll: () => void
}

const useWidgetDirtyStore = create<WidgetDirtyState>((set) => ({
  dirtyByInstance: {},
  generation: 0,
  setDirty: (instanceId, isDirty) =>
    set((state) => {
      if (state.dirtyByInstance[instanceId] === isDirty) return state
      return {
        dirtyByInstance: { ...state.dirtyByInstance, [instanceId]: isDirty },
      }
    }),
  // Clears the map eagerly rather than waiting for each remounted widget's
  // effect to report back in — the indicator disappears the instant you click.
  resetAll: () =>
    set((state) => ({ generation: state.generation + 1, dirtyByInstance: {} })),
}))

/** A widget calls this with its own definition of "has moved from default"
 * (there's no generic way to detect that — every widget's default differs)
 * to report its dirty status. Cleans up on unmount, which covers both real
 * removal and the remount `resetAll` triggers via `generation`. */
export function useWidgetDirty(instanceId: string, isDirty: boolean): void {
  useEffect(() => {
    useWidgetDirtyStore.getState().setDirty(instanceId, isDirty)
    return () => useWidgetDirtyStore.getState().setDirty(instanceId, false)
  }, [instanceId, isDirty])
}

/** Read by WidgetShell to decide whether to show the border pulse + dot. */
export function useIsWidgetDirty(instanceId: string): boolean {
  return useWidgetDirtyStore(
    (state) => state.dirtyByInstance[instanceId] ?? false,
  )
}

/** Read by the header's "Clear state" button to disable itself when there's
 * nothing to clear. */
export function useAnyWidgetDirty(): boolean {
  return useWidgetDirtyStore((state) =>
    Object.values(state.dirtyByInstance).some(Boolean),
  )
}

/** Read by PortalableWidget/WidgetOverlay for the widget element's `key`. */
export function useWidgetResetGeneration(): number {
  return useWidgetDirtyStore((state) => state.generation)
}

/** The header's "Clear state" button calls this. */
export function useResetAllWidgets(): () => void {
  return useWidgetDirtyStore((state) => state.resetAll)
}
