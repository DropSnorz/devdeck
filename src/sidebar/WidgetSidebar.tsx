import { Download, Laptop, WifiOff, type LucideIcon } from 'lucide-react'
import { AstreliteIcon } from '@/components/icons/AstreliteIcon'
import { cn } from '@/lib/utils'
import { groupWidgetsByCategory } from '@/widgets/categories'
import type { WidgetDefinition } from '@/widgets/types'
import { useOverlayStore } from '@/overlay/useOverlayStore'
import { useSidebarStore } from './useSidebarStore'
import { useWidgetDragStore } from './useWidgetDragStore'

/** Always-visible catalog of every widget, grouped by category — the
 * "browse and reach for a tool" counterpart to the command palette. Click
 * opens a tool fullscreen without pinning it (same ephemeral path the
 * command palette uses); dragging a row onto the grid pins it there
 * instead. Hidden below the grid's own editable breakpoint — mobile already
 * has the command palette for this.
 *
 * Sits below the app header, alongside the main content — collapsed state
 * is toggled from a button in that header (see AppHeader), not from within
 * the sidebar itself. */
export function WidgetSidebar() {
  const collapsed = useSidebarStore((state) => state.collapsed)
  const groups = groupWidgetsByCategory()

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r border-border bg-card md:flex',
        collapsed ? 'w-14' : 'w-60',
      )}
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="space-y-3">
          {groups.map((group) => (
            <div key={group.category}>
              {!collapsed && (
                <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.widgets.map((widget) => (
                  <SidebarWidgetItem
                    key={widget.id}
                    widget={widget}
                    collapsed={collapsed}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <BrandFooter collapsed={collapsed} />
    </aside>
  )
}

function SidebarWidgetItem({
  widget,
  collapsed,
}: {
  widget: WidgetDefinition
  collapsed: boolean
}) {
  const Icon = widget.icon
  const openEphemeral = useOverlayStore((state) => state.openEphemeral)
  const startDragging = useWidgetDragStore((state) => state.startDragging)
  const stopDragging = useWidgetDragStore((state) => state.stopDragging)

  const handleOpen = () => openEphemeral(widget.id)

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        draggable
        onDragStart={(event) => {
          startDragging(widget.id)
          event.dataTransfer.setData('text/plain', widget.id)
          event.dataTransfer.effectAllowed = 'copy'
        }}
        onDragEnd={stopDragging}
        onClick={handleOpen}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            handleOpen()
          }
        }}
        title={collapsed ? widget.name : undefined}
        aria-label={`Open ${widget.name} fullscreen — drag onto the dashboard to pin it there instead`}
        className={cn(
          'flex cursor-grab items-center gap-2 rounded-md px-2 py-1.5 text-xs text-foreground hover:bg-accent active:cursor-grabbing',
          collapsed && 'justify-center',
        )}
      >
        <Icon className="size-4 shrink-0" />
        {!collapsed && <span className="truncate">{widget.name}</span>}
      </div>
    </li>
  )
}

/** Fixed panel pinned below the (independently scrolling) widget list —
 * a "works offline" callout plus attribution back to the Astrelite site,
 * not part of the tool catalog so it never scrolls out of view with it. */
function BrandFooter({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="shrink-0 border-t border-border p-2">
      <div
        className={cn(
          'flex items-center gap-3 px-1 py-1',
          // Three icon+label badges fit fine in one row at full width, but
          // not squeezed into the collapsed (icon-only) sidebar — stack
          // them instead, one per row, matching how the widget list itself
          // already collapses to a single centered icon per row.
          collapsed && 'flex-col gap-1 px-0',
        )}
      >
        <CapabilityBadge icon={WifiOff} label="Offline" collapsed={collapsed} />
        <CapabilityBadge icon={Laptop} label="Run locally" collapsed={collapsed} />
        <CapabilityBadge icon={Download} label="Installable" collapsed={collapsed} />
      </div>
      <a
        href="https://astrelite.com"
        target="_blank"
        rel="noreferrer"
        title="Astrelite"
        className={cn(
          'flex items-center gap-1.5 rounded-md px-1 py-1 text-foreground hover:bg-accent',
          collapsed && 'justify-center',
        )}
      >
        <AstreliteIcon className="size-3.5 shrink-0" />
        {!collapsed && (
          <span className="text-[10px] font-medium tracking-widest uppercase">Astrelite</span>
        )}
      </a>
    </div>
  )
}

/** One static, muted capability badge in the footer's shared row (e.g.
 * "Offline", "Installable") — not interactive, just a quiet statement of
 * what's already true about this app rather than a control. */
function CapabilityBadge({
  icon: Icon,
  label,
  collapsed,
}: {
  icon: LucideIcon
  label: string
  collapsed: boolean
}) {
  return (
    <div
      title={collapsed ? label : undefined}
      className={cn(
        'flex items-center gap-1.5 text-[10px] text-muted-foreground/60',
        collapsed && 'justify-center',
      )}
    >
      <Icon className="size-3 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </div>
  )
}
