import { WidgetSidebar } from '@/sidebar/WidgetSidebar'
import { AppHeader } from './AppHeader'
import { GridLayout } from './GridLayout'
import { ShareLoadPrompt } from './ShareLoadPrompt'
import { useDashboardStore } from './useDashboardStore'
import { useShareLinkBootstrap } from './useShareLinkBootstrap'

export function Dashboard() {
  const { pendingLayout, decodeError, dismiss } = useShareLinkBootstrap()
  const replaceWidgets = useDashboardStore((state) => state.replaceWidgets)

  return (
    <div className="flex min-h-svh w-full flex-col">
      <AppHeader />

      <div className="flex min-h-0 flex-1">
        <WidgetSidebar />

        <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          <GridLayout />

          {decodeError && (
            <p
              role="status"
              aria-live="polite"
              className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-md bg-red-600 px-3 py-1.5 text-xs text-white shadow-lg"
            >
              {decodeError}
            </p>
          )}

          {pendingLayout && (
            <ShareLoadPrompt
              layout={pendingLayout}
              onAccept={() => {
                replaceWidgets(pendingLayout.widgets)
                dismiss()
              }}
              onDismiss={dismiss}
            />
          )}
        </div>
      </div>
    </div>
  )
}
