import { describe, expect, it } from 'vitest'
import {
  ID_SEP,
  buildJsonTree,
  buildXmlTree,
  copyText,
  formatScalar,
  itemKindLabel,
  summarize,
  truncate,
  type TreeNode,
} from './treeModel'

function parse(xml: string): Document {
  return new DOMParser().parseFromString(xml, 'application/xml')
}

function find(node: TreeNode, path: string): TreeNode {
  const stack = [...node.children]
  while (stack.length) {
    const current = stack.shift()!
    if (current.path === path) return current
    stack.unshift(...current.children)
  }
  throw new Error(`no node at ${path}, have: ${flatPaths(node).join(', ')}`)
}

function flatPaths(node: TreeNode): string[] {
  return node.children.flatMap((child) => [child.path, ...flatPaths(child)])
}

describe('buildJsonTree', () => {
  it('gives every value a kind, a JSONPath, and its depth', () => {
    const root = buildJsonTree({ name: 'grid', count: 2, ok: true, missing: null })

    expect(root.children.map((child) => [child.path, child.kind])).toEqual([
      ['$.name', 'string'],
      ['$.count', 'number'],
      ['$.ok', 'boolean'],
      ['$.missing', 'null'],
    ])
    // Top-level rows are depth 1 in both formats: the synthetic root is 0.
    expect(root.children.every((child) => child.depth === 1)).toBe(true)
  })

  it('indexes array items and records their shared kind', () => {
    const root = buildJsonTree({ tags: ['a', 'b'] })
    const tags = find(root, '$.tags')

    expect(tags.children.map((child) => child.path)).toEqual(['$.tags[0]', '$.tags[1]'])
    expect(tags.children.map((child) => child.index)).toEqual([0, 1])
    expect(tags.stats.itemKind).toBe('string')
  })

  it('reports mixed for a heterogeneous array', () => {
    expect(find(buildJsonTree({ mixed: [1, 'a'] }), '$.mixed').stats.itemKind).toBe('mixed')
  })

  it('bracket-quotes a key that is not a plain identifier, so the path stays valid', () => {
    const root = buildJsonTree({ 'content-type': 'application/json' })
    expect(root.children[0].path).toBe('$["content-type"]')
  })

  it('counts direct children, all descendants, and subtree depth', () => {
    const root = buildJsonTree({ a: { b: { c: 1 } }, d: 2 })

    expect(root.stats).toMatchObject({ children: 2, descendants: 4, depth: 3 })
    expect(find(root, '$.a').stats).toMatchObject({ children: 1, descendants: 2, depth: 2 })
    expect(find(root, '$.d').stats).toMatchObject({ children: 0, descendants: 0, depth: 0 })
  })

  it('previews a collapsed container with its first few entries', () => {
    expect(buildJsonTree({ a: 1, b: 'two', c: [1], d: 4 }).preview).toBe('{ a: 1, b: "two", c: [...], … }')
    expect(find(buildJsonTree({ list: [1, 2] }), '$.list').preview).toBe('[ 1, 2 ]')
  })

  it('separates ids with a control character so a prefix test means ancestry', () => {
    const root = buildJsonTree({ a: { b: 1 }, ab: 2 })
    const a = find(root, '$.a')
    const ab = find(root, '$.ab')
    const b = find(root, '$.a.b')

    expect(b.id.startsWith(a.id + ID_SEP)).toBe(true)
    // The trap a dot-separated id would fall into: `$.ab` is a sibling of
    // `$.a`, not a child of it.
    expect(ab.id.startsWith(a.id + ID_SEP)).toBe(false)
    expect(b.ancestors).toEqual([root.id, a.id])
  })
})

describe('buildXmlTree', () => {
  it('keeps elements, attributes, and text as distinct node kinds', () => {
    const root = buildXmlTree(parse('<a id="1">hello</a>'))
    const a = find(root, '/a')

    expect(a.kind).toBe('element')
    // A text-only element carries its text inline rather than spending a row
    // on a `#text` child.
    expect(a.value).toBe('hello')
    expect(a.children.map((child) => [child.kind, child.path, child.value])).toEqual([['attribute', '/a/@id', '1']])
  })

  it('numbers repeated siblings and leaves one-off tags unindexed', () => {
    const root = buildXmlTree(parse('<r><item>1</item><item>2</item><only>x</only></r>'))

    expect(flatPaths(root)).toEqual(['/r', '/r/item[1]', '/r/item[2]', '/r/only'])
    expect(find(root, '/r/item[2]').index).toBe(1)
    expect(find(root, '/r/only').index).toBeUndefined()
  })

  it('drops formatting whitespace but keeps comments and mixed-content text', () => {
    const root = buildXmlTree(parse('<r>\n  <!-- note -->\n  <p>Hello <b>world</b>!</p>\n</r>'))

    expect(find(root, '/r/comment()').kind).toBe('comment')
    const p = find(root, '/r/p')
    expect(p.children.map((child) => child.kind)).toEqual(['text', 'element', 'text'])
  })

  it('gives a text node and a CDATA section distinct paths', () => {
    // Both are addressed as `text()` in XPath but have different DOM node
    // names, so counting occurrences by node name would hand them the same
    // id, aliasing their rows in the tree.
    const root = buildXmlTree(parse('<a><![CDATA[x]]>y</a>'))

    expect(flatPaths(root)).toEqual(['/a', '/a/text()[1]', '/a/text()[2]'])
    const [cdata, text] = find(root, '/a').children
    expect([cdata.kind, text.kind]).toEqual(['cdata', 'text'])
    expect(cdata.id).not.toBe(text.id)
  })

  it('keeps text that is only whitespace when it is the whole content', () => {
    // Indentation between tags is formatting and stays dropped, but an
    // element whose entire content is a space would otherwise render empty.
    expect(find(buildXmlTree(parse('<pre> </pre>')), '/pre').value).toBe(' ')
  })

  it('keeps indentation inside an xml:space="preserve" subtree', () => {
    // `xml:space` is itself an attribute row, so only the content children
    // are compared here.
    const content = (node: TreeNode) => node.children.filter((child) => child.kind !== 'attribute').map((c) => c.kind)

    const root = buildXmlTree(parse('<r><pre xml:space="preserve">\n  <b>x</b>\n</pre></r>'))
    expect(content(find(root, '/r/pre'))).toEqual(['text', 'element', 'text'])

    // ...and drops it again below an explicit xml:space="default".
    const off = buildXmlTree(parse('<r xml:space="preserve"><p xml:space="default">\n  <b>x</b>\n</p></r>'))
    expect(content(find(off, '/r/p'))).toEqual(['element'])
  })

  it('counts attributes as children of their element', () => {
    const root = buildXmlTree(parse('<a x="1" y="2"><b/></a>'))
    expect(find(root, '/a').stats).toMatchObject({ children: 3, descendants: 3 })
  })
})

describe('summarize', () => {
  it('counts a JSON document by structure kind', () => {
    expect(summarize(buildJsonTree({ a: { b: 1 }, c: [2, 3] }))).toEqual({
      nodes: 5,
      depth: 2,
      objects: 1,
      arrays: 1,
      values: 3,
      elements: 0,
      attributes: 0,
    })
  })

  it('counts an XML document by element and attribute', () => {
    expect(summarize(buildXmlTree(parse('<a id="1"><b/></a>')))).toMatchObject({
      elements: 2,
      attributes: 1,
      depth: 2,
    })
  })
})

describe('copyText', () => {
  it('re-serializes a JSON subtree rather than what is on screen', () => {
    const root = buildJsonTree({ nested: { a: 1 } })
    expect(copyText(find(root, '$.nested'))).toBe('{\n  "a": 1\n}')
    expect(copyText(find(root, '$.nested.a'))).toBe('1')
  })

  it('returns an element as markup and an attribute as its bare value', () => {
    const root = buildXmlTree(parse('<a id="1"><b>x</b></a>'))
    expect(copyText(find(root, '/a'))).toBe('<a id="1"><b>x</b></a>')
    expect(copyText(find(root, '/a/@id'))).toBe('1')
  })
})

describe('formatting helpers', () => {
  it('quotes strings so they stay distinguishable from numbers and null', () => {
    expect(formatScalar('string', '12')).toBe('"12"')
    expect(formatScalar('number', 12)).toBe('12')
    expect(formatScalar('null', null)).toBe('null')
  })

  it('escapes a string that would otherwise break out of its row', () => {
    // A raw newline would render the value across several visual lines, and
    // a bare quote would read as the end of the value.
    expect(formatScalar('string', 'two\nlines')).toBe('"two\\nlines"')
    expect(formatScalar('string', 'say "hi"')).toBe('"say \\"hi\\""')
  })

  it('pluralizes a homogeneous collection and gives up on a mixed one', () => {
    expect(itemKindLabel('string', 2)).toBe('strings')
    expect(itemKindLabel('object', 1)).toBe('object')
    expect(itemKindLabel('mixed', 3)).toBeNull()
    expect(itemKindLabel(null, 0)).toBeNull()
  })

  it('truncates only past the limit', () => {
    expect(truncate('abc', 3)).toBe('abc')
    expect(truncate('abcd', 3)).toBe('abc…')
  })
})
