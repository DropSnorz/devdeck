import { describe, expect, it } from 'vitest'
import { minifyXml, parseXml, prettyPrintXml, xmlToTree } from './xmlFormat'

describe('parseXml', () => {
  it('parses well-formed XML', () => {
    const { doc, error } = parseXml('<root><a>1</a></root>')
    expect(error).toBeNull()
    expect(doc?.documentElement.tagName).toBe('root')
  })

  it('returns an error for malformed XML', () => {
    const { doc, error } = parseXml('<root><a>1</a>')
    expect(doc).toBeNull()
    expect(error).toBeTruthy()
  })
})

describe('prettyPrintXml', () => {
  it('indents nested elements two spaces per level', () => {
    const input = '<root><a><b>1</b></a></root>'
    const { doc } = parseXml(input)
    expect(prettyPrintXml(input, doc!)).toBe('<root>\n  <a>\n    <b>1</b>\n  </a>\n</root>')
  })

  it('collapses an element with no children to a self-closing tag', () => {
    const input = '<root><empty/></root>'
    const { doc } = parseXml(input)
    expect(prettyPrintXml(input, doc!)).toBe('<root>\n  <empty/>\n</root>')
  })

  it('preserves attributes', () => {
    const input = '<root id="1" name="x"/>'
    const { doc } = parseXml(input)
    expect(prettyPrintXml(input, doc!)).toBe('<root id="1" name="x"/>')
  })

  it('re-attaches a leading XML declaration', () => {
    const input = '<?xml version="1.0" encoding="UTF-8"?><root><a>1</a></root>'
    const { doc } = parseXml(input)
    expect(prettyPrintXml(input, doc!)).toBe('<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  <a>1</a>\n</root>')
  })

  it('ignores insignificant whitespace between tags', () => {
    const input = '<root>\n   <a>1</a>\n   <b>2</b>\n</root>'
    const { doc } = parseXml(input)
    expect(prettyPrintXml(input, doc!)).toBe('<root>\n  <a>1</a>\n  <b>2</b>\n</root>')
  })

  it('leaves mixed content untouched instead of reindenting the text out of place', () => {
    const input = '<p>Hello <b>world</b>!</p>'
    const { doc } = parseXml(input)
    const output = prettyPrintXml(input, doc!)
    expect(output).toBe(input)
    // Round-trips to the exact same text, not just the same markup shape —
    // reformatting mixed content is precisely what would drop the spaces.
    expect(parseXml(output).doc!.documentElement.textContent).toBe(parseXml(input).doc!.documentElement.textContent)
  })

  it('honors xml:space="preserve" and keeps the whole subtree verbatim', () => {
    const input = '<root><pre xml:space="preserve">line one\n\n  line two  </pre></root>'
    const { doc } = parseXml(input)
    expect(prettyPrintXml(input, doc!)).toBe(
      '<root>\n  <pre xml:space="preserve">line one\n\n  line two  </pre>\n</root>',
    )
  })

  it('does not duplicate a leading xml-stylesheet processing instruction', () => {
    const input = '<?xml-stylesheet href="style.xsl" type="text/xsl"?>\n<root><a>1</a></root>'
    const { doc } = parseXml(input)
    expect(prettyPrintXml(input, doc!)).toBe(
      '<?xml-stylesheet href="style.xsl" type="text/xsl"?>\n<root>\n  <a>1</a>\n</root>',
    )
  })
})

describe('minifyXml', () => {
  it('strips all insignificant whitespace', () => {
    const input = '<root>\n  <a>1</a>\n  <b>2</b>\n</root>'
    const { doc } = parseXml(input)
    expect(minifyXml(input, doc!)).toBe('<root><a>1</a><b>2</b></root>')
  })

  it('keeps a leading XML declaration', () => {
    const input = '<?xml version="1.0"?>\n<root><a>1</a></root>'
    const { doc } = parseXml(input)
    expect(minifyXml(input, doc!)).toBe('<?xml version="1.0"?><root><a>1</a></root>')
  })

  it('does not duplicate a leading xml-stylesheet processing instruction', () => {
    const input = '<?xml-stylesheet href="style.xsl" type="text/xsl"?>\n<root><a>1</a></root>'
    const { doc } = parseXml(input)
    expect(minifyXml(input, doc!)).toBe('<?xml-stylesheet href="style.xsl" type="text/xsl"?><root><a>1</a></root>')
  })
})

describe('xmlToTree', () => {
  it('converts a leaf element to its text content', () => {
    const { doc } = parseXml('<root><a>1</a></root>')
    expect(xmlToTree(doc!)).toEqual({ root: { a: '1' } })
  })

  it('collapses repeated sibling tags into an array', () => {
    const { doc } = parseXml('<root><item>1</item><item>2</item></root>')
    expect(xmlToTree(doc!)).toEqual({ root: { item: ['1', '2'] } })
  })

  it('prefixes attributes with @ and keys text content as #text', () => {
    const { doc } = parseXml('<root><a id="1">hello</a></root>')
    expect(xmlToTree(doc!)).toEqual({ root: { a: { '@id': '1', '#text': 'hello' } } })
  })

  it('keeps direct mixed-content text under #text instead of dropping it', () => {
    const { doc } = parseXml('<p>Hello <b>world</b>!</p>')
    expect(xmlToTree(doc!)).toEqual({ p: { '#text': 'Hello !', b: 'world' } })
  })
})
