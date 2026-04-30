---
phase: 02-data-layer-entity-crud
plan: "03"
subsystem: ui
tags: [react, tanstack-query, react-hook-form, zod, shadcn, tauri, factions, crud]

# Dependency graph
requires:
  - phase: 02-data-layer-entity-crud
    plan: "02"
    provides: useFactions/useCreateFaction/useUpdateFaction/useDeleteFaction hooks, Faction type, CreateFactionInput/UpdateFactionInput types
provides:
  - /factions route with full CRUD UI (list, create, edit, delete)
  - Faction sidebar nav entry (Shield icon, between Dashboard and Collection)
  - Toaster mounted in AppLayout provider tree (sonner, richColors, bottom-right)
  - factionSchema (zod v4, single source of truth for form validation)
  - CRUD pattern baseline for 02-04 (Unit + Paint UI replication)
affects:
  - 02-04-unit-paint-ui (replicates CRUD pattern established here)
  - 03-painting-workflow (will use faction data)
  - 05-dashboard (reads faction counts)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Thin route wrapper (src/app/X/page.tsx) delegates to src/features/X/XPage.tsx"
    - "Zod v4 schema without .default() — form defaultValues handle defaults to avoid Resolver type mismatch"
    - "key={entity?.id ?? 'new'} on Sheet/Dialog forces fresh mount, preventing stale form state (Pitfall 3)"
    - "FK error detection via case-insensitive message.includes('foreign key') in catch block"
    - "Native input[type=color] + 24px circular preview swatch for color pickers"
    - "4px left border via style={{ borderLeft: `4px solid ${color}` }} for entity color accents"

key-files:
  created:
    - src/app/factions/page.tsx
    - src/features/factions/factionSchema.ts
    - src/features/factions/FactionsEmptyState.tsx
    - src/features/factions/FactionRow.tsx
    - src/features/factions/FactionSheet.tsx
    - src/features/factions/FactionDeleteDialog.tsx
    - src/features/factions/FactionsPage.tsx
  modified:
    - src/app/router.tsx
    - src/components/common/AppSidebar.tsx
    - src/components/common/AppLayout.tsx

key-decisions:
  - "Removed .default() from zod schema fields (game_system, color_theme) — zod v4 .default() makes fields optional in the inferred input type, causing Resolver type mismatch with react-hook-form; form defaultValues handle the defaults instead"
  - "Toaster placed in AppLayout (not main.tsx) — shares React context with all UI, avoids duplicate mounting"
  - "Shield icon used for Factions nav entry (distinct from Swords app logo already in AppSidebar)"

patterns-established:
  - "CRUD pattern: thin route page -> feature page -> hooks (no direct DB access in features)"
  - "Form reset: useEffect([faction, form]) + key={entity?.id ?? sentinel} for stale state prevention"
  - "FK error handling: try/catch on mutateAsync, message.includes('foreign key') -> specific toast"

requirements-completed: [FACT-01, FACT-02, FACT-03, FACT-04, FACT-05]

# Metrics
duration: 6min
completed: 2026-04-30
---

# Phase 2 Plan 03: Faction CRUD UI Summary

**Complete /factions CRUD surface with sidebar nav, list with color-theme borders, Sheet form (native color picker + 24px live preview swatch), and delete dialog with FK error toast — first end-to-end CRUD pattern in the app**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-30T13:30:30Z
- **Completed:** 2026-04-30T13:36:00Z
- **Tasks:** 2 completed (Task 3 awaiting human-verify)
- **Files modified:** 10 (7 created, 3 modified)

## Accomplishments
- Built complete Faction CRUD UI at /factions — wired to useFactions* hooks from 02-02
- Added Factions sidebar nav entry (Shield icon) between Dashboard and Collection
- Added Toaster to AppLayout provider tree for sonner toast support across the entire app
- Established CRUD pattern (thin route page + feature page + hooks) for replication in 02-04

## Task Commits

1. **Task 1: Add /factions route, sidebar nav, Toaster** - `fc28cfd` (feat)
2. **Task 2: Build Faction CRUD feature UI** - `2e82a67` (feat)
3. **Task 3: Human-verify** - Pending approval

## Files Created/Modified
- `src/app/factions/page.tsx` - Thin route wrapper (imports FactionsPage from features)
- `src/app/router.tsx` - factionsRoute added between dashboardRoute and collectionRoute
- `src/components/common/AppSidebar.tsx` - Shield icon + Factions nav entry added to MAIN_NAV
- `src/components/common/AppLayout.tsx` - Toaster (richColors, bottom-right) added to provider tree
- `src/features/factions/factionSchema.ts` - Zod v4 schema + FactionFormValues type
- `src/features/factions/FactionsEmptyState.tsx` - Centered PackageOpen icon, heading, body, CTA
- `src/features/factions/FactionRow.tsx` - Table row with 4px left color_theme border (FACT-05)
- `src/features/factions/FactionSheet.tsx` - Create/edit Sheet: react-hook-form + zod, native color picker + 24px swatch
- `src/features/factions/FactionDeleteDialog.tsx` - Confirm dialog with FK error detection -> toast
- `src/features/factions/FactionsPage.tsx` - Page composition: header, list, skeleton, empty state, key-based Sheet/Dialog reset

## Decisions Made
- Removed `.default()` from zod schema — zod v4 `.default()` creates optional input types that cause `Resolver` type mismatch with react-hook-form; `defaultValues` in `useForm` handles defaults instead.
- Toaster placed in AppLayout (not main.tsx) to share React context and avoid duplicate mounting.
- Shield icon chosen for Factions nav entry (Swords already used for the app logo).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed .default() from zod schema to fix Resolver type mismatch**
- **Found during:** Task 2 (factionSchema + FactionSheet TypeScript check)
- **Issue:** Zod v4 `.default("value")` makes the field optional in the inferred input type, causing `Resolver<TFieldValues>` to be incompatible with react-hook-form's expected type — TypeScript error on `zodResolver(factionSchema)`.
- **Fix:** Removed `.default("Warhammer 40K")` from `game_system` and `.default("#4A90D9")` from `color_theme`. Form `defaultValues` in `useForm` handle the same defaults without affecting the zod schema types.
- **Files modified:** src/features/factions/factionSchema.ts
- **Verification:** `pnpm exec tsc --noEmit` exits 0 after fix.
- **Committed in:** `2e82a67` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug)
**Impact on plan:** Fix necessary for TypeScript correctness. No behavior change; form defaults are identical, just moved from schema to useForm.

## Issues Encountered
None beyond the zod .default() type issue (auto-fixed above).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Faction CRUD pattern established — 02-04 can replicate this for Unit and Paint entities
- All FACT-01..05 requirements implemented and awaiting human-verify (Task 3)
- Toaster is now in the provider tree — mutation error toasts work app-wide
- Seeded factions (Tau Empire, Ultramarines, Necrons, Tyranids) accessible at /factions
- MSVC Build Tools still required for `pnpm tauri dev` (pre-existing blocker from STATE.md)

---
*Phase: 02-data-layer-entity-crud*
*Completed: 2026-04-30 (Task 3 human-verify pending)*

## Note on POLISH requirements
POLISH-01 (delete confirm dialog) and POLISH-03 (mutation error toast) are exercised here as first-instance implementations. They officially belong to Phase 3 but the patterns are established in Phase 2 for the first CRUD surface.
