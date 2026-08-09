import { nanoid } from 'nanoid'
import { create } from 'zustand'

/** What's currently shown fullscreen: a widget already pinned to the
 * dashboard, or a tool opened from the tool browser / command palette that
 * isn't on the dashboard at all ("ephemeral"). Only one overlay is ever
 * active at a time. Both variants carry their own `instanceId` — content now
 * lives in `useWidgetState`'s store keyed by instance, not in whichever
 * component happens to be mounted, so `WidgetOverlay` can mount a fresh,
 * independent `<WidgetComponent>` for either kind without needing a shared
 * DOM slot to portal into. */
export type OverlayTarget =
  | { kind: 'pinned'; instanceId: string; widgetId: string }
  | { kind: 'ephemeral'; instanceId: string; widgetId: string }
  | null

interface OverlayState {
  target: OverlayTarget
  expandPinned: (instanceId: string, widgetId: string) => void
  openEphemeral: (widgetId: string) => void
  close: () => void
}

export const useOverlayStore = create<OverlayState>((set) => ({
  target: null,
  expandPinned: (instanceId, widgetId) => set({ target: { kind: 'pinned', instanceId, widgetId } }),
  // A fresh id every call — not derived from widgetId — so reopening the
  // same tool never resumes a previous session's content. Content is
  // centralized now, so reusing a deterministic id here would silently
  // defeat the "ephemeral tools start fresh" contract.
  openEphemeral: (widgetId) => set({ target: { kind: 'ephemeral', instanceId: `ephemeral-${nanoid(8)}`, widgetId } }),
  close: () => set({ target: null }),
}))
