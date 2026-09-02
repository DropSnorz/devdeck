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
 * whitespace between tokens. Only used once an element has already been
 * ruled out as mixed content (see `isMixedContent`) — a whitespace-only text
 * node *between* inline elements can still be a meaningful separator, so it
 * must not be dropped there. */
function isSignificant(node: ChildNode): boolean {
  return node.nodeType !== Node.TEXT_NODE || !!node.textContent?.trim()
}

function isTextLike(node: ChildNode): boolean {
  return node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE
}

/** True when `el` has both element children and non-whitespace text
 * directly inside it — e.g. `<p>Hello <b>world</b>!</p>`. Reformatting that
 * onto separate indented lines (the block-formatting path below) would
 * inject whitespace the markup never had, changing what it renders as, so
 * mixed content is instead serialized inline, byte-for-byte. */
function isMixedContent(el: Element): boolean {
  const children = Array.from(el.childNodes)
  return (
    children.some((n) => n.nodeType === Node.ELEMENT_NODE) &&
    children.some((n) => isTextLike(n) && !!n.textContent?.trim())
  )
}

/** `xml:space="preserve"` (XML's own whitespace-preservation attribute)
 * applies to an element and inherits down to its descendants until a
 * `xml:space="default"` turns it back off. */
function resolvePreserveSpace(el: Element, inherited: boolean): boolean {
  const value = el.getAttribute('xml:space')
  if (value === 'preserve') return true
  if (value === 'default') return false
  return inherited
}

/** Serializes a node byte-for-byte, with no added whitespace anywhere in the
 * subtree — used for mixed content and `xml:space="preserve"` subtrees,
 * where reformatting would change the text's meaning. Every descendant
 * stays inline once entered, since indenting a nested node would reinject
 * exactly the whitespace this exists to avoid. */
function serializeInline(node: ChildNode): string {
  switch (node.nodeType) {
    case Node.ELEMENT_NODE: {
      const el = node as Element
      const attrs = serializeAttrs(el)
      const children = Array.from(el.childNodes)
      if (children.length === 0) return `<${el.tagName}${attrs}/>`
      return `<${el.tagName}${attrs}>${children.map(serializeInline).join('')}</${el.tagName}>`
    }
    case Node.TEXT_NODE:
      return escapeText(node.textContent ?? '')
    case Node.CDATA_SECTION_NODE:
      return `<![CDATA[${node.textContent ?? ''}]]>`
    case Node.COMMENT_NODE:
      return `<!--${node.textContent ?? ''}-->`
    case Node.PROCESSING_INSTRUCTION_NODE: {
      const pi = node as ProcessingInstruction
      return `<?${pi.target} ${pi.data}?>`
    }
    default:
      return ''
  }
}

function serializeNode(node: ChildNode, depth: number, indent: string, lines: string[], preserve: boolean): void {
  const pad = indent.repeat(depth)
  switch (node.nodeType) {
    case Node.ELEMENT_NODE: {
      const el = node as Element
      const effectivePreserve = resolvePreserveSpace(el, preserve)
      if (effectivePreserve || isMixedContent(el)) {
        lines.push(`${pad}${serializeInline(el)}`)
        break
      }
      const attrs = serializeAttrs(el)
      const children = Array.from(el.childNodes).filter(isSignificant)
      if (children.length === 0) {
        lines.push(`${pad}<${el.tagName}${attrs}/>`)
      } else if (children.length === 1 && children[0].nodeType === Node.TEXT_NODE) {
        const text = escapeText(children[0].textContent?.trim() ?? '')
        lines.push(`${pad}<${el.tagName}${attrs}>${text}</${el.tagName}>`)
      } else {
        lines.push(`${pad}<${el.tagName}${attrs}>`)
        for (const child of children) serializeNode(child, depth + 1, indent, lines, effectivePreserve)
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
 * every round trip through pretty/minify. Requires whitespace right after
 * `xml` so a leading `<?xml-stylesheet ...?>` processing instruction (a
 * real DOM node, unlike the declaration) isn't mistaken for one — that
 * would otherwise get emitted twice, once prepended here and once again
 * when `doc.childNodes` is walked. */
function extractDeclaration(input: string): string | null {
  const match = input.match(/^\s*<\?xml\s[^?]*\?>/i)
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
    serializeNode(child, 0, indent, lines, false)
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
    serializeNode(child, 0, '', lines, false)
  }
  return (declaration ?? '') + lines.join('')
}
