import { lazy } from 'react'
import { KeyRound } from 'lucide-react'
import type { WidgetDefinition } from '@/widgets/types'

export const jwtDecoderDefinition: WidgetDefinition = {
  id: 'jwt-decoder',
  name: 'JWT Decoder',
  description: 'Decode a JWT header and payload (signature not verified)',
  category: 'security',
  icon: KeyRound,
  defaultSize: { w: 4, h: 3 },
  minSize: { w: 3, h: 3 },
  component: lazy(() => import('./JwtDecoderWidget')),
  keywords: ['jwt', 'json web token', 'decode', 'auth'],
}
