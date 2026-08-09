import { create } from 'zustand'

const STORAGE_KEY = 'devdeck.sidebar-collapsed'

function readStoredCollapsed(): boolean {
  return window.localStorage.getItem(STORAGE_KEY) === '1'
}

interface SidebarState {
  collapsed: boolean
  toggle: () => void
}

/** Collapsed/expanded state for the tool sidebar, persisted across reloads.
 * A store rather than local component state because the toggle button (in
 * the header) and the sidebar it controls (below the header, a sibling —
 * not a descendant) need to share it. */
export const useSidebarStore = create<SidebarState>((set) => ({
  collapsed: readStoredCollapsed(),
  toggle: () =>
    set((state) => {
      const next = !state.collapsed
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      return { collapsed: next }
    }),
}))
