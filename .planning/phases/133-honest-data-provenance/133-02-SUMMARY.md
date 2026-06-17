---
phase: 133-honest-data-provenance
plan: "02"
subsystem: army-lists/dashboard/data-health
tags: [refactor, dead-code-removal, honest-ui, HON-01, HON-02]
dependency_graph:
  requires: [freshness-param-removed-from-warnings-layer]
  provides: [honest-provenance-surface, syncFreshness-deleted, StaleDataBanner-deleted]
  affects:
    - src/features/army-lists/PointsFreshnessBadge.tsx
    - src/features/dashboard/DataHealthSummaryCard.tsx
    - src/features/dashboard/ReadyToPlayCard.tsx
    - src/features/data-health/DiagnosticsCard.tsx
    - src/lib/syncFreshness.ts
    - src/features/army-lists/StaleDataBanner.tsx
    - tests/army-list/StaleDataBanner.test.tsx
    - tests/army-list/ArmyListDetailNotFound.test.tsx
    - tests/army-list/ArmyListNotesNoOp.test.tsx
    - tests/feedback/FBK-02-GameDayErrorState.test.tsx
    - tests/dashboard/DataHealthSummaryCard.test.tsx
    - tests/dashboard/ReadyToPlayCard.test.tsx
tech_stack:
  added: []
  patterns: [honest-provenance-text, dead-stub-deletion, test-update-for-new-behavior]
key_files:
  created: []
  modified:
    - src/features/army-lists/PointsFreshnessBadge.tsx
    - src/features/dashboard/DataHealthSummaryCard.tsx
    - src/features/dashboard/ReadyToPlayCard.tsx
    - src/features/data-health/DiagnosticsCard.tsx
    - tests/army-list/ArmyListDetailNotFound.test.tsx
    - tests/army-list/ArmyListNotesNoOp.test.tsx
    - tests/feedback/FBK-02-GameDayErrorState.test.tsx
    - tests/dashboard/DataHealthSummaryCard.test.tsx
    - tests/dashboard/ReadyToPlayCard.test.tsx
  deleted:
    - src/lib/syncFreshness.ts
    - src/features/army-lists/StaleDataBanner.tsx
    - tests/army-list/StaleDataBanner.test.tsx
decisions:
  - "PointsFreshnessBadge: Tooltip now wraps text span directly (no outer flex div) per seed pattern — cn import removed as it became unused"
  - "DataHealthSummaryCard: useUdbMeta hook retained (feeds the honest version row); only syncFreshness import + computed vars removed"
  - "ReadyToPlayCard: useUdbMeta hook fully removed (was only feeding the sync row, confirmed no other use)"
  - "Rule 1 auto-fix: tests/dashboard/ReadyToPlayCard.test.tsx and tests/dashboard/DataHealthSummaryCard.test.tsx updated — both tested the old fake sync copy that was removed in this plan"
metrics:
  duration: "20 minutes"
  completed: "2026-06-17T09:43:00Z"
  tasks_completed: 3
  files_modified: 9
  files_deleted: 3
checkpoint:
  task: 3
  type: human-verify
  gate: blocking
  result: approved
  approved_at: "2026-06-17T10:00:00Z"
  note: "User confirmed honest provenance UI on all touched surfaces (dashboard ReadyToPlayCard/DataHealthSummaryCard, army-list points badge, Game Day); no sync/refresh/stale copy remains; the real backup-staleness warning (BACKUP_FRESHNESS_DOT_CLASS dot + '(outdated)' block) renders intact."
---

# Phase 133 Plan 02: Make display files honest + delete dead stubs Summary

Replaced the always-green fake sync-freshness UI with honest data-version text across PointsFreshnessBadge, DataHealthSummaryCard, and ReadyToPlayCard; deleted the dead `syncFreshness.ts` stub and orphaned `StaleDataBanner.tsx`; the real backup-staleness warning (BACKUP_FRESHNESS_DOT_CLASS) preserved byte-for-byte. `pnpm build` and all 2744 tests green.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Make PointsFreshnessBadge, DataHealthSummaryCard, ReadyToPlayCard, DiagnosticsCard honest | 0e659ddd | 4 src files |
| 2 | Delete syncFreshness.ts + StaleDataBanner.tsx and finish test suite | b2f61e07 | 3 deleted, 5 test files updated |
| 3 | Human-verify honest provenance UI + preserved backup warning (blocking checkpoint) | — (approval, no commit) | live-app verification |

## Checkpoint Resolution

**Task 3 — `checkpoint:human-verify` (gate=blocking): APPROVED.**

The user ran the app and confirmed all five verification points:

1. Dashboard ReadyToPlayCard — no Clock/dot sync row, no "Sync stale" badge; the "{N} unpainted" amber badge appears only when unpainted units exist.
2. Dashboard DataHealthSummaryCard — the sync line reads honest "Data {version}" text with no traffic-light dot; the BACKUP row below it still shows its colored dot, backup age, and "(outdated)" badge on version mismatch.
3. Army-list detail / Game Day — the points badge shows "v{version}" as plain muted text with the "Data version {version} (built {built_at})" tooltip and no colored dot.
4. No label/button/tooltip says "sync", "refresh data", "stale", "out of date", or "30 days old" about bundled unit data anywhere on the touched surfaces.
5. The real backup-staleness warning (BACKUP_FRESHNESS_DOT_CLASS dot + "(outdated)" block) is preserved and renders correctly.

Resume signal received: **"approved"**. No surface needed fixes. Plan 133-02 is fully complete (3/3 tasks).

## What Was Built

- **`PointsFreshnessBadge.tsx`** — Removed `getSyncFreshness`/`FRESHNESS_DOT_CLASS` import and the colored dot span. Tooltip now wraps a single `<span className="text-xs text-muted-foreground">v{udbMeta.version}</span>` directly (no outer flex wrapper); `cn` import dropped as unused. Fallback: "No data". Skeleton path unchanged.
- **`DataHealthSummaryCard.tsx`** — Removed `import { getSyncFreshness, getSyncAgeLabel, FRESHNESS_DOT_CLASS } from "@/lib/syncFreshness"` (line 8) and the `freshness`/`syncLabel` computed vars; replaced the green dot + syncLabel row with `<span className="text-xs text-muted-foreground">{udbMeta ? \`Data ${udbMeta.version}\` : "Data version unavailable"}</span>` inside the existing `syncLoading` Skeleton guard. `useUdbMeta` hook kept (feeds the version text). Backup row (`BACKUP_FRESHNESS_DOT_CLASS` dot + label + `(outdated)`) preserved verbatim.
- **`ReadyToPlayCard.tsx`** — Removed `Clock` from Lucide import; removed `syncFreshness` import; removed `useUdbMeta` hook call and import; removed `freshness`/`syncLabel` vars; deleted the Clock+dot+syncLabel row entirely; collapsed `(unpaintedCount > 0 || freshness === "stale" || freshness === "aging")` to `unpaintedCount > 0` keeping the amber badge className unchanged.
- **`DiagnosticsCard.tsx`** — Updated stale comment "with a stale-sync check computed client-side from syncFreshness" to "Data version is sourced from udb_meta (udb_meta.version contains the content hash)".
- **`src/lib/syncFreshness.ts`** — Deleted outright (D-03; was always returning "fresh").
- **`src/features/army-lists/StaleDataBanner.tsx`** — Deleted (D-05; zero importers confirmed pre-deletion).
- **`tests/army-list/StaleDataBanner.test.tsx`** — Deleted (5 test cases removed; net −5 in suite count).
- **Three test files** (ArmyListDetailNotFound, ArmyListNotesNoOp, FBK-02-GameDayErrorState) — `vi.mock("@/lib/syncFreshness", ...)` block removed from each.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] tests/dashboard/ReadyToPlayCard.test.tsx had stale sync copy assertions**
- **Found during:** Task 2 — `pnpm test` revealed 4 failures after deletion
- **Issue:** The test file had `mockSyncMeta`, a `useUdbMeta` mock, and a test asserting `"Data bundled with app"` text — all from the old sync row that was removed in Task 1. The component no longer imports `useUdbMeta` or renders that text.
- **Fix:** Removed `mockSyncMeta` and the `useUdbMeta` mock; replaced the "renders sync age label" test with a "does not show sync/freshness/stale text" assertion; removed `mockSyncMeta` from the `beforeEach`.
- **Files modified:** `tests/dashboard/ReadyToPlayCard.test.tsx`
- **Commit:** b2f61e07

**2. [Rule 1 - Bug] tests/dashboard/DataHealthSummaryCard.test.tsx had 3 stale sync assertions**
- **Found during:** Task 2 — `pnpm test` revealed 3 failures after deletion
- **Issue:** Three tests in the "sync dot and label" describe block expected: `"Data bundled with app"` text (×2) and a `.bg-green-500` sync-freshness dot (×1). The component no longer renders these — it shows `"Data {udbMeta.version}"` / `"Data version unavailable"` with no dot.
- **Fix:** Rewrote the describe block as "honest data version row (Phase 133)": tests now assert `"Data version unavailable"` (null meta), `"Data 1.0.0+a3f7bc21"` (meta with version), sync-dot-absence (no `"Data bundled with app"` text), and loading skeleton.
- **Files modified:** `tests/dashboard/DataHealthSummaryCard.test.tsx`
- **Commit:** b2f61e07

## Verification Results

- `grep -rn "SyncFreshness|getSyncFreshness|getSyncAgeLabel|FRESHNESS_DOT_CLASS|@/lib/syncFreshness" src/ tests/` — no matches (only BACKUP_FRESHNESS_DOT_CLASS hits from the DO-NOT-TOUCH backup module)
- `grep -n "BACKUP_FRESHNESS_DOT_CLASS|backupFreshness" src/features/dashboard/DataHealthSummaryCard.tsx` — 2 matches (backup row preserved)
- `grep -n "Clock" src/features/dashboard/ReadyToPlayCard.tsx` — no matches
- `grep -rn "Sync stale|getSyncAgeLabel|syncLabel" src/features/dashboard/` — no matches
- `src/lib/backupFreshness.ts` — unchanged
- `src/features/data-health/BackupCard.tsx` — unchanged
- `pnpm build` — exits 0 (TypeScript strict mode, no dangling imports)
- `pnpm test` — 2744 tests pass (net −5 from deleted StaleDataBanner suite; 6 skipped; 38 todo)

## Known Stubs

None — this is a pure removal/replacement plan; no placeholder data or UI stubs introduced.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes. The honest text reads an already-trusted local `udb_meta` row.

## Self-Check: PASSED

- src/features/army-lists/PointsFreshnessBadge.tsx: modified (confirmed)
- src/features/dashboard/DataHealthSummaryCard.tsx: modified (confirmed)
- src/features/dashboard/ReadyToPlayCard.tsx: modified (confirmed)
- src/features/data-health/DiagnosticsCard.tsx: modified (confirmed)
- src/lib/syncFreshness.ts: deleted (confirmed)
- src/features/army-lists/StaleDataBanner.tsx: deleted (confirmed)
- tests/army-list/StaleDataBanner.test.tsx: deleted (confirmed)
- Commit 0e659ddd: exists (Task 1)
- Commit b2f61e07: exists (Task 2)
- Task 3 (human-verify, blocking): APPROVED by user — verified live, no commit (verification-only checkpoint)
