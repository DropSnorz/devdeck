import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Modal } from '@/components/Modal'
import { MAX_DASHBOARDS, useDashboardStore } from './useDashboardStore'

/** Tab strip for switching between dashboards. Double-click a tab to rename
 * it inline; removing one (needs a confirm — unlike "Clear state," this
 * destroys a whole layout, not just ephemeral widget content) is refused on
 * the last remaining dashboard. */
export function DashboardTabBar() {
  const dashboards = useDashboardStore((state) => state.dashboards)
  const activeDashboardId = useDashboardStore((state) => state.activeDashboardId)
  const setActiveDashboardId = useDashboardStore((state) => state.setActiveDashboardId)
  const addDashboard = useDashboardStore((state) => state.addDashboard)
  const renameDashboard = useDashboardStore((state) => state.renameDashboard)
  const removeDashboard = useDashboardStore((state) => state.removeDashboard)

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)

  const startRename = (id: string, currentName: string) => {
    setRenamingId(id)
    setDraftName(currentName)
  }

  const commitRename = () => {
    if (renamingId && draftName.trim()) {
      renameDashboard(renamingId, draftName.trim())
    }
    setRenamingId(null)
  }

  const pendingRemove = dashboards.find((dashboard) => dashboard.id === pendingRemoveId)
  const atDashboardLimit = dashboards.length >= MAX_DASHBOARDS

  return (
    <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
      {dashboards.map((dashboard) => {
        const isActive = dashboard.id === activeDashboardId
        // Delete only ever shows on the active tab — offering it on every
        // tab on hover made it too easy to misclick one you were just
        // passing over on the way to something else.
        const showRemove = isActive && dashboards.length > 1
        return (
          <div
            key={dashboard.id}
            className={cn(
              'flex shrink-0 items-center rounded-md text-xs font-medium',
              isActive
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
            )}
          >
            {renamingId === dashboard.id ? (
              <input
                autoFocus
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                onBlur={commitRename}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitRename()
                  if (event.key === 'Escape') setRenamingId(null)
                }}
                className="w-24 border-0 bg-transparent px-3 py-2 text-xs outline-none"
              />
            ) : (
              // Padding lives on the button itself, not a wrapping div, so
              // the entire pill — not just the text — is clickable.
              <button
                type="button"
                onClick={() => setActiveDashboardId(dashboard.id)}
                onDoubleClick={() => startRename(dashboard.id, dashboard.name)}
                title="Double-click to rename"
                className={cn('max-w-40 truncate rounded-md py-2 pl-3', showRemove ? 'pr-1.5' : 'pr-3')}
              >
                {dashboard.name}
              </button>
            )}
            {showRemove && (
              <button
                type="button"
                onClick={() => setPendingRemoveId(dashboard.id)}
                aria-label={`Remove ${dashboard.name}`}
                className={cn(
                  'mr-1.5 rounded p-1',
                  isActive
                    ? 'hover:bg-white/20'
                    : 'hover:bg-slate-200 dark:hover:bg-slate-700',
                )}
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        )
      })}

      <button
        type="button"
        onClick={() => addDashboard(`Dashboard ${dashboards.length + 1}`)}
        disabled={atDashboardLimit}
        aria-label="Add dashboard"
        title={atDashboardLimit ? `Up to ${MAX_DASHBOARDS} dashboards` : 'Add dashboard'}
        className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <Plus className="size-3.5" />
      </button>

      {pendingRemove && (
        <Modal open onClose={() => setPendingRemoveId(null)} title="Remove this dashboard?">
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
            This removes <strong className="font-semibold">{pendingRemove.name}</strong> and
            every widget on it. This can&rsquo;t be undone.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPendingRemoveId(null)}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                removeDashboard(pendingRemove.id)
                setPendingRemoveId(null)
              }}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
            >
              Remove
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
