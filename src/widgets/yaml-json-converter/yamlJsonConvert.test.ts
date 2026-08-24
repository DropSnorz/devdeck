import { describe, expect, it } from 'vitest'
import { convert } from './yamlJsonConvert'

describe('convert', () => {
  it('converts JSON to YAML', () => {
    const { output, error } = convert('{"hello":"world","list":[1,2,3]}', 'json-to-yaml')
    expect(error).toBeNull()
    expect(output).toBe('hello: world\nlist:\n  - 1\n  - 2\n  - 3\n')
  })

  it('converts YAML to JSON', () => {
    const { output, error } = convert('hello: world\nlist:\n  - 1\n  - 2\n', 'yaml-to-json')
    expect(error).toBeNull()
    expect(JSON.parse(output)).toEqual({ hello: 'world', list: [1, 2] })
  })

  it('reports an error for invalid JSON input', () => {
    const { output, error } = convert('{not valid', 'json-to-yaml')
    expect(output).toBe('')
    expect(error).not.toBeNull()
  })

  it('reports an error for invalid YAML input', () => {
    const { output, error } = convert('foo: [', 'yaml-to-json')
    expect(output).toBe('')
    expect(error).not.toBeNull()
  })

  it('returns empty output for blank input without an error', () => {
    expect(convert('', 'json-to-yaml')).toEqual({ output: '', error: null })
    expect(convert('   ', 'yaml-to-json')).toEqual({ output: '', error: null })
  })
})
