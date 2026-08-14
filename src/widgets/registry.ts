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
]

export const WIDGET_REGISTRY: Record<string, WidgetDefinition> =
  Object.fromEntries(ALL_WIDGETS.map((widget) => [widget.id, widget]))

export const WIDGET_LIST: WidgetDefinition[] = Object.values(WIDGET_REGISTRY)

export function getWidgetDefinition(
  widgetId: string,
): WidgetDefinition | undefined {
  return WIDGET_REGISTRY[widgetId]
}
