/** A single widget placed on the dashboard: which widget it is, and its
 * position/size in grid units. This is exactly what gets persisted and
 * shared — never the widget's own internal/live state. */
export interface DashboardWidgetInstance {
  instanceId: string
  widgetId: string
  x: number
  y: number
  w: number
  h: number
}

export const DASHBOARD_LAYOUT_VERSION = 1 as const

/** Shape of a dashboard layout as persisted to localStorage or encoded into
 * a share URL. `version` allows safe schema migration later. */
export interface DashboardLayoutV1 {
  version: typeof DASHBOARD_LAYOUT_VERSION
  widgets: DashboardWidgetInstance[]
}
