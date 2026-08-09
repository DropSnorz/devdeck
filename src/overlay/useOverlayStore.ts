import { create } from 'zustand'

/** What's currently shown fullscreen: a widget already pinned to the
 * dashboard (state-preserving expand, via portal) or a tool opened from the
 * tool browser / command palette that isn't on the dashboard at all
 * (ephemeral — mounts fresh, unmounts on close, nothing persisted). Only one
 * overlay is ever active at a time. */
export type OverlayTarget =
  | { kind: 'pinned'; instanceId: string }
  | { kind: 'ephemeral'; widgetId: string }
  | null

interface OverlayState {
  target: OverlayTarget
  expandPinned: (instanceId: string) => void
  openEphemeral: (widgetId: string) => void
  close: () => void
}

export const useOverlayStore = create<OverlayState>((set) => ({
  target: null,
  expandPinned: (instanceId) => set({ target: { kind: 'pinned', instanceId } }),
  openEphemeral: (widgetId) => set({ target: { kind: 'ephemeral', widgetId } }),
  close: () => set({ target: null }),
}))
