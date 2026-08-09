import { Modal } from '@/components/Modal'
import { WIDGET_REGISTRY } from '@/widgets/registry'
import type { DashboardLayoutV1 } from '@/types/layout'

interface ShareLoadPromptProps {
  layout: DashboardLayoutV1
  onAccept: () => void
  onDismiss: () => void
}

/** Confirms before a shared link overwrites the visitor's local dashboard —
 * never silent, per the confirmed share-link UX. */
export function ShareLoadPrompt({
  layout,
  onAccept,
  onDismiss,
}: ShareLoadPromptProps) {
  const widgetNames = layout.widgets
    .map((widget) => WIDGET_REGISTRY[widget.widgetId]?.name)
    .filter((name): name is string => Boolean(name))

  return (
    <Modal open onClose={onDismiss} title="Load shared dashboard?">
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
        This link contains a layout with {widgetNames.length} widget
        {widgetNames.length === 1 ? '' : 's'}. Loading it will{' '}
        <strong className="font-semibold">
          replace your current dashboard
        </strong>
        . Only widget placement is shared — not their content.
      </p>
      <ul className="mb-4 flex flex-wrap gap-1">
        {widgetNames.map((name, index) => (
          <li
            key={`${name}-${index}`}
            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800"
          >
            {name}
          </li>
        ))}
      </ul>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Keep my dashboard
        </button>
        <button
          type="button"
          onClick={onAccept}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
        >
          Load shared dashboard
        </button>
      </div>
    </Modal>
  )
}
