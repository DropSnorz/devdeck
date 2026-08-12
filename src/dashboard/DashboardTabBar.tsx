import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
              isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent',
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
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setPendingRemoveId(dashboard.id)}
                aria-label={`Remove ${dashboard.name}`}
                className={cn(
                  'mr-1.5 text-current hover:text-current',
                  isActive ? 'hover:bg-white/20' : 'hover:bg-accent',
                )}
              >
                <X className="size-3" />
              </Button>
            )}
          </div>
        )
      })}

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => addDashboard(`Dashboard ${dashboards.length + 1}`)}
        disabled={atDashboardLimit}
        aria-label="Add dashboard"
        title={atDashboardLimit ? `Up to ${MAX_DASHBOARDS} dashboards` : 'Add dashboard'}
        className="shrink-0 text-muted-foreground disabled:hover:bg-transparent"
      >
        <Plus className="size-3.5" />
      </Button>

      {pendingRemove && (
        <Dialog
          open
          onOpenChange={(next) => {
            if (!next) setPendingRemoveId(null)
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Remove this dashboard?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              This removes <strong className="font-semibold text-foreground">{pendingRemove.name}</strong> and every
              widget on it. This can&rsquo;t be undone.
            </p>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setPendingRemoveId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  removeDashboard(pendingRemove.id)
                  setPendingRemoveId(null)
                }}
                // Base UI's default `destructive` variant is a soft/tinted
                // style (bg-destructive/10) — overridden to a solid fill
                // here since this specific action (removing a whole
                // dashboard, irreversibly) warrants the stronger signal the
                // original design used.
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
