import {
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
} from 'lucide-react'
import { useSidebarStore } from '@/sidebar/useSidebarStore'
import { useAnyWidgetDirty, useResetAllWidgets } from '@/widgets/useWidgetDirty'
import { DashboardToolbar } from './DashboardToolbar'

/** Full-width top bar, visually distinct from the dashboard below it —
 * everything else (sidebar, grid) sits underneath this, not beside it. Owns
 * the sidebar's collapse toggle even though the sidebar itself renders
 * lower, which is why that toggle reads from the shared `useSidebarStore`
 * rather than local state. */
export function AppHeader() {
  const sidebarCollapsed = useSidebarStore((state) => state.collapsed)
  const toggleSidebar = useSidebarStore((state) => state.toggle)
  const anyDirty = useAnyWidgetDirty()
  const resetAllWidgets = useResetAllWidgets()

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={
          sidebarCollapsed ? 'Expand tool sidebar' : 'Collapse tool sidebar'
        }
        className="hidden rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 md:inline-flex dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        {sidebarCollapsed ? (
          <PanelLeftOpen className="size-4" />
        ) : (
          <PanelLeftClose className="size-4" />
        )}
      </button>

      <div className="flex items-center gap-1.5">
        <LayoutGrid className="size-5 text-slate-900 dark:text-slate-100" />
        <span className="text-base font-semibold tracking-tight">DevDeck</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={resetAllWidgets}
          disabled={!anyDirty}
          title="Reset every widget's content back to default"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <RotateCcw className="size-3.5" />
          <span className="hidden sm:inline">Clear state</span>
        </button>
        <DashboardToolbar />
      </div>
    </header>
  )
}
