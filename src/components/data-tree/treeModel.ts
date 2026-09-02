/** Shared node model behind the JSON and XML tree views. Both formats get
 * normalized into the same flat-renderable shape (see DataTree) so hover
 * relations, statistics, filtering, and keyboard navigation are written
 * once instead of once per format. Kept free of JSX so the traversal rules
 * can be unit-tested directly. */

export type TreeNodeKind =
  // JSON
  | 'object'
  | 'array'
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  // XML
  | 'document'
  | 'element'
  | 'attribute'
  | 'text'
  | 'cdata'
  | 'comment'
  | 'instruction'

/** Separator used inside node ids only. A control character, so it can't
 * occur in a JSON key or XML name and an ancestor test stays a plain
 * `id.startsWith(other + ID_SEP)`. With a dot-separated id, `$.ab` would
 * wrongly read as a descendant of `$.a`. */
export const ID_SEP = '\u0001'

export interface TreeStats {
  /** Direct children (attributes included, for elements). */
  children: number
  /** Every node below this one, at any depth. */
  descendants: number
  /** Levels below this node, 0 for a leaf. */
  depth: number
  /** For arrays and repeated element lists: the shared kind of every item,
   * `'mixed'` when they differ, `null` when empty. */
  itemKind: TreeNodeKind | 'mixed' | null
}

export interface TreeNode {
  /** Unique, and stable across rebuilds: the tree is rebuilt on every
   * keystroke, so expansion and selection state is keyed on this rather
   * than on object identity. */
  id: string
  /** Human-facing location: JSONPath-ish for JSON, XPath-ish for XML. */
  path: string
  /** Bare name: object key, array index, tag name, attribute name. */
  label: string
  kind: TreeNodeKind
  /** Leaf value, already unwrapped. Containers leave this undefined. */
  value?: string | number | boolean | null
  /** Position among same-named siblings, when the name repeats. Drives the
   * dim index marker that makes repeated XML tags countable. */
  index?: number
  children: TreeNode[]
  /** Ids from the root down to (not including) this node, so a row can tell
   * which of its indent guides belongs to the currently hovered node. */
  ancestors: string[]
  /** Nesting level, counting the synthetic root as 0. Top-level rows are
   * therefore depth 1 in both formats, which is what DataTree renders as
   * `aria-level` 1 with no indent. */
  depth: number
  /** One-line summary rendered while the node is collapsed. */
  preview: string
  stats: TreeStats
  /** Backing value for "copy value": the original JSON value or DOM node,
   * held by reference so building the tree stays linear instead of
   * serializing every subtree up front. */
  source: unknown
}

export interface TreeSummary {
  nodes: number
  depth: number
  objects: number
  arrays: number
  values: number
  elements: number
  attributes: number
}

const PREVIEW_ENTRIES = 3
const PREVIEW_SCALAR_CHARS = 24

export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

/** The exact text a leaf renders as. Strings stay quoted so an empty string,
 * a numeric string, and a real number remain distinguishable. */
export function formatScalar(kind: TreeNodeKind, value: TreeNode['value']): string {
  if (kind === 'null' || value === null || value === undefined) return 'null'
  // A comment or processing instruction is prose, not data: quoting it only
  // adds noise, where a text node's exact whitespace can be the bug.
  if (kind === 'comment' || kind === 'instruction') return String(value).trim()
  if (typeof value === 'string') return `"${value}"`
  return String(value)
}

/** Compact one-token rendering of a child, used inside a parent's preview. */
function scalarPreview(node: TreeNode): string {
  switch (node.kind) {
    case 'object':
      return '{...}'
    case 'array':
      return '[...]'
    case 'element':
      return `<${node.label}>`
    default:
      return truncate(formatScalar(node.kind, node.value), PREVIEW_SCALAR_CHARS)
  }
}

function itemKindOf(children: TreeNode[]): TreeStats['itemKind'] {
  if (children.length === 0) return null
  const first = children[0].kind
  return children.every((child) => child.kind === first) ? first : 'mixed'
}

function statsOf(children: TreeNode[]): TreeStats {
  let descendants = 0
  let depth = 0
  for (const child of children) {
    descendants += 1 + child.stats.descendants
    depth = Math.max(depth, 1 + child.stats.depth)
  }
  return { children: children.length, descendants, depth, itemKind: itemKindOf(children) }
}

/** Plural-aware noun for a homogeneous collection, e.g. `strings` for a
 * 3-string array. Null when the collection is empty or mixed. */
export function itemKindLabel(kind: TreeStats['itemKind'], count: number): string | null {
  if (!kind || kind === 'mixed') return null
  return count === 1 ? kind : `${kind}s`
}

// --- JSON -------------------------------------------------------------------

function jsonKind(value: unknown): TreeNodeKind {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  switch (typeof value) {
    case 'object':
      return 'object'
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    default:
      return 'string'
  }
}

/** A JSONPath key segment: dot notation for plain identifiers, bracket-
 * quoted otherwise, so a copied path stays valid for keys containing spaces
 * or dots. */
function jsonPathSegment(key: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? `.${key}` : `[${JSON.stringify(key)}]`
}

function buildJsonNode(
  label: string,
  value: unknown,
  parentPath: string,
  parentId: string,
  ancestors: string[],
  depth: number,
  segment: string,
  index?: number,
): TreeNode {
  const kind = jsonKind(value)
  const id = parentId ? `${parentId}${ID_SEP}${segment}` : segment
  const path = `${parentPath}${segment}`
  const node: TreeNode = {
    id,
    path,
    label,
    kind,
    index,
    children: [],
    ancestors,
    depth,
    preview: '',
    stats: { children: 0, descendants: 0, depth: 0, itemKind: null },
    source: value,
  }
  const childAncestors = [...ancestors, id]

  if (kind === 'array') {
    node.children = (value as unknown[]).map((item, itemIndex) =>
      buildJsonNode(String(itemIndex), item, path, id, childAncestors, depth + 1, `[${itemIndex}]`, itemIndex),
    )
  } else if (kind === 'object') {
    node.children = Object.entries(value as Record<string, unknown>).map(([key, item]) =>
      buildJsonNode(key, item, path, id, childAncestors, depth + 1, jsonPathSegment(key)),
    )
  } else {
    node.value = value as TreeNode['value']
  }

  node.stats = statsOf(node.children)
  node.preview = previewOf(node)
  return node
}

/** Root node for a parsed JSON value. The root is a handle for
 * whole-document stats; DataTree renders its children as the top level. */
export function buildJsonTree(value: unknown): TreeNode {
  return buildJsonNode('$', value, '$', '', [], 0, '')
}

// --- XML --------------------------------------------------------------------

/** Whitespace between tags is formatting, not content, so it never becomes a
 * row: the same rule prettyPrintXml applies when re-indenting. */
function isMeaningful(node: ChildNode): boolean {
  if (node.nodeType === Node.TEXT_NODE) return !!node.textContent?.trim()
  return true
}

function xmlChildNodes(parent: Node): ChildNode[] {
  return Array.from(parent.childNodes).filter(isMeaningful)
}

const XML_KINDS: Record<number, TreeNodeKind> = {
  [Node.ELEMENT_NODE]: 'element',
  [Node.TEXT_NODE]: 'text',
  [Node.CDATA_SECTION_NODE]: 'cdata',
  [Node.COMMENT_NODE]: 'comment',
  [Node.PROCESSING_INSTRUCTION_NODE]: 'instruction',
}

/** True when an element's content is a single run of text. That text is then
 * shown inline on the element's own row rather than as a child row, which is
 * how the markup itself reads. */
function isTextOnly(el: Element): boolean {
  const children = xmlChildNodes(el)
  if (children.length !== 1) return false
  const only = children[0].nodeType
  return only === Node.TEXT_NODE || only === Node.CDATA_SECTION_NODE
}

function xmlLabel(domNode: ChildNode, kind: TreeNodeKind): string {
  switch (kind) {
    case 'element':
      return (domNode as Element).tagName
    case 'instruction':
      return `?${(domNode as ProcessingInstruction).target}`
    case 'comment':
      return '#comment'
    case 'cdata':
      return '#cdata'
    default:
      return '#text'
  }
}

function xmlStep(domNode: ChildNode, kind: TreeNodeKind): string {
  switch (kind) {
    case 'element':
      return (domNode as Element).tagName
    case 'comment':
      return 'comment()'
    case 'instruction':
      return 'processing-instruction()'
    default:
      return 'text()'
  }
}

function buildXmlNode(
  domNode: ChildNode,
  parentPath: string,
  parentId: string,
  ancestors: string[],
  depth: number,
  index?: number,
): TreeNode {
  const kind = XML_KINDS[domNode.nodeType] ?? 'text'
  const step = xmlStep(domNode, kind)
  const positioned = index === undefined ? step : `${step}[${index + 1}]`
  const id = `${parentId}${ID_SEP}${positioned}`
  const path = `${parentPath}/${positioned}`
  const childAncestors = [...ancestors, id]

  const node: TreeNode = {
    id,
    path,
    label: xmlLabel(domNode, kind),
    kind,
    index,
    children: [],
    ancestors,
    depth,
    preview: '',
    stats: { children: 0, descendants: 0, depth: 0, itemKind: null },
    source: domNode,
  }

  if (kind === 'element') {
    const el = domNode as Element
    for (const attr of Array.from(el.attributes)) {
      node.children.push({
        id: `${id}${ID_SEP}@${attr.name}`,
        path: `${path}/@${attr.name}`,
        label: attr.name,
        kind: 'attribute',
        value: attr.value,
        children: [],
        ancestors: childAncestors,
        depth: depth + 1,
        preview: '',
        stats: { children: 0, descendants: 0, depth: 0, itemKind: null },
        source: attr.value,
      })
    }
    if (isTextOnly(el)) {
      node.value = el.textContent ?? ''
    } else {
      node.children.push(...buildXmlChildren(el, path, id, childAncestors, depth + 1))
    }
  } else {
    node.value = domNode.textContent ?? ''
  }

  node.stats = statsOf(node.children)
  node.preview = previewOf(node)
  return node
}

/** Positional indices are assigned only where a name actually repeats, so a
 * one-off tag stays unindexed while repeated siblings keep addressable,
 * countable paths. */
function buildXmlChildren(
  parent: Node,
  parentPath: string,
  parentId: string,
  ancestors: string[],
  depth: number,
): TreeNode[] {
  const children = xmlChildNodes(parent)
  const totals = new Map<string, number>()
  for (const child of children) {
    totals.set(child.nodeName, (totals.get(child.nodeName) ?? 0) + 1)
  }
  const seen = new Map<string, number>()
  return children.map((child) => {
    const repeated = (totals.get(child.nodeName) ?? 0) > 1
    const position = seen.get(child.nodeName) ?? 0
    seen.set(child.nodeName, position + 1)
    return buildXmlNode(child, parentPath, parentId, ancestors, depth, repeated ? position : undefined)
  })
}

export function buildXmlTree(doc: Document): TreeNode {
  const root: TreeNode = {
    id: 'xml',
    path: '',
    label: '#document',
    kind: 'document',
    children: [],
    ancestors: [],
    depth: 0,
    preview: '',
    stats: { children: 0, descendants: 0, depth: 0, itemKind: null },
    source: doc,
  }
  root.children = buildXmlChildren(doc, '', 'xml', ['xml'], 1)
  root.stats = statsOf(root.children)
  return root
}

// --- Previews, stats, serialization ----------------------------------------

function previewOf(node: TreeNode): string {
  if (node.kind === 'array') {
    const items = node.children.slice(0, PREVIEW_ENTRIES).map(scalarPreview)
    if (node.children.length > items.length) items.push('…')
    return `[ ${items.join(', ')} ]`
  }
  if (node.kind === 'object') {
    const entries = node.children.slice(0, PREVIEW_ENTRIES).map((child) => `${child.label}: ${scalarPreview(child)}`)
    if (node.children.length > entries.length) entries.push('…')
    return entries.length ? `{ ${entries.join(', ')} }` : '{ }'
  }
  if (node.kind === 'element') {
    // Attributes are what identifies a collapsed element (id, type, ...), so
    // they lead the preview ahead of the child count.
    const attrs = node.children.filter((child) => child.kind === 'attribute')
    const attrText = attrs
      .slice(0, PREVIEW_ENTRIES)
      .map((attr) => `${attr.label}="${truncate(String(attr.value ?? ''), PREVIEW_SCALAR_CHARS)}"`)
      .join(' ')
    const elements = node.children.length - attrs.length
    const tail = elements ? `${elements} child${elements === 1 ? '' : 'ren'}` : ''
    return [attrText, tail].filter(Boolean).join(' · ')
  }
  return ''
}

export function isContainer(node: TreeNode): boolean {
  return node.children.length > 0
}

/** Whole-document counts for the summary bar. Counts descendants only, so
 * the synthetic root never inflates them. */
export function summarize(root: TreeNode): TreeSummary {
  const summary: TreeSummary = {
    nodes: root.stats.descendants,
    depth: root.stats.depth,
    objects: 0,
    arrays: 0,
    values: 0,
    elements: 0,
    attributes: 0,
  }
  const walk = (node: TreeNode) => {
    for (const child of node.children) {
      switch (child.kind) {
        case 'object':
          summary.objects++
          break
        case 'array':
          summary.arrays++
          break
        case 'element':
          summary.elements++
          break
        case 'attribute':
          summary.attributes++
          break
        default:
          summary.values++
      }
      walk(child)
    }
  }
  walk(root)
  return summary
}

/** Text put on the clipboard for a node: the JSON subtree re-serialized, or
 * the element's own markup, rather than whatever the tree happens to have
 * collapsed on screen. */
export function copyText(node: TreeNode): string {
  const source = node.source
  if (node.kind === 'document' || node.kind === 'element') {
    return new XMLSerializer().serializeToString(source as Node)
  }
  if (node.kind === 'object' || node.kind === 'array') {
    return JSON.stringify(source, null, 2)
  }
  if (typeof source === 'string') return source
  if (source instanceof Node) return source.textContent ?? ''
  return JSON.stringify(source)
}
