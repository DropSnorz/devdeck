import type { TreeNode, TreeNodeKind } from './treeModel'

/** Recognizes the handful of field names and value shapes that carry meaning
 * across almost every payload (ids, links, timestamps, secrets, colors, ...)
 * so the tree can flag them with an icon and a short annotation instead of
 * leaving every string looking identical. Name matching is word-based rather
 * than substring-based: `userId` and `user_id` both end in the word `id`,
 * while `valid` does not, which a naive "ends with id" test would get wrong.
 *
 * Pure and JSX-free — DataTree maps the returned icon name onto a lucide
 * component — so the rules stay directly testable. */

export type HintIcon =
  | 'id'
  | 'link'
  | 'mail'
  | 'time'
  | 'secret'
  | 'user'
  | 'location'
  | 'color'
  | 'file'
  | 'image'
  | 'phone'
  | 'count'
  | 'money'
  | 'version'
  | 'status'
  | 'type'
  | 'language'
  | 'name'

export interface ValueHint {
  icon?: HintIcon
  /** Short dim annotation shown after the value, e.g. a decoded timestamp. */
  note?: string
  /** CSS color to preview as a swatch, when the value is one. */
  swatch?: string
  /** Set when the value is a followable http(s) link. */
  href?: string
  /** `warn` marks values worth not pasting into a chat window. */
  tone?: 'warn'
}

/** Splits an identifier into lowercase words, covering the naming styles a
 * payload key can arrive in: `createdAt`, `created_at`, `created-at`,
 * `@created`, `#text`, `Created At`. */
export function words(label: string): string[] {
  return label
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase())
}

/** Name rules, most specific first. `exact` matches the whole key (after
 * normalizing away separators), `last` matches the final word, which is what
 * carries the meaning in compounds like `avatarUrl` or `orderId`. */
const NAME_RULES: { icon: HintIcon; tone?: 'warn'; exact?: string[]; last?: string[] }[] = [
  {
    icon: 'secret',
    tone: 'warn',
    exact: ['auth', 'authorization', 'jwt', 'signature', 'sig', 'salt', 'hash', 'pin', 'otp'],
    last: ['password', 'passwd', 'secret', 'token', 'apikey', 'credential', 'credentials', 'privatekey'],
  },
  { icon: 'mail', exact: ['emailaddress'], last: ['email', 'mail'] },
  { icon: 'link', last: ['url', 'uri', 'urn', 'href', 'src', 'link', 'endpoint', 'website', 'homepage', 'callback'] },
  {
    icon: 'time',
    exact: ['iat', 'exp', 'nbf', 'ttl', 'dob', 'created', 'updated', 'modified', 'deleted', 'expires', 'expiry'],
    last: ['date', 'time', 'timestamp', 'at', 'datetime', 'duration', 'birthday', 'deadline'],
  },
  { icon: 'image', last: ['image', 'img', 'avatar', 'photo', 'picture', 'thumbnail', 'icon', 'logo', 'banner'] },
  { icon: 'color', last: ['color', 'colour', 'background', 'foreground', 'fill', 'stroke', 'tint', 'shade'] },
  {
    icon: 'location',
    exact: ['lat', 'lng', 'lon', 'geo', 'coordinates', 'latitude', 'longitude'],
    last: ['location', 'address', 'city', 'country', 'region', 'zip', 'postcode', 'timezone'],
  },
  { icon: 'phone', last: ['phone', 'tel', 'telephone', 'mobile', 'fax', 'msisdn'] },
  {
    icon: 'user',
    last: ['user', 'username', 'author', 'owner', 'account', 'customer', 'member', 'creator', 'assignee'],
  },
  {
    icon: 'file',
    exact: ['mimetype', 'contenttype', 'mediatype'],
    last: ['file', 'filename', 'path', 'dir', 'directory', 'folder', 'extension'],
  },
  { icon: 'money', last: ['price', 'amount', 'cost', 'currency', 'balance', 'fee', 'salary', 'revenue', 'discount'] },
  { icon: 'version', last: ['version', 'ver', 'revision', 'build', 'schema', 'release'] },
  { icon: 'status', last: ['status', 'state', 'severity', 'level', 'health', 'result', 'outcome'] },
  { icon: 'language', last: ['lang', 'language', 'locale', 'i18n', 'translation'] },
  { icon: 'id', exact: ['pk'], last: ['id', 'ids', 'uuid', 'guid', 'identifier', 'ref', 'sku', 'isbn'] },
  { icon: 'count', last: ['count', 'total', 'size', 'length', 'quantity', 'qty', 'index', 'position', 'score'] },
  { icon: 'type', last: ['type', 'kind', 'category', 'format', 'tag', 'tags', 'keywords', 'role', 'scope'] },
  { icon: 'name', last: ['name', 'title', 'label', 'subject', 'heading', 'summary', 'description'] },
]

const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const CSS_COLOR_FN = /^(?:rgb|rgba|hsl|hsla)\([\d\s.,%/-]+\)$/i
const URL_VALUE = /^https?:\/\/\S+$/i
const EMAIL_VALUE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const UUID_VALUE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const JWT_VALUE = /^eyJ[\w-]+\.[\w-]+\.[\w-]*$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/
const DATA_URI_IMAGE = /^data:image\//i

/** Epoch bounds that keep a plain counter from being read as a date: roughly
 * 1973 to 2286 in seconds, and the same window in milliseconds. */
const EPOCH_SECONDS = { min: 1e8, max: 1e10 }
const EPOCH_MILLIS = { min: 1e11, max: 1e13 }

function nameHint(label: string): { icon?: HintIcon; tone?: 'warn' } {
  const parts = words(label)
  if (parts.length === 0) return {}
  const joined = parts.join('')
  const last = parts[parts.length - 1]
  for (const rule of NAME_RULES) {
    if (rule.exact?.includes(joined) || rule.last?.includes(last)) {
      return { icon: rule.icon, tone: rule.tone }
    }
  }
  return {}
}

/** Human-readable UTC stamp, e.g. `2024-01-05 10:30 UTC`. Deliberately not
 * localized: a raw epoch is almost always being read as a server-side
 * instant, and a stable rendering is easier to compare against logs. */
export function formatInstant(date: Date): string {
  return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`
}

/** Coarse "how long ago", the thing actually worth knowing about a
 * timestamp already printed in full next to it. `now` is a parameter so the
 * output stays deterministic in tests. */
export function relativeTime(date: Date, now: number = Date.now()): string {
  const seconds = Math.round((date.getTime() - now) / 1000)
  const past = seconds < 0
  const magnitude = Math.abs(seconds)
  const units: [number, string][] = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [30, 'day'],
    [12, 'month'],
    [Number.POSITIVE_INFINITY, 'year'],
  ]
  let value = magnitude
  let unit = 'second'
  for (const [step, name] of units) {
    if (value < step) {
      unit = name
      break
    }
    value = Math.floor(value / step)
    unit = name
  }
  if (unit === 'second' && value < 45) return past ? 'just now' : 'in a moment'
  const plural = value === 1 ? unit : `${unit}s`
  return past ? `${value} ${plural} ago` : `in ${value} ${plural}`
}

function valueHint(value: string | number | boolean | null | undefined, timeish: boolean, now?: number): ValueHint {
  if (typeof value === 'number') {
    if (!timeish) return {}
    const millis =
      value >= EPOCH_MILLIS.min && value < EPOCH_MILLIS.max
        ? value
        : value >= EPOCH_SECONDS.min && value < EPOCH_SECONDS.max
          ? value * 1000
          : null
    if (millis === null) return {}
    return { icon: 'time', note: formatInstant(new Date(millis)) }
  }
  if (typeof value !== 'string' || value === '') return {}

  if (HEX_COLOR.test(value) || CSS_COLOR_FN.test(value)) return { icon: 'color', swatch: value }
  if (URL_VALUE.test(value)) return { icon: 'link', href: value }
  if (DATA_URI_IMAGE.test(value)) return { icon: 'image', note: 'inline image' }
  if (EMAIL_VALUE.test(value)) return { icon: 'mail' }
  if (JWT_VALUE.test(value)) return { icon: 'secret', tone: 'warn', note: 'JWT' }
  if (UUID_VALUE.test(value)) return { icon: 'id', note: 'UUID' }
  if (ISO_DATE.test(value)) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return { icon: 'time', note: relativeTime(date, now) }
  }
  return {}
}

/** Combines what the key says about a value with what the value itself says.
 * The value wins on icon when it recognizes a concrete shape (a URL is a
 * link even under a key named `data`), while the key still supplies the
 * warn tone that makes secrets stand out. */
export function describeNode(node: Pick<TreeNode, 'label' | 'kind' | 'value'>, now?: number): ValueHint {
  const byName = nameHint(node.label)
  const isLeafish = node.value !== undefined
  const timeish = byName.icon === 'time'
  const byValue = isLeafish ? valueHint(node.value, timeish, now) : {}
  const hint: ValueHint = {
    icon: byValue.icon ?? byName.icon,
    note: byValue.note,
    swatch: byValue.swatch,
    href: byValue.href,
    tone: byName.tone ?? byValue.tone,
  }
  return hint
}

/** Byte-size annotation for values long enough that their length is the
 * interesting part (a base64 blob, an embedded document). */
export function lengthNote(kind: TreeNodeKind, value: TreeNode['value'], threshold = 80): string | null {
  if (kind === 'boolean' || kind === 'number' || kind === 'null') return null
  if (typeof value !== 'string' || value.length < threshold) return null
  return `${value.length.toLocaleString('en-US')} chars`
}
