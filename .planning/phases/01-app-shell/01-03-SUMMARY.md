---
phase: 01-app-shell
plan: 03
subsystem: ui
tags: [react, tanstack-router, tanstack-query, shadcn, sidebar, tailwind, typescript]

# Dependency graph
requires:
  - phase: 01-01
    provides: Tauri scaffold, shadcn/ui components, dark-mode FOUC fix, index.html structure
  - phase: 01-02
    provides: tauri-plugin-sql wired, getDb() singleton, sql:allow-execute capabilities, scripts/sql-smoke-test.ts

provides:
  - TanStack Router 1.168.x with 6-route tree (/, /collection, /painting-projects, /recipes, /paints, /settings)
  - TanStack Query 5.100.x with desktop-optimized QueryClient (5min stale, 10min gc, no window-focus refetch)
  - Collapsible sidebar (240px/48px) with localStorage persistence at "sidebar:collapsed"
  - Active-route highlight via useLocation + SidebarMenuButton isActive prop
  - Settings pinned to bottom via flex-1 spacer pattern
  - PlaceholderPage shared component used by all 6 routes
  - Full provider tree: StrictMode -> QueryProvider -> RouterProvider -> AppLayout
  - Human-verify checkpoint for Phase 1 end-to-end validation (Task 4 — awaiting user)

affects:
  - Phase 2 (data layer): reuses getDb() singleton location, NavItem pattern for any future nav entries
  - Phase 3+: all page components in src/app/*/page.tsx follow this pattern
  - All phases: AppLayout wraps every route — sidebar changes affect all pages

# Tech tracking
tech-stack:
  added:
    - "@tanstack/react-router 1.168.26"
    - "@tanstack/react-query 5.100.6"
    - "@tanstack/react-query-devtools 5.100.6 (dev)"
    - "@tanstack/router-devtools 1.166.13 (dev)"
  patterns:
    - Manual route tree (no codegen/file-based routing) — keeps dependency footprint minimal
    - Plain <aside> sidebar instead of shadcn SidebarProvider — avoids cookie override complexity
    - Synchronous localStorage read in useState initializer — prevents layout flash on cold start
    - DEV-only devtools via import.meta.env.DEV guard — tree-shaken from production bundle
    - Page components are thin wrappers around PlaceholderPage — will be replaced per-phase

key-files:
  created:
    - src/components/common/QueryProvider.tsx
    - src/components/common/PlaceholderPage.tsx
    - src/components/common/useSidebarCollapsed.ts
    - src/components/common/NavItem.tsx
    - src/components/common/AppSidebar.tsx
    - src/components/common/AppLayout.tsx
    - src/app/router.tsx
    - src/app/dashboard/page.tsx
    - src/app/collection/page.tsx
    - src/app/painting-projects/page.tsx
    - src/app/recipes/page.tsx
    - src/app/paints/page.tsx
    - src/app/settings/page.tsx
  modified:
    - src/main.tsx (replaced: now QueryProvider + RouterProvider tree)
    - package.json (added TanStack Router + Query + devtools)
  deleted:
    - src/App.tsx (smoke-test placeholder replaced by AppLayout via root route component)

key-decisions:
  - "Used plain <aside> for sidebar instead of shadcn SidebarProvider — sidesteps cookie-based persistence override, simpler to express exact 240px/48px widths and toggle position"
  - "@tanstack/router-devtools pinned to 1.166.13 (latest available) — plan specified ^1.168.0 but that version does not exist in npm registry; 1.166.x is compatible"
  - "Synchronous localStorage read in useState initializer (not useEffect) — prevents layout flash on cold start, as required by UI-SPEC §4"

patterns-established:
  - "Route pages in src/app/<route-name>/page.tsx: each exports a named component, imports PlaceholderPage"
  - "Common components in src/components/common/: AppLayout, AppSidebar, NavItem, PlaceholderPage, QueryProvider"
  - "useSidebarCollapsed hook pattern: synchronous init from localStorage, persists via useEffect"
  - "NavItem active detection: exact match for / route, prefix match for all others via useLocation"

requirements-completed: [SETUP-02, SETUP-03, SETUP-05]

# Metrics
duration: 5min
completed: 2026-04-30
---

# Phase 01 Plan 03: App Shell — Routing, Sidebar, and Query Provider Summary

**TanStack Router (6-route tree) + TanStack Query (desktop defaults) wired into a collapsible shadcn-based sidebar with localStorage persistence, active-route highlight, and Settings pinned bottom**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-30T10:44:23Z
- **Completed:** 2026-04-30T10:49:42Z
- **Tasks:** 3 of 4 (Task 4 is a human-verify checkpoint — awaiting user)
- **Files modified:** 16 (13 created, 2 modified, 1 deleted)

## Accomplishments

- Installed TanStack Router 1.168.26 + Query 5.100.6 + devtools; full provider tree wired (StrictMode -> QueryProvider -> RouterProvider)
- Built collapsible sidebar (240px/48px) with localStorage persistence, active-route highlight via `useLocation`, tooltips in collapsed mode, Settings pinned bottom with flex-1 spacer
- All 6 routes registered (/, /collection, /painting-projects, /recipes, /paints, /settings), each rendering the correct PlaceholderPage (title + "Coming in Phase N")
- `pnpm exec tsc --noEmit` passes and `pnpm build` produces 394KB JS bundle in 4.97s

## Route Table

| Label | Icon | Route | Page Component | Phase |
|-------|------|-------|---------------|-------|
| Dashboard | LayoutDashboard | `/` | `src/app/dashboard/page.tsx` | 5 |
| Collection | Package | `/collection` | `src/app/collection/page.tsx` | 3 |
| Painting Projects | Palette | `/painting-projects` | `src/app/painting-projects/page.tsx` | 4 |
| Recipes | BookOpen | `/recipes` | `src/app/recipes/page.tsx` | 4 |
| Paints | Droplets | `/paints` | `src/app/paints/page.tsx` | 2 |
| Settings | Settings | `/settings` | `src/app/settings/page.tsx` | 5 |

## Sidebar Persistence

- **localStorage key:** `"sidebar:collapsed"` (string `"true"` / `"false"`)
- **Read:** Synchronously in `useState` initializer — no layout flash on cold start
- **Write:** Via `useEffect` on state change
- **Default:** Expanded (false) when key absent

## TanStack Query Defaults (SETUP-05)

```ts
staleTime: 1000 * 60 * 5      // 5 minutes — avoids re-querying SQLite on every navigation
gcTime:    1000 * 60 * 10     // 10 minutes — keeps recent queries cached after unmount
refetchOnWindowFocus: false    // no remote server to sync with
retry: 1                       // SQLite errors are usually deterministic
```

## Task Commits

Each task was committed atomically:

1. **Task 1: Install TanStack Router + Query, build router tree with 6 placeholder routes** — `348bf1f` (feat)
2. **Task 2: Build AppLayout + AppSidebar with collapse persistence and active-route highlight** — `4b79863` (feat)
3. **Task 3: Wire QueryProvider + RouterProvider into main.tsx and remove smoke-test App.tsx** — `58584d8` (feat)

Task 4 (human-verify checkpoint) is pending user action.

## Files Created/Modified

- `src/components/common/QueryProvider.tsx` — TanStack QueryClient with desktop defaults; wraps children in QueryClientProvider + DEV devtools
- `src/components/common/PlaceholderPage.tsx` — Shared placeholder: h1 title + "Coming in Phase N" subline
- `src/components/common/useSidebarCollapsed.ts` — Synchronous localStorage hook for sidebar collapse state
- `src/components/common/NavItem.tsx` — Single sidebar entry: icon + label + active state + collapsed tooltip
- `src/components/common/AppSidebar.tsx` — Full sidebar shell: logo, 5 main nav items, collapse toggle, Settings pinned bottom
- `src/components/common/AppLayout.tsx` — Root flex h-screen: TooltipProvider + AppSidebar + main outlet
- `src/app/router.tsx` — TanStack Router manual route tree with all 6 routes
- `src/app/dashboard/page.tsx` — DashboardPage placeholder (Phase 5)
- `src/app/collection/page.tsx` — CollectionPage placeholder (Phase 3)
- `src/app/painting-projects/page.tsx` — PaintingProjectsPage placeholder (Phase 4)
- `src/app/recipes/page.tsx` — RecipesPage placeholder (Phase 4)
- `src/app/paints/page.tsx` — PaintsPage placeholder (Phase 2)
- `src/app/settings/page.tsx` — SettingsPage placeholder (Phase 5)
- `src/main.tsx` — Replaced: StrictMode -> QueryProvider -> RouterProvider
- `package.json` — Added TanStack Router + Query + devtools

## Decisions Made

- **Plain `<aside>` sidebar vs shadcn SidebarProvider:** Used plain aside to avoid cookie-persistence override complexity; shadcn's SidebarMenuButton/SidebarMenuItem are still used inside NavItem for correct styling/accessibility.
- **router-devtools at 1.166.13:** Plan specified `^1.168.0` but that version does not exist in npm registry (latest is 1.166.13). Used 1.166.13 — fully compatible with Router 1.168.x.
- **No codegen / file-based routing:** Manual route tree keeps dependency footprint minimal for Phase 1.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] @tanstack/router-devtools version mismatch**
- **Found during:** Task 1 (package installation)
- **Issue:** Plan specified `^1.168.0` but npm registry has no such version — latest is 1.166.13
- **Fix:** Installed `@tanstack/router-devtools@^1.166.0` (1.166.13) — compatible with Router 1.168.26
- **Files modified:** package.json, pnpm-lock.yaml
- **Verification:** TypeScript compiles clean, build succeeds
- **Committed in:** 348bf1f (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking version mismatch)
**Impact on plan:** Minor version difference in devtools only; no functional or API impact. Router core package is at correct 1.168.26.

## Issues Encountered

- **MSVC Build Tools / cargo not in PATH (pre-existing):** `cargo check` (part of Task 4's pre-checkpoint sanity) could not run in this bash shell — Rust/cargo is not in the shell PATH. This is a known pre-existing blocker from STATE.md. The Vite build (`pnpm build`) and TypeScript check both passed. `pnpm tauri build` requires the user to run it in the Windows native environment where Rust is installed. This is noted as part of the human-verify checkpoint instructions.

## Human Checkpoint: Task 4 (PENDING)

The checkpoint (`type="checkpoint:human-verify"`) requires the user to:

1. Run `pnpm tauri build` and launch the production `.exe`
2. Verify dark-mode no-flash, all 6 sidebar entries navigate correctly
3. Verify sidebar collapse persists across restarts
4. Open `%APPDATA%\com.hobbyforge.app\` in Explorer and confirm `hobbyforge.db` exists (SETUP-09)
5. Run `await window.__phase1Smoke()` in webview devtools and confirm `{ ok: true, rowsInserted: 1, rowsSelected: 1, dropped: true }`
6. Type "approved" to proceed

Full verification checklist is in the plan's Task 4 `<how-to-verify>` section (10 steps).

## Phase 1 Patterns for Phase 2+

These patterns established in Phase 1 should be maintained in all subsequent phases:

- **Folder structure:** `src/app/<route-name>/page.tsx` for route page components; `src/components/common/` for shared app-level components
- **getDb() singleton location:** `src/db/client.ts` — Phase 2 writes query modules under `src/db/queries/`
- **NavItem pattern:** Add new nav entries to the `MAIN_NAV` array in `AppSidebar.tsx`; each entry follows `{ to, label, icon }` shape
- **PlaceholderPage pattern:** Each phase replaces its placeholder page by exporting a real component from the same file path
- **QueryClient defaults:** Desktop-tuned settings in `QueryProvider.tsx` apply to all queries app-wide; do not override per-query unless necessary

## Next Phase Readiness

Phase 2 (Data Layer) can begin once the human checkpoint (Task 4) is approved:
- Empty `get_migrations()` Vec in `src-tauri/src/lib.rs` — ready for 001_core_schema.sql
- `getDb()` singleton in `src/db/client.ts` — ready for query modules in `src/db/queries/`
- `scripts/sql-smoke-test.ts` can be deleted once real schema migrations make it redundant

---
*Phase: 01-app-shell*
*Completed: 2026-04-30*
