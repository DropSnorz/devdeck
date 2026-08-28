import { create } from 'zustand'
import { useMediaQuery } from '@/hooks/useMediaQuery'

export type Theme = 'light' | 'dark' | 'system'

/** Must match the key the anti-flash bootstrap script in index.html reads. */
const STORAGE_KEY = 'localgrid.theme'

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system'
}

function readStoredTheme(): Theme {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return isTheme(stored) ? stored : 'system'
}

function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolveIsDark(theme: Theme): boolean {
  return theme === 'system' ? prefersDark() : theme === 'dark'
}

/** Applies the resolved theme to the document — the `.dark` class Tailwind's
 * `dark:` variant now keys off of (see index.css), plus `color-scheme` so
 * native form controls and scrollbars follow the explicit choice too,
 * rather than only ever following the OS setting. */
function applyTheme(theme: Theme) {
  const isDark = resolveIsDark(theme)
  document.documentElement.classList.toggle('dark', isDark)
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
}

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: readStoredTheme(),
  setTheme: (theme) => {
    window.localStorage.setItem(STORAGE_KEY, theme)
    applyTheme(theme)
    set({ theme })
  },
}))

// The index.html bootstrap script already applied *a* theme before paint to
// avoid a flash, but re-apply here in case the two ever drift, and to pick
// up `color-scheme` if that script's try/catch swallowed an error.
applyTheme(useThemeStore.getState().theme)

// Keep the resolved theme in sync with OS-level changes while the user has
// explicitly chosen "system" rather than overriding it.
window
  .matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', () => {
    if (useThemeStore.getState().theme === 'system') {
      applyTheme('system')
    }
  })

/** The live resolved light/dark boolean — reactive to both an explicit
 * theme choice *and* OS-level changes while on "system", unlike reading
 * `theme` alone. For anything that needs to pick between two JS-level style
 * objects rather than reaching for Tailwind's `dark:` variant — e.g.
 * react-json-view-lite's `darkStyles`/`defaultStyles`, which the `.dark`
 * class has no effect on. */
export function useIsDarkTheme(): boolean {
  const theme = useThemeStore((state) => state.theme)
  const systemPrefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  return theme === 'system' ? systemPrefersDark : theme === 'dark'
}
