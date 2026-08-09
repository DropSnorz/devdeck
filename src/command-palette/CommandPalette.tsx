import { useState } from 'react'
import { Command } from 'cmdk'
import { Plus, Share2 } from 'lucide-react'
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut'
import { useOverlayStore } from '@/overlay/useOverlayStore'
import { WIDGET_LIST } from '@/widgets/registry'
import { ToolBrowserModal } from '@/tool-browser/ToolBrowserModal'
import { ShareModal } from '@/dashboard/ShareModal'
import { useCommandPaletteStore } from './useCommandPaletteStore'

const ITEM_CLASS =
  'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 aria-selected:bg-slate-100 dark:text-slate-200 dark:aria-selected:bg-slate-800'
const GROUP_HEADING_CLASS =
  'px-2 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wide text-slate-400'

/** Cmd/Ctrl+K launcher. Reuses the tool browser and share modal for their
 * respective actions rather than duplicating that logic; its own job is
 * fast fuzzy search plus the "open any tool fullscreen, pinned or not"
 * shortcut described in the product brief. */
export function CommandPalette() {
  const open = useCommandPaletteStore((state) => state.open)
  const setOpen = useCommandPaletteStore((state) => state.setOpen)
  const toggle = useCommandPaletteStore((state) => state.toggle)
  const [browserOpen, setBrowserOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const openEphemeral = useOverlayStore((state) => state.openEphemeral)

  useKeyboardShortcut('k', toggle)

  return (
    <>
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Command palette"
        overlayClassName="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm"
        contentClassName="fixed left-1/2 top-24 z-50 w-full max-w-lg -translate-x-1/2 px-4"
        className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        <Command.Input
          placeholder="Search tools or actions…"
          className="w-full border-b border-slate-200 bg-transparent px-3 py-2.5 text-sm focus:outline-none dark:border-slate-800"
        />
        <Command.List className="max-h-80 overflow-y-auto p-1">
          <Command.Empty className="p-4 text-center text-sm text-slate-400">
            No results found.
          </Command.Empty>

          <Command.Group heading="Actions" className={GROUP_HEADING_CLASS}>
            <Command.Item
              onSelect={() => {
                setOpen(false)
                setBrowserOpen(true)
              }}
              className={ITEM_CLASS}
            >
              <Plus className="size-3.5 text-slate-400" />
              Add a widget…
            </Command.Item>
            <Command.Item
              onSelect={() => {
                setOpen(false)
                setShareOpen(true)
              }}
              className={ITEM_CLASS}
            >
              <Share2 className="size-3.5 text-slate-400" />
              Share dashboard…
            </Command.Item>
          </Command.Group>

          <Command.Group
            heading="Open tool fullscreen"
            className={GROUP_HEADING_CLASS}
          >
            {WIDGET_LIST.map((widget) => {
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
                  <Icon className="size-3.5 text-slate-400" />
                  {widget.name}
                </Command.Item>
              )
            })}
          </Command.Group>
        </Command.List>
      </Command.Dialog>

      <ToolBrowserModal
        open={browserOpen}
        onClose={() => setBrowserOpen(false)}
      />
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
    </>
  )
}
