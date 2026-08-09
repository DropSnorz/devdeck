import { useState } from 'react'
import { Search, Share2 } from 'lucide-react'
import { useCommandPaletteStore } from '@/command-palette/useCommandPaletteStore'
import { ThemeToggle } from '@/theme/ThemeToggle'
import { ShareModal } from './ShareModal'

/** "Search tools" is the single entry point for finding *and* adding a
 * widget now — the command palette's own rows carry an Add button, so there
 * used to be a separate "Add widget" button/modal here that's now
 * redundant. */
export function DashboardToolbar() {
  const [shareOpen, setShareOpen] = useState(false)
  const setPaletteOpen = useCommandPaletteStore((state) => state.setOpen)

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <Search className="size-3.5" />
        <span className="hidden sm:inline">Search tools</span>
        <kbd className="ml-1 hidden rounded border border-slate-300 px-1 text-[10px] sm:inline dark:border-slate-600">
          ⌘K
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => setShareOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <Share2 className="size-3.5" />
        Share
      </button>
      <ThemeToggle />
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  )
}
