/** localStorage key the dashboard's zustand store persists under. Shared
 * with the share/URL flow, which reads/writes the same store.
 *
 * Version 2 moved from a single flat widget list to multiple named
 * dashboards — see the `migrate` option on `useDashboardStore`'s `persist`
 * config, which upgrades a v1-shaped stored value in place rather than
 * discarding it. */
export const DASHBOARD_STORAGE_KEY = 'localgrid.dashboard'
export const DASHBOARD_STORAGE_VERSION = 2
