import type { ReactNode } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { SegmentedControl } from '@/components/SegmentedControl'
import { useThemeStore, type Theme } from './useThemeStore'

const OPTIONS: { label: ReactNode; value: Theme; ariaLabel: string }[] = [
  {
    label: <Monitor className="size-3.5" />,
    value: 'system',
    ariaLabel: 'Use system theme',
  },
  {
    label: <Sun className="size-3.5" />,
    value: 'light',
    ariaLabel: 'Use light theme',
  },
  {
    label: <Moon className="size-3.5" />,
    value: 'dark',
    ariaLabel: 'Use dark theme',
  },
]

export function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme)
  const setTheme = useThemeStore((state) => state.setTheme)

  return (
    <SegmentedControl value={theme} onChange={setTheme} options={OPTIONS} />
  )
}
