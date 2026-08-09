import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { WidgetShell } from '@/widget-shell/WidgetShell'
import { WIDGET_REGISTRY } from '@/widgets/registry'
import { useWidgetResetGeneration } from '@/widgets/useWidgetDirty'
import { OverlaySlotContext } from './OverlaySlotContext'
import { useOverlayStore } from './useOverlayStore'

/** Always-mounted fullscreen overlay chrome (backdrop + centered panel),
 * toggled visible via CSS rather than conditionally rendered — so the DOM
 * node it exposes through `OverlaySlotContext` is a stable portal target for
 * `PortalableWidget` even while nothing is expanded.
 *
 * Ephemeral tools (opened from the tool browser / command palette without
 * being pinned to the dashboard) render directly inside this chrome instead
 * — they have no grid-cell "home" to portal from, so there's nothing to
 * preserve on close; they simply mount and unmount. */
export function WidgetOverlay({ children }: { children: ReactNode }) {
  const target = useOverlayStore((state) => state.target)
  const close = useOverlayStore((state) => state.close)
  const [slotEl, setSlotEl] = useState<HTMLDivElement | null>(null)
  const resetGeneration = useWidgetResetGeneration()

  useEffect(() => {
    if (!target) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [target, close])

  const ephemeralWidget =
    target?.kind === 'ephemeral' ? WIDGET_REGISTRY[target.widgetId] : null
  const EphemeralComponent = ephemeralWidget?.component
  const ephemeralInstanceId = ephemeralWidget
    ? `ephemeral-${ephemeralWidget.id}`
    : ''

  return (
    <OverlaySlotContext.Provider value={slotEl}>
      {children}
      <div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm',
          target ? '' : 'hidden',
        )}
        onClick={close}
      >
        <div
          onClick={(event) => event.stopPropagation()}
          className="h-full max-h-[85vh] w-full max-w-5xl"
        >
          {EphemeralComponent && ephemeralWidget ? (
            <WidgetShell
              instanceId={ephemeralInstanceId}
              title={ephemeralWidget.name}
              icon={ephemeralWidget.icon}
              isExpanded
              onToggleExpand={close}
            >
              <EphemeralComponent
                key={`${ephemeralInstanceId}-${resetGeneration}`}
                instanceId={ephemeralInstanceId}
                mode="overlay"
              />
            </WidgetShell>
          ) : (
            // Portal target for an expanded pinned widget. Left as an empty,
            // invisible box the rest of the time.
            <div ref={setSlotEl} className="h-full w-full" />
          )}
        </div>
      </div>
    </OverlaySlotContext.Provider>
  )
}
