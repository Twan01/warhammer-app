---
phase: 01-app-shell
plan: "01"
subsystem: ui
tags: [tauri, react, typescript, vite, tailwindcss, shadcn, dark-mode]

requires: []

provides:
  - Tauri 2.x + React 19 + TypeScript + Vite project scaffold
  - Tailwind v4 with zinc-950 dark-mode-first CSS custom properties
  - FOUC-prevention inline script in index.html
  - 19 shadcn/ui components in src/components/ui/
  - SETUP-08 folder structure with .gitkeep placeholders
  - shadcn cn() helper at src/lib/utils.ts
  - HobbyForge-titled 1280x800 Tauri window (900x600 minimum)

affects:
  - 01-02 (SQLite setup — can use src/db/ folder and tauri.conf.json)
  - 01-03 (AppSidebar — uses src/components/ui/sidebar.tsx and all other shadcn components)
  - All future phases (TypeScript path alias @/* resolves to ./src/*)

tech-stack:
  added:
    - "@tauri-apps/api ^2.0.0 (2.10.1 installed)"
    - "@tauri-apps/cli ^2.0.0 (2.10.1 installed)"
    - "react ^19.0.0 (19.2.5 installed)"
    - "react-dom ^19.0.0 (19.2.5 installed)"
    - "tailwindcss 4.2.4 (pinned)"
    - "@tailwindcss/vite 4.2.4 (pinned)"
    - "tw-animate-css 1.4.0"
    - "lucide-react ^0.460.0 (0.460.0 installed)"
    - "clsx ^2.1.1 (2.1.1 installed)"
    - "tailwind-merge ^2.5.4 (2.6.1 installed)"
    - "shadcn/ui CLI — generated: class-variance-authority, radix-ui, vaul, cmdk, sonner, react-hook-form, @hookform/resolvers, zod, next-themes"
    - "@types/node 25.6.0 (added for vite.config.ts path alias)"
  patterns:
    - "CSS-first Tailwind v4 — no tailwind.config.js, all theme in @theme block in globals.css"
    - "Dark-mode via .dark class on <html>, applied via blocking inline script in <head>"
    - "shadcn components copied into src/components/ui/ (not imported from npm package)"
    - "Path alias @/* resolves to ./src/* via vite.config.ts resolve.alias + tsconfig paths"

key-files:
  created:
    - "index.html — FOUC-prevention inline dark class script as first child of <head>"
    - "src/styles/globals.css — Tailwind v4 import + zinc dark-mode CSS custom properties"
    - "src/lib/utils.ts — shadcn cn() helper (clsx + tailwind-merge)"
    - "src/App.tsx — smoke-test component with bg-background + text-foreground Tailwind classes"
    - "src/main.tsx — React 19 entry point importing globals.css"
    - "components.json — shadcn CLI config (new-york style, zinc base, 0.5rem radius)"
    - "vite.config.ts — @tailwindcss/vite plugin, port 1420, @/* path alias"
    - "tsconfig.json — TypeScript config with @/* path alias"
    - "package.json — pinned dependency manifest"
    - "src-tauri/tauri.conf.json — HobbyForge title, 1280x800 window, 900x600 minimum"
    - "src/components/ui/*.tsx — 19 shadcn components (table, dialog, sheet, drawer, badge, progress, select, form, command, sonner, card, tabs, sidebar, tooltip, popover, button, skeleton, separator, input)"
  modified: []

key-decisions:
  - "01-01: Rust not pre-installed — auto-installed via winget (Rustlang.Rustup v1.29.0, installed Rust 1.95.0) as Rule 3 blocking fix"
  - "01-01: pnpm not pre-installed — auto-installed via npm install -g pnpm (10.33.2) as Rule 3 blocking fix"
  - "01-01: create-tauri-app rejects non-empty directories — scaffolded in /tmp/hobbyforge-scaffold and merged files into project root (preserving .planning/, CLAUDE.md, ROADMAP.txt, .git/, .claude/)"
  - "01-01: @types/node added to devDependencies and tsconfig.node.json types field — required for path module in vite.config.ts (Rule 2 missing critical)"
  - "01-01: shadcn CLI added extra packages beyond plan spec (react-hook-form, zod, @hookform/resolvers, next-themes, radix-ui, cmdk) — these are shadcn dependencies, not forbidden dependencies"
  - "01-01: shadcn CLI added label.tsx and use-mobile.ts (not in plan's file list) — sidebar component dependency, not excluded"

patterns-established:
  - "Dark-mode: Always use blocking inline script in <head> before any stylesheet — never React useEffect"
  - "Tailwind v4: Use @theme inline block in globals.css for CSS custom property mapping"
  - "shadcn: All components batch-installed in one session to prevent Radix version drift (Pitfall 12)"
  - "TypeScript: Path alias @/* configured in both vite.config.ts resolve.alias AND tsconfig.json paths"

requirements-completed: [SETUP-01, SETUP-04, SETUP-08, POLISH-06]

duration: 9min
completed: "2026-04-30"
---

# Phase 01 Plan 01: App Shell Scaffold Summary

**Tauri 2.x + React 19 + Tailwind v4 dark-mode-first zinc-950 shell with 19 shadcn/ui components batch-installed and FOUC-free cold launch**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-30T10:00:26Z
- **Completed:** 2026-04-30T10:09:59Z
- **Tasks:** 1
- **Files modified:** 74 (19 shadcn CLI-generated + 6 Tauri scaffold-generated + 49 authored)

## Accomplishments

- Tauri 2.x + React 19 + TypeScript + Vite app shell is scaffolded and TypeScript-clean
- Dark-mode launches without white flash — inline script applies `.dark` class before any CSS loads
- All 19 shadcn/ui components are installed in one batch session (prevents Pitfall 12 Radix version drift)
- Full SETUP-08 folder structure created with .gitkeep placeholders

## Pinned Versions Installed

| Package | Requested | Installed |
|---------|-----------|-----------|
| Tauri Rust crate | 2.x | from create-tauri-app scaffold |
| @tauri-apps/api | ^2.0.0 | 2.10.1 |
| @tauri-apps/cli | ^2.0.0 | 2.10.1 |
| react | ^19.0.0 | 19.2.5 |
| tailwindcss | 4.2.4 | 4.2.4 (pinned) |
| @tailwindcss/vite | 4.2.4 | 4.2.4 (pinned) |
| tw-animate-css | latest | 1.4.0 |
| lucide-react | ^0.460.0 | 0.460.0 |
| typescript | ^5.6.3 | 5.9.3 |
| vite | ^6.0.0 | 6.4.2 |

## shadcn Component File Locations

All 19 components landed in `src/components/ui/`:
`table.tsx`, `dialog.tsx`, `sheet.tsx`, `drawer.tsx`, `badge.tsx`, `progress.tsx`, `select.tsx`, `form.tsx`, `command.tsx`, `sonner.tsx`, `card.tsx`, `tabs.tsx`, `sidebar.tsx`, `tooltip.tsx`, `popover.tsx`, `button.tsx`, `skeleton.tsx`, `separator.tsx`, `input.tsx`

shadcn CLI also created: `src/components/ui/label.tsx` (sidebar dependency) and `src/hooks/use-mobile.ts` (sidebar dependency).

## Task Commits

1. **Task 1: Scaffold Tauri + React + Tailwind v4 + shadcn** - `9c74ffb` (feat)

**Plan metadata:** TBD (docs commit to follow)

## Files Created

- `index.html` — FOUC-prevention inline dark script as first child of `<head>`
- `src/styles/globals.css` — Tailwind v4 import + zinc dark-mode CSS custom properties + sidebar tokens
- `src/lib/utils.ts` — shadcn `cn()` helper
- `src/App.tsx` — smoke-test component
- `src/main.tsx` — React 19 entry importing globals.css
- `components.json` — shadcn CLI config (new-york, zinc, 0.5rem)
- `vite.config.ts` — @tailwindcss/vite plugin, port 1420, @/* alias
- `tsconfig.json` — @/* path alias
- `tsconfig.node.json` — types: [node] for vite.config.ts
- `package.json` — pinned dependency manifest
- `src-tauri/tauri.conf.json` — HobbyForge title, 1280x800, min 900x600
- `src/components/ui/*.tsx` — 21 shadcn files total
- `src/app/{dashboard,collection,painting-projects,recipes,paints,settings}/.gitkeep`
- `src/components/{common,forms}/.gitkeep`
- `src/{features,db/queries,hooks,types,utils}/.gitkeep`

## Decisions Made

- Rust installed via winget (Rustlang.Rustup) — not pre-installed on this machine
- pnpm installed via `npm install -g pnpm` — not pre-installed on this machine
- create-tauri-app scaffolded in /tmp then merged to avoid "non-empty directory" rejection
- `@types/node` added as devDependency — required for `path` module in vite.config.ts
- shadcn CLI added label.tsx and use-mobile.ts automatically (sidebar's transitive deps)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Rust not installed — installed via winget**
- **Found during:** Task 1 (scaffold step)
- **Issue:** `rustc` not found in PATH — Tauri requires Rust for the native backend
- **Fix:** Ran `winget install --id Rustlang.Rustup -e --accept-package-agreements` — installed Rust 1.95.0
- **Files modified:** None (system-level installation)
- **Verification:** `rustc --version` returns 1.95.0, `cargo --version` returns 1.95.0

**2. [Rule 3 - Blocking] pnpm not installed — installed via npm**
- **Found during:** Task 1 (scaffold step)
- **Issue:** `pnpm` not found in PATH
- **Fix:** Ran `npm install -g pnpm` — installed pnpm 10.33.2
- **Files modified:** None (system-level installation)
- **Verification:** `pnpm --version` returns 10.33.2

**3. [Rule 3 - Blocking] create-tauri-app rejects non-empty directory**
- **Found during:** Task 1 (scaffold step — project directory has .planning/, CLAUDE.md etc.)
- **Issue:** CLI outputs "Directory is not empty, Operation Cancelled"
- **Fix:** Scaffolded in /tmp/hobbyforge-scaffold, then manually copied files to project root preserving .planning/, CLAUDE.md, ROADMAP.txt, .git/, .claude/, .vibeyardignore
- **Files modified:** All scaffold files copied individually
- **Verification:** All files present in project root

**4. [Rule 2 - Missing Critical] @types/node not in original plan, needed for vite.config.ts**
- **Found during:** Task 1 (TypeScript compilation check)
- **Issue:** vite.config.ts uses `path` from `node:path` — TypeScript couldn't resolve the module without @types/node
- **Fix:** `pnpm add -D @types/node` + added `"types": ["node"]` to tsconfig.node.json
- **Files modified:** package.json, tsconfig.node.json
- **Verification:** `pnpm exec tsc --noEmit` exits 0

---

**Total deviations:** 4 auto-fixed (2 Rule 3 blocking installs, 1 Rule 3 blocking workaround, 1 Rule 2 missing critical)
**Impact on plan:** All auto-fixes were necessary infrastructure — Rust, pnpm, and @types/node are prerequisites. create-tauri-app workaround required by CLI design. No scope creep.

## Dark Mode Verification

The FOUC fix is confirmed correct by line order in index.html:
- Line 4: `<script>document.documentElement.classList.add('dark')</script>`
- Line 6: `<link rel="icon" ...>` (non-stylesheet link, no FOUC risk)
- Line 12: `<script type="module" src="/src/main.tsx"></script>`

The dark zinc-950 tokens are in `.dark {}` block with `--background: 240 10% 3.9%` and `--foreground: 0 0% 98%`. Tailwind `@theme inline` maps these to `--color-background: hsl(var(--background))` etc. App.tsx uses `bg-background` and `text-foreground` Tailwind classes.

## Issues Encountered

- Rust not pre-installed — resolved via winget (see Deviations)
- pnpm not pre-installed — resolved via npm global install (see Deviations)
- create-tauri-app non-empty directory rejection — worked around via temp directory scaffold (see Deviations)
- esbuild build scripts ignored by pnpm (warning) — expected behavior with pnpm's security-conscious approach, does not affect development or build

## User Setup Required

None — no external service configuration required.

The Tauri development environment is now ready. To launch the app:
```bash
pnpm tauri dev
```
Note: First run will compile Rust dependencies (~2-5 minutes). Subsequent runs are faster.

## Next Phase Readiness

- Plan 01-02 (SQLite + Drizzle setup) can begin: `src/db/queries/` folder exists, `src-tauri/tauri.conf.json` is configured
- Plan 01-03 (AppSidebar + routing) can begin: `src/components/ui/sidebar.tsx` is installed with full SidebarProvider/Sidebar/SidebarContent/SidebarMenu/SidebarMenuItem/SidebarMenuButton exports
- All 19 shadcn components importable via `@/components/ui/` path alias

---
*Phase: 01-app-shell*
*Completed: 2026-04-30*
