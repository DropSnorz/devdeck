import { lazy } from 'react'
import { ScanSearch } from 'lucide-react'
import type { WidgetDefinition } from '@/widgets/types'

export const contentTypeDetectorDefinition: WidgetDefinition = {
  id: 'content-type-detector',
  name: 'Content Type Detector',
  description: 'Guess what a blob of text is — Base64, hex, JWT, JSON, UUID… even nested',
  category: 'text',
  icon: ScanSearch,
  defaultSize: { w: 2, h: 3 },
  minSize: { w: 2, h: 2 },
  component: lazy(() => import('./ContentTypeDetectorWidget')),
  keywords: ['detect', 'autodetect', 'identify', 'sniff', 'base64', 'hex', 'jwt', 'json', 'uuid', 'encoding', 'format'],
}
