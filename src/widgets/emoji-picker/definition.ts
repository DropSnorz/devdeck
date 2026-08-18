import { lazy } from 'react'
import { Smile } from 'lucide-react'
import type { WidgetDefinition } from '@/widgets/types'

export const emojiPickerDefinition: WidgetDefinition = {
  id: 'emoji-picker',
  name: 'Emoji Picker',
  description: 'Search emoji and copy them to the clipboard',
  category: 'text',
  icon: Smile,
  defaultSize: { w: 3, h: 4 },
  minSize: { w: 2, h: 3 },
  component: lazy(() => import('./EmojiPickerWidget')),
  keywords: ['emoji', 'emoticon', 'smiley', 'unicode', 'picker'],
}
