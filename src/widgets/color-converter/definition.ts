import { lazy } from 'react'
import { Palette } from 'lucide-react'
import type { WidgetDefinition } from '@/widgets/types'

export const colorConverterDefinition: WidgetDefinition = {
  id: 'color-converter',
  name: 'Color Converter',
  description: 'Pick a color and convert between hex, RGB, and HSL',
  category: 'color',
  icon: Palette,
  defaultSize: { w: 3, h: 3 },
  minSize: { w: 2, h: 3 },
  component: lazy(() => import('./ColorConverterWidget')),
  keywords: ['color', 'hex', 'rgb', 'hsl', 'picker'],
}
