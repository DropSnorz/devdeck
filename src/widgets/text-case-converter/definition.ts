import { lazy } from 'react'
import { CaseSensitive } from 'lucide-react'
import type { WidgetDefinition } from '@/widgets/types'

export const textCaseConverterDefinition: WidgetDefinition = {
  id: 'text-case-converter',
  name: 'Text Case Converter',
  description: 'Convert text to camelCase, snake_case, kebab-case, and more',
  category: 'text',
  icon: CaseSensitive,
  defaultSize: { w: 2, h: 3 },
  minSize: { w: 2, h: 3 },
  component: lazy(() => import('./TextCaseConverterWidget')),
  keywords: ['case', 'camelcase', 'snakecase', 'kebabcase', 'text'],
}
