import type { WidgetDefinition } from './types'
import { uuidGeneratorDefinition } from './uuid-generator/definition'
import { base64Definition } from './base64/definition'
import { urlEncoderDefinition } from './url-encoder/definition'
import { timestampConverterDefinition } from './timestamp-converter/definition'
import { jsonFormatterDefinition } from './json-formatter/definition'
import { colorConverterDefinition } from './color-converter/definition'
import { hashGeneratorDefinition } from './hash-generator/definition'
import { jwtDecoderDefinition } from './jwt-decoder/definition'
import { regexTesterDefinition } from './regex-tester/definition'
import { textCaseConverterDefinition } from './text-case-converter/definition'
import { cronDefinition } from './cron/definition'
import { textDiffDefinition } from './text-diff/definition'
import { numberBaseConverterDefinition } from './number-base-converter/definition'
import { expressionEvaluatorDefinition } from './expression-evaluator/definition'
import { percentageCalculatorDefinition } from './percentage-calculator/definition'
import { unitConverterDefinition } from './unit-converter/definition'
import { statisticsCalculatorDefinition } from './statistics-calculator/definition'
import { notesDefinition } from './notes/definition'
import { subnetCalculatorDefinition } from './subnet-calculator/definition'
import { passwordGeneratorDefinition } from './password-generator/definition'

/** Single source of truth for every widget DevDeck knows about. The
 * dashboard grid, tool browser, and command palette all read from this. */
const ALL_WIDGETS: WidgetDefinition[] = [
  uuidGeneratorDefinition,
  base64Definition,
  urlEncoderDefinition,
  timestampConverterDefinition,
  jsonFormatterDefinition,
  colorConverterDefinition,
  hashGeneratorDefinition,
  jwtDecoderDefinition,
  regexTesterDefinition,
  textCaseConverterDefinition,
  cronDefinition,
  textDiffDefinition,
  numberBaseConverterDefinition,
  expressionEvaluatorDefinition,
  percentageCalculatorDefinition,
  unitConverterDefinition,
  statisticsCalculatorDefinition,
  notesDefinition,
  subnetCalculatorDefinition,
  passwordGeneratorDefinition,
]

export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = Object.fromEntries(
  ALL_WIDGETS.map((widget) => [widget.id, widget]),
)

export const WIDGET_LIST: WidgetDefinition[] = Object.values(WIDGET_REGISTRY)

export function getWidgetDefinition(widgetId: string): WidgetDefinition | undefined {
  return WIDGET_REGISTRY[widgetId]
}
