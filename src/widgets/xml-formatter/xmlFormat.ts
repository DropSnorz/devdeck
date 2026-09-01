export interface ParseResult {
  doc: Document | null
  error: string | null
}

/** Parses `input` as XML via the browser's own DOMParser — no extra XML
 * dependency needed, and it already implements a spec-compliant parser.
 * Errors don't throw; DOMParser instead swaps in a `<parsererror>` element,
 * so that's what has to be checked for (mirrors JSON.parse's throw with a
 * message pulled out of that element instead of an Error). */
export function parseXml(input: string): ParseResult {
  const doc = new DOMParser().parseFromString(input, 'application/xml')
  const errorNode = doc.getElementsByTagName('parsererror')[0]
  if (errorNode) {
    return { doc: null, error: errorNode.textContent?.trim() || 'Invalid XML' }
  }
  return { doc, error: null }
}

function escapeText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttr(value: string): string {
  return escapeText(value).replace(/"/g, '&quot;')
}

function serializeAttrs(el: Element): string {
  return Array.from(el.attributes)
    .map((attr) => ` ${attr.name}="${escapeAttr(attr.value)}"`)
    .join('')
}

/** A node is "significant" for pretty-printing if it isn't whitespace-only
 * text left over from the original formatting — that's regenerated from
 * indentLevel instead, same as JSON.stringify ignoring insignificant
 * whitespace between tokens. */
function isSignificant(node: ChildNode): boolean {
  return node.nodeType !== Node.TEXT_NODE || !!node.textContent?.trim()
}

function serializeNode(node: ChildNode, depth: number, indent: string, lines: string[]): void {
  const pad = indent.repeat(depth)
  switch (node.nodeType) {
    case Node.ELEMENT_NODE: {
      const el = node as Element
      const attrs = serializeAttrs(el)
      const children = Array.from(el.childNodes).filter(isSignificant)
      if (children.length === 0) {
        lines.push(`${pad}<${el.tagName}${attrs}/>`)
      } else if (children.length === 1 && children[0].nodeType === Node.TEXT_NODE) {
        const text = escapeText(children[0].textContent?.trim() ?? '')
        lines.push(`${pad}<${el.tagName}${attrs}>${text}</${el.tagName}>`)
      } else {
        lines.push(`${pad}<${el.tagName}${attrs}>`)
        for (const child of children) serializeNode(child, depth + 1, indent, lines)
        lines.push(`${pad}</${el.tagName}>`)
      }
      break
    }
    case Node.TEXT_NODE:
      lines.push(`${pad}${escapeText(node.textContent?.trim() ?? '')}`)
      break
    case Node.CDATA_SECTION_NODE:
      lines.push(`${pad}<![CDATA[${node.textContent ?? ''}]]>`)
      break
    case Node.COMMENT_NODE:
      lines.push(`${pad}<!--${node.textContent ?? ''}-->`)
      break
    case Node.PROCESSING_INSTRUCTION_NODE: {
      const pi = node as ProcessingInstruction
      lines.push(`${pad}<?${pi.target} ${pi.data}?>`)
      break
    }
    default:
      break
  }
}

/** DOMParser silently drops the `<?xml version="1.0" ...?>` declaration —
 * it isn't a real node in the DOM, only readable back off the original
 * source — so it's recovered by regex and re-attached rather than lost on
 * every round trip through pretty/minify. */
function extractDeclaration(input: string): string | null {
  const match = input.match(/^\s*<\?xml[^?]*\?>/i)
  return match ? match[0].trim() : null
}

/** Re-indents `input` two spaces per nesting level, one node per line. Not a
 * text-based reformat (regex over the raw markup) — it walks the parsed DOM
 * so mixed content, comments, and CDATA all serialize correctly regardless
 * of how the original was whitespace-formatted. */
export function prettyPrintXml(input: string, doc: Document, indent = '  '): string {
  const lines: string[] = []
  const declaration = extractDeclaration(input)
  if (declaration) lines.push(declaration)
  for (const child of Array.from(doc.childNodes).filter(isSignificant)) {
    serializeNode(child, 0, indent, lines)
  }
  return lines.join('\n')
}

/** Same traversal as prettyPrintXml but joined with no separators/indent —
 * the smallest text that reparses to an equivalent tree, same idea as
 * JSON.stringify(data) with no `space` argument. */
export function minifyXml(input: string, doc: Document): string {
  const declaration = extractDeclaration(input)
  const lines: string[] = []
  for (const child of Array.from(doc.childNodes).filter(isSignificant)) {
    serializeNode(child, 0, '', lines)
  }
  return (declaration ?? '') + lines.join('')
}

/** Converts a parsed XML document into a plain JS value so it can be handed
 * to the same tree viewer (react-json-view-lite) the JSON formatter uses,
 * rather than pulling in a second tree-rendering component. Attributes are
 * prefixed with `@` and text content keyed as `#text`, the common
 * xml-to-json convention — repeated child tags collapse into an array. */
export function xmlToTree(doc: Document): object {
  const root = doc.documentElement
  return { [root.tagName]: elementToValue(root) }
}

function elementToValue(el: Element): unknown {
  const result: Record<string, unknown> = {}
  for (const attr of Array.from(el.attributes)) {
    result[`@${attr.name}`] = attr.value
  }
  const childEls = Array.from(el.children)
  if (childEls.length === 0) {
    const text = el.textContent?.trim() ?? ''
    if (Object.keys(result).length === 0) return text
    if (text) result['#text'] = text
    return result
  }
  for (const child of childEls) {
    const value = elementToValue(child)
    const key = child.tagName
    if (key in result) {
      const existing = result[key]
      if (Array.isArray(existing)) existing.push(value)
      else result[key] = [existing, value]
    } else {
      result[key] = value
    }
  }
  return result
}
