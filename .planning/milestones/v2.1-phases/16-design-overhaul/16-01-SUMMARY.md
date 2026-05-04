---
phase: 16-design-overhaul
plan: 01
subsystem: ui
tags: [geist, fontsource, tailwindcss-v4, typography, css-custom-properties]

# Dependency graph
requires:
  - phase: 10-theming-foundation
    provides: "@theme inline {} block with --color-faction-accent token as integration point"
provides:
  - "@fontsource-variable/geist@5.2.8 installed as project dependency"
  - "--font-sans CSS custom property registered in @theme inline {} block"
  - "Geist Variable font applied as global body font-family via var(--font-sans)"
  - "Font foundation for all downstream Phase 16 plans"
affects: [16-02, 16-03, 16-04, 16-05, 16-06, 16-07, 16-08]

# Tech tracking
tech-stack:
  added:
    - "@fontsource-variable/geist@5.2.8 — Geist Sans variable weight WOFF2 font via npm"
  patterns:
    - "Tailwind v4 CSS-first font integration: @import in globals.css + --font-sans in @theme inline + body font-family var()"
    - "pnpm is the package manager for this project (pnpm-lock.yaml present, not npm)"

key-files:
  created: []
  modified:
    - "package.json — added @fontsource-variable/geist@^5.2.8 dependency"
    - "pnpm-lock.yaml — lockfile updated with new font package"
    - "src/styles/globals.css — three edits: font @import, --font-sans token, body font-family"

key-decisions:
  - "Used pnpm (not npm) — project has pnpm-lock.yaml; npm install fails with workspace: protocol error"
  - "Placed @import after tw-animate-css on line 3, before @custom-variant dark — correct Tailwind v4 import order"
  - "--font-sans added inside @theme inline {} block after --color-faction-accent — Tailwind v4 CSS-first pattern, no tailwind.config.js created"

patterns-established:
  - "Pattern: Tailwind v4 font token registration — declare --font-sans inside @theme inline {} to expose as Tailwind utility"
  - "Pattern: pnpm is the only working package manager for this project — always use pnpm add, never npm install"

requirements-completed:
  - DESIGN-FOUNDATION

# Metrics
duration: 6min
completed: 2026-05-04
---

# Phase 16 Plan 01: Font Foundation Summary

**Geist Variable font self-hosted via @fontsource-variable/geist@5.2.8, wired into Tailwind v4 CSS-first config as --font-sans token, replacing the system font stack on the body element**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-04T08:25:49Z
- **Completed:** 2026-05-04T08:32:00Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- Installed `@fontsource-variable/geist@5.2.8` via pnpm (not npm — project uses pnpm)
- Added `@import "@fontsource-variable/geist";` on line 3 of globals.css after the existing Tailwind and tw-animate-css imports
- Registered `--font-sans: 'Geist Variable', ui-sans-serif, system-ui, sans-serif;` inside the `@theme inline {}` block
- Replaced `body { font-family: ui-sans-serif, system-ui, sans-serif; }` with `font-family: var(--font-sans);`
- All 279 existing tests remain passing; TypeScript compilation succeeds with zero errors
- No `tailwind.config.js` or `tailwind.config.ts` created — Tailwind v4 CSS-first integrity preserved

## Task Commits

1. **Task 1: Install Geist Variable font and integrate into globals.css** - `556f20e` (feat)

**Plan metadata:** (included in final docs commit)

## Files Created/Modified
- `package.json` — `@fontsource-variable/geist@^5.2.8` added to dependencies
- `pnpm-lock.yaml` — lockfile updated
- `src/styles/globals.css` — three targeted edits applied (lines 3, 108-109, 115)

## Decisions Made
- Used `pnpm add` instead of `npm install` — the project has a `pnpm-lock.yaml` and npm fails with `EUNSUPPORTEDPROTOCOL: workspace:*` error because node_modules contain pnpm-style workspace symlinks
- Font import placed after `@import "tw-animate-css";` and before `@custom-variant dark` — matches the plan's specified position

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Switched from npm to pnpm for package installation**
- **Found during:** Task 1 (install step)
- **Issue:** `npm install @fontsource-variable/geist` failed with two errors: first `TypeError: Cannot read properties of null (reading 'matches')` from npm's arborist (corrupted node tree due to pnpm symlinks), then `EUNSUPPORTEDPROTOCOL: Unsupported URL Type "workspace:": workspace:*` with `--legacy-peer-deps`. The project uses pnpm (confirmed by presence of `pnpm-lock.yaml`).
- **Fix:** Used `pnpm add @fontsource-variable/geist` instead — succeeded in 2.3s, installed version 5.2.8 as expected
- **Files modified:** package.json, pnpm-lock.yaml
- **Verification:** `node -e "console.log(require('./package.json').dependencies['@fontsource-variable/geist'])"` → `^5.2.8`
- **Committed in:** `556f20e` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 3 blocking — wrong package manager)
**Impact on plan:** Package installed successfully at the planned version (5.2.8). No scope creep. The package manager switch is a project-level discovery (pnpm is the correct tool for this project going forward).

## Issues Encountered
- npm fails in this project due to pnpm workspace: protocol symlinks in node_modules. Always use `pnpm add` / `pnpm install` for this project.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Font foundation complete — all Phase 16 Wave 1+ plans can now proceed
- Geist Variable font will render on every page that imports globals.css (all pages, via main.tsx)
- Downstream plans (16-02 sidebar, 16-03 page headers, etc.) can be executed in wave order

---
*Phase: 16-design-overhaul*
*Completed: 2026-05-04*
