import { lazy } from 'react'
import { Percent } from 'lucide-react'
import type { WidgetDefinition } from '@/widgets/types'

export const percentageCalculatorDefinition: WidgetDefinition = {
  id: 'percentage-calculator',
  name: 'Percentage Calculator',
  description: 'Percent of a value, what percent one number is of another, and percent change',
  category: 'math',
  icon: Percent,
  defaultSize: { w: 3, h: 3 },
  minSize: { w: 3, h: 3 },
  component: lazy(() => import('./PercentageCalculatorWidget')),
  keywords: ['percent', 'percentage', 'ratio', 'change', 'discount'],
}
