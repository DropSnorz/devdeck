import { useState } from 'react'
import { Command } from 'cmdk'
import { Plus, Share2 } from 'lucide-react'
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut'
import { useOverlayStore } from '@/overlay/useOverlayStore'
import { groupWidgetsByCategory } from '@/widgets/categories'
import { useDashboardStore } from '@/dashboard/useDashboardStore'
import { ShareModal } from '@/dashboard/ShareModal'
import { Button } from '@/components/ui/button'
import { useCommandPaletteStore } from './useCommandPaletteStore'

const ITEM_CLASS =
  'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground aria-selected:bg-accent'
const GROUP_HEADING_CLASS =
  'px-2 pb-1 pt-2 text-[10px] font-medium text-muted-foreground'

/** Cmd/Ctrl+K launcher — fast fuzzy search over every widget, grouped by
 * category (same grouping the sidebar uses). Each row does double duty:
 * selecting it (Enter, or clicking the row) previews the widget fullscreen
 * without pinning it; the Add button pins it to the active dashboard
 * directly, no separate "browse and add" modal needed. Reuses the share
 * modal for its own action rather than duplicating that logic. */
export function CommandPalette() {
  const open = useCommandPaletteStore((state) => state.open)
  const setOpen = useCommandPaletteStore((state) => state.setOpen)
  const toggle = useCommandPaletteStore((state) => state.toggle)
  const [shareOpen, setShareOpen] = useState(false)
  const activeDashboardId = useDashboardStore((state) => state.activeDashboardId)
  const addWidget = useDashboardStore((state) => state.addWidget)
  const openEphemeral = useOverlayStore((state) => state.openEphemeral)

  useKeyboardShortcut('k', toggle)

  return (
    <>
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Command palette"
        // Deliberate literal scrim, not `bg-background/50` — this dims the
        // page behind the palette regardless of theme, the same functional
        // exception as WidgetOverlay's identical backdrop.
        overlayClassName="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm"
        contentClassName="fixed left-1/2 top-24 z-50 w-full max-w-lg -translate-x-1/2 px-4"
        className="overflow-hidden rounded-lg border border-border bg-popover shadow-2xl"
      >
        <Command.Input
          placeholder="Search tools or actions…"
          className="w-full border-b border-border bg-transparent px-3 py-2.5 text-sm focus:outline-none"
        />
        <Command.List className="max-h-80 overflow-y-auto p-1">
          <Command.Empty className="p-4 text-center text-sm text-muted-foreground">
            No results found.
          </Command.Empty>

          <Command.Group heading="Actions" className={GROUP_HEADING_CLASS}>
            <Command.Item
              onSelect={() => {
                setOpen(false)
                setShareOpen(true)
              }}
              className={ITEM_CLASS}
            >
              <Share2 className="size-3.5 text-muted-foreground" />
              Share dashboard…
            </Command.Item>
          </Command.Group>

          {groupWidgetsByCategory().map((group) => (
            <Command.Group key={group.category} heading={group.label} className={GROUP_HEADING_CLASS}>
              {group.widgets.map((widget) => {
                const Icon = widget.icon
                return (
                  <Command.Item
                    key={widget.id}
                    value={widget.name}
                    keywords={widget.keywords}
                    onSelect={() => {
                      openEphemeral(widget.id)
                      setOpen(false)
                    }}
                    className={ITEM_CLASS}
                  >
                    <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{widget.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {widget.description}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={(event) => {
                        // Don't also trigger the row's own onSelect (preview)
                        // — this is a second, independent action.
                        event.stopPropagation()
                        addWidget(activeDashboardId, widget.id)
                        setOpen(false)
                      }}
                      aria-label={`Add ${widget.name} to dashboard`}
                      title="Add to dashboard"
                      className="shrink-0"
                    >
                      <Plus className="size-3.5" />
                      Add
                    </Button>
                  </Command.Item>
                )
              })}
            </Command.Group>
          ))}
        </Command.List>
      </Command.Dialog>

      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
    </>
  )
}
