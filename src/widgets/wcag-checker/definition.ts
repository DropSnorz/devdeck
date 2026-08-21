import { lazy } from 'react'
import { Contrast } from 'lucide-react'
import type { WidgetDefinition } from '@/widgets/types'

export const wcagCheckerDefinition: WidgetDefinition = {
  id: 'wcag-checker',
  name: 'WCAG Contrast Checker',
  description: 'Check foreground/background color contrast against WCAG AA/AAA accessibility guidelines',
  category: 'color',
  icon: Contrast,
  defaultSize: { w: 3, h: 5 },
  minSize: { w: 3, h: 4 },
  component: lazy(() => import('./WcagCheckerWidget')),
  keywords: ['wcag', 'accessibility', 'a11y', 'contrast', 'color', 'aa', 'aaa'],
}
