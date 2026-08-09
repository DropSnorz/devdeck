import LZString from 'lz-string'
import * as v from 'valibot'
import { getWidgetDefinition } from '@/widgets/registry'
import {
  DASHBOARD_LAYOUT_VERSION,
  WORKSPACE_LAYOUT_VERSION,
  type Dashboard,
  type WorkspaceLayoutV2,
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

const DashboardSchema = v.object({
  id: v.string(),
  name: v.string(),
  widgets: v.array(WidgetInstanceSchema),
})

const WorkspaceSchema = v.object({
  version: v.literal(WORKSPACE_LAYOUT_VERSION),
  dashboards: v.array(DashboardSchema),
  activeDashboardId: v.string(),
})

// Pre-tabs share-link shape — links generated before multi-dashboard support
// existed should still open, not error.
const LegacyLayoutSchema = v.object({
  version: v.literal(DASHBOARD_LAYOUT_VERSION),
  widgets: v.array(WidgetInstanceSchema),
})

/** Workspace JSON -> compressed, URL-safe string for the `#layout=` fragment. */
export function encodeWorkspace(dashboards: Dashboard[], activeDashboardId: string): string {
  const payload: WorkspaceLayoutV2 = {
    version: WORKSPACE_LAYOUT_VERSION,
    dashboards,
    activeDashboardId,
  }
  return LZString.compressToEncodedURIComponent(JSON.stringify(payload))
}

export type DecodeResult =
  | { ok: true; workspace: WorkspaceLayoutV2 }
  | { ok: false; error: string }

/** Drops any widget instance whose id no longer exists in the registry
 * (e.g. a stale link after a widget was renamed or removed), and repairs
 * `activeDashboardId` if it doesn't point at a surviving dashboard. */
function finalizeWorkspace(workspace: WorkspaceLayoutV2): DecodeResult {
  const dashboards = workspace.dashboards.map((dashboard) => ({
    ...dashboard,
    widgets: dashboard.widgets.filter((widget) => getWidgetDefinition(widget.widgetId)),
  }))
  if (dashboards.length === 0) {
    return { ok: false, error: "This share link doesn't contain any dashboards." }
  }
  const activeDashboardId = dashboards.some((dashboard) => dashboard.id === workspace.activeDashboardId)
    ? workspace.activeDashboardId
    : dashboards[0].id
  return {
    ok: true,
    workspace: { version: WORKSPACE_LAYOUT_VERSION, dashboards, activeDashboardId },
  }
}

/** Reverses `encodeWorkspace`, validating the untrusted result before it's
 * allowed to reach the dashboard store. */
export function decodeWorkspace(encoded: string): DecodeResult {
  const json = LZString.decompressFromEncodedURIComponent(encoded)
  if (!json) return { ok: false, error: 'Could not read this share link.' }

  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { ok: false, error: 'This share link is corrupted.' }
  }

  const workspaceResult = v.safeParse(WorkspaceSchema, parsed)
  if (workspaceResult.success) {
    return finalizeWorkspace(workspaceResult.output)
  }

  const legacyResult = v.safeParse(LegacyLayoutSchema, parsed)
  if (legacyResult.success) {
    return finalizeWorkspace({
      version: WORKSPACE_LAYOUT_VERSION,
      dashboards: [{ id: 'shared', name: 'Shared', widgets: legacyResult.output.widgets }],
      activeDashboardId: 'shared',
    })
  }

  return { ok: false, error: "This share link doesn't match a dashboard layout." }
}
