---
gsd_state_version: 1.0
milestone: v2.1
milestone_name: Visual Command
status: executing
stopped_at: Completed 14-00-PLAN.md (Phase 14 Wave 0 stubs — 7 test stub files, 32 it.skip placeholders)
last_updated: "2026-05-04T06:59:34.647Z"
last_activity: 2026-05-03 — Phase 13 Plan 03 — JournalTab component delivered; 2 JOUR-05 render tests activated; 17/17 Phase 13 tests passing
progress:
  total_phases: 7
  completed_phases: 3
  total_plans: 23
  completed_plans: 17
  percent: 74
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-02 after v2.1 milestone start)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.
**Current focus:** v2.1 — Visual Command (Phases 10–14; v2.0 fully shipped 2026-05-03)

## Current Position

Phase: 14 of 14 (IN PROGRESS: Phase 14 Spending Tracker)
Plan: 14-00 complete — Wave 0 stub files: 7 test stubs under tests/spending/ with 32 it.skip placeholders; pnpm test exits 0; tsc --noEmit clean; ready for Plan 14-01 (formatCurrency utility + migration 005 SQL)
Status: Phase 14 in progress — Plan 14-00 done. Next: Plan 14-01 (formatCurrency.ts + 005_spend_pence.sql migration + lib.rs registration)
Last activity: 2026-05-04 — Phase 14 Plan 00 — 7 Wave 0 stub files created; 32 it.skip placeholders; 245 passing, 32 skipped

Progress: [███████░░░] 74% (17/23 plans complete)

## v2.1 Phase Map

| Phase | Goal | Requirements |
|-------|------|--------------|
| 10. Theming Foundation | Faction accent colors + collapsible sidebar | THEME-01..03, UI-01..03 |
| 11. Dashboard Command Center | Animated counters + faction-accented cards | UI-07, UI-08 |
| 12. Collection Gallery View | Card grid alternate view + filter preservation | UI-04..06 |
| 13. Hobby Journal | Session log (SQL) + photo timeline (tauri-plugin-fs) | JOUR-01..06 |
| 14. Spending Tracker | Cost logging per unit/paint + Spending page | SPEND-01..05 |

Architecture constraint: Phase 10 must complete before Phases 11–14. `bg-faction-accent` CSS utilities must exist before any themed UI is built.

## Accumulated Context

### Key Decisions for v2.1

- Phase 8 Plan 00: getArmyListsByUnitId SQL does not de-duplicate — if a unit appears in List A twice, caller sees List A twice; plan 04 call site de-dups by id if needed for display
- Phase 8 Plan 02: status_painting === 'Completed' is canonical (not 'Complete' — RESEARCH.md typo corrected; PAINTING_STATUS_ORDER in unit.ts confirms); Pitfall 2 full-replacement UPDATE means every useUpdateArmyListUnit call passes BOTH points_override AND notes; UnitPickerDialog stays open after each add for multi-add UX
- Phase 8 Plan 03: ArmyListDetailSheet does NOT own UnitPickerDialog state — onAddUnit prop delegates to parent page (sibling portal); ArmyListCard duplicates stat logic from ArmyListSummaryBar intentionally (card must show totals before detail sheet is opened); Pitfall 5 (notes: notesDraft ?? "") and Pitfall 6 (key={list?.id ?? "none-detail"}) both applied
- Phase 8 Plan 04: Loading skeleton test required async waitFor wrapper because RouterProvider renders asynchronously — synchronous querySelectorAll returned 0 elements; UnitDeleteDialog warning body uses double-quoted unit name + pluralized list count per UI-SPEC §Copywriting Contract
- Phase 8 Plan 05: All 14 manual smoke-test steps approved; Pitfall 1 (sibling portals), Pitfall 2 (full-replacement UPDATE), and Pitfall 6 (key prop) all confirmed working in live Tauri app; Phase 8 complete and ready for /gsd:verify-work
- Phase 9 Plan 01: Raw `<textarea>` with PaintSheet className verbatim used for PlaybookTab (no shadcn Textarea exists); `initialRef` snapshot pattern for dirty detection without React Hook Form
- Phase 9 Plan 02: SheetHeader/SheetFooter stay outside Tabs so unit name, faction badge, and Edit/Delete buttons persist across tab switches
- Phase 9 Plan 02: No overflow-hidden added to Tabs/TabsContent — SheetContent overflow-y-auto retained for correct scrolling (Pitfall 5)
- Phase 9 Plan 02: key={unit?.id} on SheetContent resets PlaybookTab state on unit switch for free — no extra reset logic needed
- Phase 10 uses CSS `@theme` layer to define `bg-faction-accent` utilities — all accent color usage in later phases references these utilities, never hardcoded hex values
- Phase 10 Plan 00: Wave 0 stub files use no SUT imports — source-under-test doesn't exist yet; imports land in plans 10-01/02/03 alongside replacing .skip bodies
- Phase 10 Plan 00: Explicit `import { describe, it } from 'vitest'` in every stub file for tsc strict-mode compatibility (mirrors UnitDeleteDialog pattern)
- Phase 10 Plan 01: Test file renamed .ts -> .tsx — JSX in wrapper requires tsx extension; esbuild rejects JSX in .ts files (auto-fixed Rule 1)
- Phase 10 Plan 01: No useMemo on context value — mirrors useSidebarCollapsed.ts pattern; ActiveFactionContext itself not exported (only Provider + hook are public API)
- Phase 10 Plan 02: FactionSummaryCard isActive/onActivate props are optional with defaults so DashboardPage compiles before Plan 10-03 wires them
- Phase 10 Plan 02: NavItem uses bg-faction-accent via CSS cascade only — no useActiveFaction context import needed in NavItem itself
- Phase 10 Plan 02: FactionStat test mock uses complete Faction type (icon_path, created_at, updated_at) — plan mock was missing fields; auto-corrected (Rule 1)
- Phase 11 Plan 00: Wave 0 stub tests/dashboard/useCountUp.test.ts stays .ts (no JSX wrapper needed for plain number-target hook); explicit vitest imports for tsc strict-mode; no SUT import until Plan 11-01 creates src/hooks/useCountUp.ts
- Phase 11 Plan 01: Object.defineProperty used to install window.matchMedia in jsdom — vi.spyOn fails with "Received undefined" because jsdom does not define matchMedia; defineProperty makes it writable/configurable so tests can override per-call
- Phase 11 Plan 01: vitest 4.1.5 fake timers correctly stub requestAnimationFrame; vi.advanceTimersByTime(600) advances the rAF loop — no vi.stubGlobal('requestAnimationFrame') fallback needed
- Phase 11 Plan 02: AnimatedNumber sub-component is module-local (not exported) — it is an implementation detail of StatCard, not a public API; typeof value === 'number' guard in animate branch prevents passing string values like '72%' to useCountUp (Pitfall 2)
- Phase 11 Plan 02: Object.defineProperty matchMedia global installed at module level in DashboardPage.test.tsx — all data-loaded tests need it once animate={true} wires AnimatedNumber into hero StatCards; vi.restoreAllMocks() added to beforeEach alongside vi.clearAllMocks() to restore the UI-07 spy before UI-08 runs
- Phase 11 Plan 03: FactionSummaryCard star button extracted with stopPropagation — activating a faction no longer navigates to /collection; card click and star click are now independent interactions; Active badge replaced by filled Star icon (fill-faction-accent text-faction-accent); aria-labels added for screen reader accessibility
- Phase 12 Plan 00: Wave 0 stub files use .tsx extension up-front — avoids .ts->tsx rename Phase 10-00 had to perform in 10-01
- Phase 12 Plan 00: No matchMedia polyfill in UnitGallery.test.tsx — gallery has no animation dependency; Pitfall 6 from 12-RESEARCH.md
- Phase 12 Plan 00: Explicit `import { describe, it } from 'vitest'` in both stub files for tsc strict-mode compatibility
- Phase 12 Plan 01: useCollectionViewMode parse guard accepts only literal 'gallery' — null/unknown/other values default to 'table'; no standalone hook unit test (end-to-end coverage from UnitGallery toggle tests in Plan 12-02)
- Phase 12 Plan 01: PaintingRing stroke color uses stroke='currentColor' + className='text-primary' NOT stroke-primary utility (Tailwind v4 stroke-* utilities don't apply directly to SVG stroke — Pitfall 1)
- Phase 12 Plan 01: PaintingRing text fill uses fill='currentColor' attribute alongside className for resilient color inheritance (Open Question 2 pattern)
- Phase 12 Plan 02: Pitfall 3 (Card defaults gap-6/py-6) — cn() + tailwind-merge correctly overrides with gap-2/pt-4/pb-4; plain div fallback NOT needed
- Phase 12 Plan 02: mockFaction in test required game_system + description fields (plan template was missing these); auto-corrected (Rule 1)
- Phase 12 Plan 02: useRouter warning in CollectionPage tests is benign — UnitDetailSheet only calls useRouter when open; tests never open the sheet
- Phase 12 Plan 03: All 9 manual smoke-test steps PASS in live Tauri app — no Pitfall interventions needed; stroke='currentColor' + className='text-primary' arc renders correctly (Pitfall 1), cn() override works without plain-div fallback (Pitfall 3), Space preventDefault holds (Pitfall 4); Phase 12 complete
- Phase 13 photo storage requires `tauri-plugin-fs` — the one new Tauri plugin introduced in v2.1; verify capability grants before building photo attach UI
- Phase 13 Plan 00: Wave 0 stub files use .tsx for JournalTab (JSX component test) and .ts for all others — avoids .ts->tsx rename seen in Phase 10-01; no SUT imports in any stub until plans 13-01/02/03 create source files; explicit `import { describe, it } from 'vitest'` for tsc strict-mode (mirrors Phase 10/11/12 pattern)
- Phase 13 Plan 01: tauri feature flag "protocol-asset" must be added to Cargo.toml tauri dependency when assetProtocol.enable = true in tauri.conf.json — build fails without it; plugin registration order: opener -> fs -> dialog -> sql; UnitPhoto.file_path stores UUID filename only (not absolute path)
- Phase 13 Plan 02: useJournalSessions test file uses .tsx extension (JSX QueryClientProvider wrapper requires tsx — esbuild rejects JSX in .ts); appDataDir() resolved once per hook via useState/useEffect pattern (not per row); PAINTING_SESSIONS_KEY and UNIT_PHOTOS_KEY factories stable for Plan 13-03 UI
- Phase 13 Plan 03: JournalTab does NOT mount its own lightbox Dialog — onPhotoClick prop delegates to CollectionPage sibling portal (Plan 13-04); photo delete uses no confirmation modal (optimistic rollback via hook); Stage Select 'Other' reveals free-text input that becomes the stage_label
- Phase 14 stores all spend values as integer pence in SQLite — display formatting happens in UI layer only, never stored as float

### Decisions Carried from v2.0

- All queries via `tauri-plugin-sql` directly — no ORM
- `0|1` integer discipline for SQLite booleans
- All new query modules go to `src/db/queries/` — never import DB in UI
- All new hook modules go to `src/hooks/` — components call hooks only
- Sibling Sheet/Dialog portal pattern — never nest Radix portals
- selectedUnitId pattern for any page that opens a detail Sheet

### Roadmap Evolution

- Phase 15 added: 40K Datasheet Integration — auto-populate Playbook tab stats/abilities/keywords from community data, bundle local SQLite rules database (v2.1, depends on Phase 14)
- Phase 16 added: Design Overhaul — significantly improve visual design across all pages (v2.1, depends on Phase 14)

### Tech Debt

- PROJ-02: REQUIREMENTS.md text still says "empty columns hidden" — KanbanBoard ships all 11 columns (approved UX)
- PaintingProjectsPage empty-state CTA uses fragile DOM query — replace with useState pattern

### Pending Todos

None blocking.

### Open Blockers

None.

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 260503-g7p | Add one-click launcher scripts and desktop shortcut for HobbyForge | 2026-05-03 | 974bcfe | Verified | [260503-g7p-i-would-like-to-get-something-to-launch-](./quick/260503-g7p-i-would-like-to-get-something-to-launch-/) |

## Session Continuity

Last session: 2026-05-04T06:59:34.643Z
Stopped at: Completed 14-00-PLAN.md (Phase 14 Wave 0 stubs — 7 test stub files, 32 it.skip placeholders)
Resume: Run `/gsd:execute-phase 14` to continue with Plan 14-01 (formatCurrency utility + 005_spend_pence.sql migration).
