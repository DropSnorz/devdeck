import { CommandPalette } from '@/command-palette/CommandPalette'
import { Dashboard } from '@/dashboard/Dashboard'
import { WidgetOverlay } from '@/overlay/WidgetOverlay'

function App() {
  return (
    <WidgetOverlay>
      <Dashboard />
      <CommandPalette />
    </WidgetOverlay>
  )
}

export default App
