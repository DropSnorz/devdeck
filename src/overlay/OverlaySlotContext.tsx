import { createContext, useContext } from 'react'

/** The DOM node a "pinned" widget's content gets portaled into once it's
 * expanded. Published by `WidgetOverlay`, read by `PortalableWidget`. There's
 * only ever one — a single overlay is active at a time. */
export const OverlaySlotContext = createContext<HTMLDivElement | null>(null)

export function useOverlaySlot(): HTMLDivElement | null {
  return useContext(OverlaySlotContext)
}
