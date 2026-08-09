import LZString from 'lz-string'
import * as v from 'valibot'
import { getWidgetDefinition } from '@/widgets/registry'
import {
  DASHBOARD_LAYOUT_VERSION,
  type DashboardLayoutV1,
  type DashboardWidgetInstance,
} from '@/types/layout'

/** The URL fragment (`#layout=...`) param a shared dashboard link is encoded
 * into — a fragment rather than a query param so the (compressed but
 * unencrypted) layout is never sent to a server: fragments are stripped by
 * the browser before a request goes out, and never appear in server access
 * logs, `Referer` headers, or analytics. */
export const LAYOUT_HASH_PARAM = 'layout'

const WidgetInstanceSchema = v.object({
  instanceId: v.string(),
  widgetId: v.string(),
  x: v.number(),
  y: v.number(),
  w: v.number(),
  h: v.number(),
})

const LayoutSchema = v.object({
  version: v.literal(DASHBOARD_LAYOUT_VERSION),
  widgets: v.array(WidgetInstanceSchema),
})

/** Layout JSON -> compressed, URL-safe string for the `#layout=` fragment. */
export function encodeLayout(widgets: DashboardWidgetInstance[]): string {
  const payload: DashboardLayoutV1 = {
    version: DASHBOARD_LAYOUT_VERSION,
    widgets,
  }
  return LZString.compressToEncodedURIComponent(JSON.stringify(payload))
}

export type DecodeResult =
  { ok: true; layout: DashboardLayoutV1 } | { ok: false; error: string }

/** Reverses `encodeLayout`, validating the untrusted result before it's
 * allowed to reach the dashboard store. Silently drops any widget instance
 * whose id no longer exists in the registry (e.g. a stale link after a
 * widget was renamed or removed). */
export function decodeLayout(encoded: string): DecodeResult {
  const json = LZString.decompressFromEncodedURIComponent(encoded)
  if (!json) return { ok: false, error: 'Could not read this share link.' }

  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { ok: false, error: 'This share link is corrupted.' }
  }

  const result = v.safeParse(LayoutSchema, parsed)
  if (!result.success) {
    return {
      ok: false,
      error: "This share link doesn't match a dashboard layout.",
    }
  }

  const widgets = result.output.widgets.filter((widget) =>
    getWidgetDefinition(widget.widgetId),
  )
  return { ok: true, layout: { version: DASHBOARD_LAYOUT_VERSION, widgets } }
}
