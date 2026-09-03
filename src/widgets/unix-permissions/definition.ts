import { lazy } from 'react'
import { FileLock2 } from 'lucide-react'
import type { WidgetDefinition } from '@/widgets/types'

export const unixPermissionsDefinition: WidgetDefinition = {
  id: 'unix-permissions',
  name: 'Unix Permissions',
  description: 'Compute and analyze chmod permissions: octal, symbolic notation, and security warnings',
  category: 'security',
  icon: FileLock2,
  defaultSize: { w: 4, h: 5 },
  minSize: { w: 3, h: 4 },
  component: lazy(() => import('./UnixPermissionsWidget')),
  keywords: [
    'unix',
    'linux',
    'permissions',
    'chmod',
    'chown',
    'octal',
    'symbolic',
    'rwx',
    'setuid',
    'setgid',
    'sticky bit',
    'file mode',
  ],
}
