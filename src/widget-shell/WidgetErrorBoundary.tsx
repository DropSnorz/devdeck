import { Component, type ReactNode } from 'react'

interface Props {
  widgetName: string
  children: ReactNode
}

interface State {
  hasError: boolean
}

/** Isolates a single widget's crash so it can't take down the whole
 * dashboard. Each WidgetShell wraps its content in one of these. */
export class WidgetErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error(`[DevDeck] widget "${this.props.widgetName}" crashed:`, error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-1 p-2 text-center text-xs text-red-600 dark:text-red-400">
          <p className="font-medium">{this.props.widgetName} crashed</p>
          <p className="text-slate-400">Remove and re-add this widget.</p>
        </div>
      )
    }
    return this.props.children
  }
}
