import { lazy } from 'react'
import { FunctionSquare } from 'lucide-react'
import type { WidgetDefinition } from '@/widgets/types'

export const expressionEvaluatorDefinition: WidgetDefinition = {
  id: 'expression-evaluator',
  name: 'Expression Evaluator',
  description: 'Evaluate arithmetic expressions with operator precedence and parentheses',
  category: 'math',
  icon: FunctionSquare,
  defaultSize: { w: 3, h: 3 },
  minSize: { w: 2, h: 3 },
  component: lazy(() => import('./ExpressionEvaluatorWidget')),
  keywords: ['calculator', 'math', 'arithmetic', 'expression', 'evaluate'],
}
