# DevDeck

A client-side browser toolbox for developers — a widget dashboard that puts everyday dev
utilities (Base64, JSON formatting, JWT decoding, color conversion, hashing, and more) in one
customizable, shareable screen.

## Highlights

- **Dashboard**: assemble widgets on a resizable, snap-to-grid layout. Drag/resize on
  desktop and tablet; a read-only stacked view on phones.
- **Save & share**: layouts persist to `localStorage` and can be shared via URL or QR code
  (widget layout only — not live widget content). Opening a shared link always asks before
  replacing your local dashboard.
- **Wide-screen mode**: expand any pinned widget to fill the screen without losing what
  you typed — or launch a tool that isn't on your dashboard at all from the tool browser or
  the command palette (`Cmd/Ctrl+K`).
- **Keyboard-accessible**: every widget has a "move/resize" dialog as a typed alternative
  to dragging.
- **100% client-side**: no backend, installable as a PWA, works offline.

## Widgets

UUID Generator, Base64, URL Encoder, Timestamp Converter, JSON Formatter, Color Converter,
Hash Generator (MD5/SHA-1/256/384/512), JWT Decoder, Regex Tester, Text Case Converter.

## Alternatives

There are already plenty of great developer utility tools out there, covering everything from Base64 and JSON to colors, timestamps, JWTs, and more. But as the table below shows, we found that none quite fit the way we wanted to work. **Context switching** between tools means losing focus, finding the next tool, and getting back into what you were doing. These small interruptions add up and make simple tasks feel more complicated than they need to be. We wanted a simpler experience: **keep several tools open at once, move naturally between them, and keep the context of your work in one place.**

| Alternative                                          | Tool coverage | Local-first | Web app | Persistent workspace | Multiple tools simultaneously | License        |
| ---------------------------------------------------- | ------------: | ----------: | ------: | -------------------: | ----------------------------: | -------------- |
| [DevToys](https://devtoys.app/)                      |            🟢 |          🟢 |      🔴 |                   🔴 |                            🔴 | 🟢 MIT         |
| [DevUtils](https://devutils.com/)                    |            🟢 |          🟢 |      🔴 |                   🔴 |                            🔴 | 🔴 Proprietary |
| [devutils.sh](https://devutils.sh/)                  |            🟢 |          🟢 |      🟢 |                   🔴 |                            🔴 | ❓             |
| [NextDevTools](https://www.nextdevtools.com/)        |            🟢 |          🟢 |      🟢 |                   🔴 |                            🟡 | ❓             |
| [SafeUtils](https://safeutils.com/)                  |            🟢 |          🟢 |      🔴 |                   🔴 |                            🔴 | 🔴 Proprietary |
| [Boop](https://github.com/IvanMathy/Boop)            |            🟢 |          🟢 |      🔴 |                   🟡 |                            🔴 | 🟢 MIT         |
| [Devly](https://devly.techfixpro.net/)               |            🟢 |          🟢 |      🔴 |                   🔴 |                            🟡 | 🔴 Proprietary |
| [DevToolGrid](https://devtoolgrid.com/)              |            🟡 |          🟢 |      🟢 |                   🔴 |                            🔴 | ❓             |
| [Detools-it](https://detools-it.com/)                |            🟡 |          🟢 |      🟢 |                   🔴 |                            🔴 | ❓             |
| [devdeck.ir](https://devdeck.ir/)                    |            🟢 |          🟢 |      🟢 |                   🔴 |                            🔴 | ❓             |
| [IT-Tools](https://it-tools.tech/)                   |            🟢 |          🟢 |      🟢 |                   🔴 |                            🔴 | 🟢 GPL-3.0     |
| [CyberChef](https://gchq.github.io/CyberChef/)       |            🟢 |          🟢 |      🟢 |                   🟡 |                            🟡 | 🟢 Apache-2.0  |
| [DevTools-X](https://github.com/fosslife/devtools-x) |            🟢 |          🟢 |      🔴 |                   🔴 |                            🔴 | 🟢 MIT         |
| [Open Dev](https://github.com/Jamalianpour/open-dev) |            🟢 |          🟢 |      🟢 |                   🔴 |                            🔴 | 🟢 MIT         |
| **This concept**                                     |            🟢 |          🟢 |      🟢 |                   🟢 |                            🟢 | **TBD**        |

## Development

```sh
npm install
npm run dev
```

## Scripts

| Script                 | Description                              |
| ---------------------- | ---------------------------------------- |
| `npm run dev`          | Start the Vite dev server                |
| `npm run build`        | Type-check and build for production      |
| `npm run preview`      | Preview the production build locally     |
| `npm run lint`         | Lint the codebase with ESLint            |
| `npm run format`       | Format the codebase with Prettier        |
| `npm run format:check` | Check formatting without writing changes |
| `npm run test`         | Run the test suite once                  |
| `npm run test:watch`   | Run the test suite in watch mode         |

## Architecture

```
src/
  dashboard/       # grid, toolbar, zustand store, localStorage persistence, share/QR flow
  widgets/          # one folder per widget: definition.ts (registry metadata) + <Name>Widget.tsx
  widget-shell/      # common chrome every widget renders inside (title bar, expand/remove,
                       error boundary, keyboard move/resize dialog)
  overlay/           # fullscreen expand mechanism (portal-based, state-preserving)
  tool-browser/       # searchable catalog of every widget
  command-palette/    # Cmd/Ctrl+K launcher
  components/, lib/, hooks/, types/
```

**Widget registry** (`src/widgets/registry.ts`) is the single source of truth every other
piece of UI reads from — the dashboard grid, the tool browser, and the command palette never
duplicate widget metadata. Each widget's actual component is `React.lazy`-loaded, so adding a
widget never bloats another widget's bundle; `npm run build`'s per-file chunk output is worth
scanning after adding one to confirm it split out cleanly.

**Expand-to-fullscreen** works by portaling a pinned widget's rendered content between its
grid cell and a shared overlay slot — the portal _target_ changes, not whether the content is
portaled at all, which is what keeps the widget mounted (and its state intact) across the
transition. See `src/dashboard/PortalableWidget.tsx` and `src/overlay/WidgetOverlay.tsx`.

## Status

All planned milestones (M1–M7) are implemented: dashboard shell, widget registry, drag/resize
grid with persistence, the full widget set, URL + QR sharing, fullscreen expand, tool
browser, command palette, and a test suite covering the share-link codec, the widget
registry, the dashboard store, error isolation, and the command palette.

Not yet done, worth doing next: code-splitting the app-shell chrome (command palette, tool
browser, share modal) the same way widgets are split, a proper focus trap in the modal
dialogs, and multi-dashboard support if that's ever wanted.
