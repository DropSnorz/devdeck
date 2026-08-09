import { LayoutGrid, RotateCcw } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useAnyWidgetDirty, useResetWidgets } from '@/widgets/useWidgetDirty'
import { DashboardTabBar } from './DashboardTabBar'
import { DashboardToolbar } from './DashboardToolbar'
import { useDashboardStore } from './useDashboardStore'

/** The topbar half of the header row — Dashboard.tsx renders a separate
 * brand box before this (logo + sidebar toggle), sized to match
 * WidgetSidebar exactly, so this component's own content (starting with the
 * tab bar) lines up with the content column beneath it rather than the
 * sidebar. */
export function AppHeader() {
  // Derives a new array every read (`.map(...)`) — without `useShallow` the
  // zustand/React 19 subscription sees a different reference on every
  // snapshot check even when nothing actually changed, which manifests as
  // "getSnapshot should be cached" / a runaway re-render loop.
  const activeInstanceIds = useDashboardStore(
    useShallow((state) => {
      const active = state.dashboards.find(
        (dashboard) => dashboard.id === state.activeDashboardId,
      )
      return active?.widgets.map((widget) => widget.instanceId) ?? []
    }),
  )
  const anyDirty = useAnyWidgetDirty(activeInstanceIds)
  const resetWidgets = useResetWidgets()

  return (
    <header className="flex h-full min-w-0 flex-1 items-center gap-3 border-b border-slate-200 bg-white px-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* The brand box next to the sidebar carries the logo (and toggle) on
          desktop — it's hidden below md, so show a compact stand-in here
          instead of losing it entirely on mobile. */}
      <LayoutGrid className="size-5 shrink-0 text-slate-900 md:hidden dark:text-slate-100" />

      <DashboardTabBar />

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => resetWidgets(activeInstanceIds)}
          disabled={!anyDirty}
          title="Reset every widget on this dashboard back to default"
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
