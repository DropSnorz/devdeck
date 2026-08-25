import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

export type Direction = 'json-to-yaml' | 'yaml-to-json'

export interface ConversionResult {
  output: string
  error: string | null
}

/** Parses `input` as the source format implied by `direction` and
 * stringifies it as the other. Kept separate from the widget component so
 * the conversion logic itself is unit-testable without rendering. */
export function convert(input: string, direction: Direction): ConversionResult {
  if (!input.trim()) return { output: '', error: null }
  try {
    if (direction === 'json-to-yaml') {
      const parsed = JSON.parse(input) as unknown
      return { output: stringifyYaml(parsed), error: null }
    }
    const parsed = parseYaml(input) as unknown
    return { output: JSON.stringify(parsed, null, 2), error: null }
  } catch (err) {
    return { output: '', error: err instanceof Error ? err.message : 'Invalid input' }
  }
}
