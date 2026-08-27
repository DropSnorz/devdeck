import type { ReactNode } from 'react'
import { ArrowRight, LayoutGrid, Maximize2, Share2, WifiOff, type LucideIcon } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { AstreliteMark } from '@/components/AstreliteMark'
import { Logomark } from '@/components/Logomark'
import { cn } from '@/lib/utils'

/** The marketing/About page, linked from the dashboard's logo (see
 * Dashboard.tsx). Deliberately imports nothing from @/dashboard, @/widgets,
 * @/overlay, or @/command-palette — this page ships as its own small bundle
 * via a separate Vite entry (about.html), independent of the
 * dashboard's much heavier dependency tree. Copy mirrors README.md's "Why
 * localgrid" / "Features" sections. */
export function AboutPage() {
  return (
    <div className="mx-auto flex min-h-svh max-w-2xl flex-col gap-14 px-6 py-16">
      <header className="flex flex-col items-center gap-6 text-center">
        <h1 className="flex items-center gap-2 font-mono text-2xl font-medium tracking-tight">
          <Logomark className="size-8 text-foreground" />
          <span>
            localgrid<span className="text-muted-foreground">.dev</span>
          </span>
        </h1>
        <p className="max-w-md text-lg text-muted-foreground">
          A browser-based dashboard for everyday developer tools.
        </p>
        <a href={import.meta.env.BASE_URL} className={cn(buttonVariants({ size: 'lg' }))}>
          Jump to dashboard
          <ArrowRight className="size-4" />
        </a>
      </header>

      <section className="flex flex-col gap-4 border-t border-border pt-10">
        <h2 className="text-sm font-medium tracking-tight text-foreground">Why localgrid</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Plenty of good developer-utility sites already exist, covering Base64, JSON, colors,
          timestamps, JWTs, and everything else on this list. What none of them solve is context
          switching: opening a new tool means a new tab, losing your place, and finding your way
          back to what you were doing. Those small interruptions add up when you are debugging.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          localgrid instead treats tools as widgets on a persistent dashboard. Pin the five or six
          you reach for constantly, arrange them however fits your screen, and keep working across
          all of them at once without losing state or hunting for the next tab.
        </p>
      </section>

      <section className="flex flex-col gap-6 border-t border-border pt-10">
        <h2 className="text-sm font-medium tracking-tight text-foreground">Features</h2>
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
          <Feature icon={WifiOff} title="Client-side, offline, installable">
            No backend, no account, nothing you paste ever leaves your browser. localgrid
            installs as a PWA and keeps working without a connection.
          </Feature>
          <Feature icon={LayoutGrid} title="A layout that's actually yours">
            Widgets live on a resizable, snap-to-grid dashboard. Drag and resize on desktop or
            tablet; phones get a clean read-only stacked view instead.
          </Feature>
          <Feature icon={Maximize2} title="Expand without losing your place">
            Any pinned widget can fill the screen for focused work, and switching back leaves
            everything you typed exactly where it was.
          </Feature>
          <Feature icon={Share2} title="Save and share">
            Layouts persist to <code className="font-mono">localStorage</code> automatically, and
            can be shared with a teammate through a URL or QR code.
          </Feature>
        </div>
      </section>

      <footer className="mt-auto flex items-center justify-center gap-6 border-t border-border pt-8 text-xs text-muted-foreground">
        <a
          href="https://github.com/DropSnorz/localgrid.dev"
          target="_blank"
          rel="noreferrer"
          className="hover:text-foreground"
        >
          GitHub
        </a>
        <a
          href="https://astrelite.com"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 hover:text-foreground"
        >
          <AstreliteMark className="size-3" />
          Astrelite
        </a>
      </footer>
    </div>
  )
}

function Feature({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  )
}
