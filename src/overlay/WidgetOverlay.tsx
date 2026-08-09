import { useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { WidgetShell } from '@/widget-shell/WidgetShell'
import { WIDGET_REGISTRY } from '@/widgets/registry'
import { useWidgetResetNonce } from '@/widgets/useWidgetDirty'
import { useOverlayStore } from './useOverlayStore'

/** Always-mounted fullscreen overlay chrome (backdrop + centered panel),
 * toggled visible via CSS rather than conditionally rendered.
 *
 * Pinned and ephemeral targets are rendered the exact same way — mount
 * `<WidgetComponent instanceId={target.instanceId} .../>` directly, no
 * portal involved. Content lives in `useWidgetState`'s store keyed by
 * instanceId, so this mount and the grid cell's own independent mount of the
 * same instanceId (see WidgetGridItem) just read/write the same entries;
 * neither needs to hand the other a DOM node to survive. */
export function WidgetOverlay({ children }: { children: ReactNode }) {
  const target = useOverlayStore((state) => state.target)
  const close = useOverlayStore((state) => state.close)
  const definition = target ? WIDGET_REGISTRY[target.widgetId] : null
  const resetNonce = useWidgetResetNonce(target?.instanceId ?? '')

  useEffect(() => {
    if (!target) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [target, close])

  return (
    <>
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
          {definition && target && (
            <WidgetShell
              instanceId={target.instanceId}
              title={definition.name}
              icon={definition.icon}
              isExpanded
              onToggleExpand={close}
            >
              <definition.component
                key={`${target.instanceId}-${resetNonce}`}
                instanceId={target.instanceId}
                mode="overlay"
              />
            </WidgetShell>
          )}
        </div>
      </div>
    </>
  )
}
