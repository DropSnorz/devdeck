import { RotateCcw } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useAnyWidgetDirty, useResetWidgets } from '@/widgets/useWidgetDirty'
import { LogoIcon } from '@/components/icons/LogoIcon'
import { Button } from '@/components/ui/button'
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
    <header className="flex h-full min-w-0 flex-1 items-center gap-3 border-b border-border bg-card px-4 shadow-sm">
      {/* The brand box next to the sidebar carries the logo (and toggle) on
          desktop — it's hidden below md, so show a compact stand-in here
          instead of losing it entirely on mobile. */}
      <LogoIcon className="size-5 text-foreground md:hidden" />

      <DashboardTabBar />

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => resetWidgets(activeInstanceIds)}
          disabled={!anyDirty}
          title="Reset every widget on this dashboard back to default"
        >
          <RotateCcw className="size-3.5" />
          <span className="hidden sm:inline">Clear state</span>
        </Button>
        <DashboardToolbar />
      </div>
    </header>
  )
}
