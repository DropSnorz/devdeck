import { lazy } from 'react'
import { Timer } from 'lucide-react'
import type { WidgetDefinition } from '@/widgets/types'

export const timerDefinition: WidgetDefinition = {
  id: 'timer',
  name: 'Timer',
  description: 'Local clock, lap-capable stopwatch, and an alerting countdown timer',
  category: 'time',
  icon: Timer,
  defaultSize: { w: 2, h: 3 },
  minSize: { w: 2, h: 3 },
  component: lazy(() => import('./TimerWidget')),
  keywords: ['timer', 'clock', 'time', 'stopwatch', 'chronometer', 'countdown', 'alarm', 'lap', 'pomodoro'],
}
