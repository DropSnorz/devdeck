'use client'

import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'

function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({ className, children, ...props }: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cn(
        'group flex w-full cursor-pointer items-center justify-between gap-2 text-left text-muted-foreground hover:text-foreground',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown className="size-3.5 shrink-0 transition-transform duration-150 group-data-panel-open:rotate-180" />
    </CollapsiblePrimitive.Trigger>
  )
}

function CollapsibleContent({ className, ...props }: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-content"
      className={cn('overflow-hidden', className)}
      {...props}
    />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
