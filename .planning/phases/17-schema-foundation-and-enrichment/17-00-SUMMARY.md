---
phase: 17-schema-foundation-and-enrichment
plan: 00
subsystem: database, ui, testing
tags: [sqlite, migration, tauri-plugin-sql, zod, react-hook-form, dates, typescript]

# Dependency graph
requires:
  - phase: 15-warhammer-40k-datasheet-and-rules-integration
    provides: migration version 7 (datasheet_link) — Phase 17 must use version 8
provides:
  - Migration 008 adding lore_notes (units+factions), undercoat (units), purchase_date (paints)
  - src/lib/dates.ts UTC-safe date utilities (todayISO + parseLocalDate)
  - UnitSheet Undercoat + Lore Notes form fields
  - FactionSheet Lore Notes form field
  - UnitDetailSheet Details tab Undercoat + Lore Notes read-only rows
  - JournalTab UTC bug fix (off-by-one date error for non-UTC timezones)
affects:
  - 19-analytics-core (requires dates.ts for streak/velocity arithmetic)
  - 21-hobby-goals (requires dates.ts for goal progress bucketing)
  - all phases touching units/factions/paints queries

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Raw assignment (column = $N) for nullable columns users can clear to NULL — never COALESCE for clearable fields
    - UTC-safe date utilities module (src/lib/dates.ts) for all date arithmetic in the app
    - zod .optional().nullable() without .default() — form defaultValues handle initial values to avoid react-hook-form resolver type mismatch

key-files:
  created:
    - src-tauri/migrations/008_enrichment.sql
    - src/lib/dates.ts
    - tests/enrichment/migration008.test.ts
    - tests/lib/dates.test.ts
  modified:
    - src-tauri/src/lib.rs
    - src/types/unit.ts
    - src/types/paint.ts
    - src/types/faction.ts
    - src/db/queries/units.ts
    - src/db/queries/factions.ts
    - src/db/queries/paints.ts
    - src/features/units/unitSchema.ts
    - src/features/units/UnitSheet.tsx
    - src/features/units/UnitDetailSheet.tsx
    - src/features/factions/factionSchema.ts
    - src/features/factions/FactionSheet.tsx
    - src/features/units/JournalTab.tsx

key-decisions:
  - "Migration 008 (not 007) — version 7 is already taken by datasheet_link (Phase 15). Context.md pitfall was identified and corrected in RESEARCH.md."
  - "Raw assignment (column = $N) for all 4 new nullable columns — allows user to explicitly clear values to NULL. Never COALESCE for clearable fields."
  - "No zod .default() — project-wide anti-pattern. Form defaultValues in buildDefaultValues / DEFAULT_VALUES handle initial values."
  - "JournalTab local todayISO() DELETED (not shadowed) — import from @/lib/dates takes precedence at all 3 call sites."
  - "Undercoat always shown in UnitDetailSheet Details tab (with '—' fallback); Lore Notes conditional (hidden when null, matches existing notes pattern)."
  - "FactionSheet useEffect reset must include lore_notes in BOTH branches (Pitfall 4) to prevent stale-value bleed when switching factions."

patterns-established:
  - "UTC-safe date arithmetic: use src/lib/dates.ts todayISO() + parseLocalDate() everywhere — never new Date().toISOString().split('T')[0]"
  - "Nullable clearable columns use raw assignment in SQL UPDATE (column = $N), not COALESCE"
  - "Migration file naming: strictly sequential 001-008 — no gaps, no reuse"

requirements-completed:
  - ENRCH-01
  - ENRCH-02
  - ENRCH-03
  - ENRCH-04

# Metrics
duration: 45min
completed: 2026-05-04
---

# Phase 17 Plan 00: Schema Foundation and Enrichment Summary

**Migration 008 adds lore_notes+undercoat to units, lore_notes to factions, purchase_date to paints — all surfaces wired through TypeScript types, Zod schemas, query modules, form UIs, and read-only display; src/lib/dates.ts UTC-safe utilities replace buggy JournalTab local function**

## Performance

- **Duration:** ~45 min (Tasks 12-15 executed this session; Tasks 1-11 executed in prior session)
- **Started:** 2026-05-04T13:50:00Z
- **Completed:** 2026-05-04T13:59:00Z
- **Tasks:** 15 auto tasks + 1 checkpoint (Task 16 awaiting manual smoke test)
- **Files modified:** 13

## Accomplishments

- Migration 008 creates 4 new TEXT NULL columns (units.lore_notes, units.undercoat, factions.lore_notes, paints.purchase_date) registered as version 8 in lib.rs
- All 3 TypeScript type interfaces extended with new nullable fields; tsc --noEmit clean on Phase 17 code
- All 3 query modules (units.ts, factions.ts, paints.ts) extended with INSERT + UPDATE paths using raw assignment (not COALESCE) for clearable fields
- UnitSheet, FactionSheet, and UnitDetailSheet fully wired with new form fields and read-only display rows
- src/lib/dates.ts UTC-safe utility created; JournalTab UTC off-by-one bug fixed
- 10/10 Phase 17 tests passing (6 migration content assertions + 4 dates utility tests)

## Task Commits

Each task was committed atomically:

1. **Task 1 (Wave 0): Create tests/enrichment/migration008.test.ts** — (committed in prior session, hash in git log ~eba3592 area)
2. **Task 2 (Wave 0): Create tests/lib/dates.test.ts** — (committed in prior session)
3. **Task 3 (Wave 1): Create 008_enrichment.sql** — (committed in prior session)
4. **Task 4 (Wave 1): Register version 8 in lib.rs** — (committed in prior session)
5. **Task 5 (Wave 1): Extend Unit/Paint/Faction types** — `eba3592` (feat)
6. **Task 6 (Wave 2): Extend units.ts queries** — `9567627` (feat)
7. **Task 7 (Wave 2): Extend factions.ts queries** — `785a123` (feat)
8. **Task 8 (Wave 2): Extend paints.ts queries** — `fc3a46e` (feat)
9. **Task 9 (Wave 3): Extend unitSchema.ts** — `6f853f4` (feat)
10. **Task 10 (Wave 3): Extend UnitSheet.tsx** — `0cf1d52` (feat)
11. **Task 11 (Wave 3): Extend factionSchema.ts** — `19e2291` (feat)
12. **Task 12 (Wave 3): Extend FactionSheet.tsx** — `c8d654e` (feat)
13. **Task 13 (Wave 4): UnitDetailSheet Details tab rows** — `88c325e` (feat)
14. **Task 14 (Wave 4): Create src/lib/dates.ts** — `79f451b` (feat)
15. **Task 15 (Wave 4): Fix JournalTab UTC bug** — `046856e` (fix)

**Plan metadata:** (created in this session)

## Files Created/Modified

- `src-tauri/migrations/008_enrichment.sql` - 4 ALTER TABLE ADD COLUMN statements (additive only)
- `src-tauri/src/lib.rs` - Version 8 enrichment migration appended after version 7 datasheet_link
- `src/types/unit.ts` - lore_notes + undercoat nullable fields added to Unit interface
- `src/types/paint.ts` - purchase_date nullable field added to Paint interface
- `src/types/faction.ts` - lore_notes nullable field added to Faction interface
- `src/db/queries/units.ts` - createUnit + updateUnit wired to lore_notes ($21/$22) + undercoat ($22/$23) with raw assignment
- `src/db/queries/factions.ts` - createFaction + updateFaction wired to lore_notes ($6/$7) with raw assignment
- `src/db/queries/paints.ts` - createPaint + updatePaint wired to purchase_date ($12/$13) with raw assignment
- `src/features/units/unitSchema.ts` - lore_notes + undercoat optional nullable zod fields
- `src/features/units/UnitSheet.tsx` - buildDefaultValues + onSubmit + 2 FormFields (Undercoat Input + Lore Notes textarea)
- `src/features/units/UnitDetailSheet.tsx` - Undercoat (always shown) + Lore Notes (conditional) read-only rows in Details tab
- `src/features/factions/factionSchema.ts` - lore_notes optional nullable zod field
- `src/features/factions/FactionSheet.tsx` - DEFAULT_VALUES + useForm defaults + useEffect reset + Lore Notes FormField + onSubmit wiring
- `src/lib/dates.ts` - NEW: todayISO() + parseLocalDate() UTC-safe date utilities
- `src/features/units/JournalTab.tsx` - Local todayISO() deleted; import from @/lib/dates added
- `tests/enrichment/migration008.test.ts` - NEW: 6 content-shape assertions for 008_enrichment.sql + lib.rs version 8
- `tests/lib/dates.test.ts` - NEW: 4 contract tests for todayISO() format + parseLocalDate() local-midnight

## Decisions Made

- Migration 008 (not 007): CONTEXT.md draft predated Phase 15 shipping version 7 (datasheet_link). RESEARCH.md correctly identified the conflict. File named 008_enrichment.sql, registered as version 8.
- Raw assignment for all new nullable columns: `lore_notes = $22`, `undercoat = $23`, `lore_notes = $7`, `purchase_date = $13` — allows clearing to NULL. Follows existing precedent at `purchase_price_pence = $18`.
- No zod .default(): project anti-pattern (comment at unitSchema.ts line 17). Form defaultValues in buildDefaultValues/DEFAULT_VALUES handle initial values.
- FactionSheet Pitfall 4: useEffect reset MUST include lore_notes in the edit branch to prevent stale-value bleed when switching between factions. Both edit and create branches covered.
- Undercoat always shown in UnitDetailSheet with muted '—' fallback (painting-prep UX); Lore Notes conditional (matches existing notes pattern).

## Deviations from Plan

None — plan executed exactly as written. All wave dependencies respected (Wave 0 tests first, Wave 1 foundation, Waves 2/3 query+form, Wave 4 utility+display).

Note: Tasks 1-11 were partially pre-completed before this execution session. Tasks 12-15 were completed in this session.

## Issues Encountered

- Pre-existing TypeScript error in `tests/battle-log/battleLogQueries.test.ts` (Phase 18 Plan 01 work, uncommitted) causes `pnpm tsc --noEmit` to exit non-zero. This is out-of-scope for Phase 17 — the error is in Phase 18 test code that has a `notes: undefined` where `string | null` is expected. Logged to deferred-items (Phase 18 ownership).
- Pre-existing deleted file `tests/hobby-journal/useJournalSessions.test.ts` (staged for deletion) causes vitest to report 1 failed test file. Not caused by Phase 17. The replacement `useJournalSessions.test.tsx` passes all tests.

## Manual Smoke Test — Task 16 (AWAITING)

Task 16 is a `checkpoint:human-verify` requiring manual smoke test of the live Tauri app. The 7-step protocol covers:
1. Migration applies cleanly on app start (no panic, no SQLite error)
2. ENRCH-02/03 — Unit lore_notes + undercoat round-trip (edit form → save → re-open → Detail tab)
3. Pitfall 2 — clear-to-NULL works for unit fields (raw assignment, not COALESCE)
4. ENRCH-01 — Faction lore_notes round-trip + Pitfall 4 (no stale bleed switching factions)
5. dates.ts + JournalTab UTC fix (session date defaults to local calendar date)
6. Migration registry sanity (DB Browser: _sqlx_migrations version 8, 4 new columns)
7. Full test suite green + tsc --noEmit exits 0

## Next Phase Readiness

- Phase 17 Plan 00 automated code changes: COMPLETE (15 tasks committed)
- Task 16 manual smoke test: AWAITING — run `pnpm tauri dev` and follow the 7-step protocol
- After Task 16 approval: Phase 17 Plan 00 fully complete; Phase 18 (Battle Log) and Phase 19 (Analytics, requires dates.ts) can proceed
- dates.ts is now available for Phase 19 ANLY-04/05 streak/velocity and Phase 21 ANLY-01..03 hobby goals

## Self-Check: PASSED

All created files exist on disk. All 15 task commits confirmed in git log. SUMMARY.md created successfully.

---
*Phase: 17-schema-foundation-and-enrichment*
*Completed: 2026-05-04*
