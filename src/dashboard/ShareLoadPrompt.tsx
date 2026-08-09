import { Modal } from '@/components/Modal'
import type { WorkspaceLayoutV2 } from '@/types/layout'

interface ShareLoadPromptProps {
  workspace: WorkspaceLayoutV2
  onAccept: () => void
  onDismiss: () => void
}

/** Confirms before a shared link overwrites the visitor's local workspace —
 * never silent. Unlike a single-dashboard share, this replaces *every*
 * dashboard, so it's genuinely destructive again (a single-tab share could
 * safely just add a new tab; a whole-workspace share can't). */
export function ShareLoadPrompt({ workspace, onAccept, onDismiss }: ShareLoadPromptProps) {
  const totalWidgets = workspace.dashboards.reduce(
    (sum, dashboard) => sum + dashboard.widgets.length,
    0,
  )

  return (
    <Modal open onClose={onDismiss} title="Load shared workspace?">
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
        This link contains {workspace.dashboards.length} dashboard
        {workspace.dashboards.length === 1 ? '' : 's'} ({totalWidgets} widget
        {totalWidgets === 1 ? '' : 's'} total). Loading it will{' '}
        <strong className="font-semibold">replace all of your current dashboards</strong>.
        Only widget placement is shared — not their content.
      </p>
      <ul className="mb-4 flex flex-wrap gap-1">
        {workspace.dashboards.map((dashboard) => (
          <li
            key={dashboard.id}
            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800"
          >
            {dashboard.name} ({dashboard.widgets.length})
          </li>
        ))}
      </ul>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Keep my dashboards
        </button>
        <button
          type="button"
          onClick={onAccept}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
        >
          Load shared workspace
        </button>
      </div>
    </Modal>
  )
}
