---
phase: 137-canonical-leader-attachment
verified: 2026-06-18T00:00:00Z
status: passed
score: 7/7 must-haves verified
overrides_applied: 0
human_uat_outcome: "All 3 human-UAT items resolved (see 137-HUMAN-UAT.md). Item 1 PASSED in live app (Gravis Captain → Aggressors only; plain Captain → Intercessors only — correct per-leader validation). Items 2 & 3 RESOLVED via accepted product decision (a): leader attachment is canonical-only by design; ghost/manual units do not participate. Misleading docstring corrected. During UAT a stale-cache bug was found and fixed (commit 52ec9635): leader-targets cache now invalidates on unit add/remove."
human_verification:
  - test: "Open an army list containing a canonical leader (e.g. a Space Marine Captain with a known udb_unit_id). Open the Attach Leader sheet."
    expected: "Only units that are valid canonical targets for that leader appear as selectable; non-canonical units are absent from the list."
    why_human: "The canonical join is verified structurally and by unit tests with mocked data, but the real SQLite join against a populated udb_leader_targets table (1,901 rows) must be exercised in the live Tauri app to confirm the end-to-end flow."
  - test: "Add a ghost/manual unit to an army list (a unit not linked to the canonical UDB — udb_unit_id is NULL). Click 'Attach Leader' on a canonical leader."
    expected: "The ghost unit is shown as a selectable target (permissive fallback). The advisory 'No canonical attachment data — validation unavailable for this unit' does NOT appear for the canonical leader (it only appears when the LEADER lacks canonical data)."
    why_human: "The permissive fallback for ghost TARGETS (not ghost leaders) cannot be fully validated without live data through the FK join."
  - test: "Add a ghost/manual unit (udb_unit_id: null) as a leader character, then attempt to open the Attach Leader sheet for it."
    expected: "(WR-03 design observation) The 'Attach Leader' button does NOT render for the ghost leader, because isLeader is derived exclusively from canonical leaderTargetPairs. The advisory cannot be reached for ghost leaders. Confirm whether this is accepted behavior or requires a follow-up (see WR-03 in 137-REVIEW.md)."
    why_human: "WR-03 describes a design tension: the LeaderAttachmentSheet has a permissive NULL fallback for ghost leaders, but the Attach Leader button is gated by isLeader which only fires for canonical leaders. Code review noted this contradiction. Needs a product decision."
---

# Phase 137: Canonical Leader Attachment — Verification Report

**Phase Goal:** Leader attachment in the army-list builder validates against real canonical attachment pairs instead of fragile name matching.
**Verified:** 2026-06-18
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `udb_leader_targets` table created by migration 050 with composite PK and both FK → `udb_units` ON DELETE CASCADE | VERIFIED | `src-tauri/migrations/050_udb_leader_targets.sql` confirmed: composite PK `(leader_unit_id, target_unit_id)`, both columns `REFERENCES udb_units(id) ON DELETE CASCADE`, two indexes. Schema asserted by 5 passing data-layer tests in `tests/data-layer/leader-targets.test.ts`. |
| 2 | Pipeline populates `udb_leader_targets` from `Datasheets_leader.csv` via canonical build → bundled JSON → Rust importer | VERIFIED | `unit_database.json` version `1.0.0+2f4d062a`, `leader_targets` array: 1,901 pairs. `leaderTargets` is in the content-hash input (line 867 of `build-unit-db.ts`) so version changes with data changes (D-06 honored). `Datasheets_leader.csv` is in `REQUIRED_CSVs` (line 76, CR-01 fix confirmed). Rust importer has `INSERT OR IGNORE INTO udb_leader_targets` loop at lib.rs:1037 and both `UdbImportResult` initializers set `leader_targets: 0` (lines 748 and 766). |
| 3 | Migration count parity gate passes at 50 (re-triggers Phase-130 gate) | VERIFIED | `node scripts/check-version.mjs` output: `[version] OK: 0.5.7 \| [migration-count] OK: 50 .sql files === 50 Migration{} entries in lib.rs \| [cr-byte] OK: no CR bytes`. Migration 050 has LF line endings (enforced by CR-byte scan leg). |
| 4 | Leader attachment in the builder uses canonical FK join — no name matching against `synced_leader_targets` | VERIFIED | `src/db/queries/leaderTargets.ts` exports `getLeaderTargetsForList` using 5-table FK join with `SELECT DISTINCT` (CR-02 fix applied). No `SyncedLeaderTargetRow` or `getLeaderTargetsByFaction` references remain in `src/features/army-lists/`. `useLeaderTargets.ts` no longer imports from `bsdataExtended`. |
| 5 | `useLeaderTargets` is list-keyed (not faction-keyed) with `staleTime: Infinity` | VERIFIED | `src/hooks/useLeaderTargets.ts` exports `useLeaderTargets(listId: number \| null)` with `staleTime: Infinity`, `gcTime: Infinity`, `enabled: listId != null`. Confirmed at lines 30-37. |
| 6 | Graceful NULL fallback: when a leader has `udb_unit_id: null`, the sheet shows all units as selectable with a quiet advisory | VERIFIED | `LeaderAttachmentSheet.tsx` lines 63-77: `validTargetIds` returns `null` (not empty Set) when `unit.udb_unit_id == null`; `validTargetUnits` returns full `units` array when `validTargetIds === null`. Advisory renders at lines 104-109. Tests confirm: "Test 2 (NULL permissive fallback): shows ALL units when leader has udb_unit_id: null" and "advisory text renders when leader has udb_unit_id: null" — both passing. |
| 7 | `isLeader` indicator in the army-list table is derived from canonical pairs, not name matching | VERIFIED | `ArmyListDetailPage.tsx` lines 127-129: `leaderAluIds = new Set(leaderTargetPairs.map(p => p.leader_alu_id))` passed down via `ArmyListUnitTable → ArmyListUnitRow`. `ArmyListUnitRow.tsx` line 95: `isLeader = leaderAluIds?.has(unit.id) ?? false`. No `SyncedLeaderTargetRow` or name-match `.some()` anywhere in the army-lists feature. |

**Score:** 7/7 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src-tauri/migrations/050_udb_leader_targets.sql` | DDL: composite PK + two FK CASCADE + two indexes, LF endings | VERIFIED | All structure present; LF confirmed by CR-byte scan |
| `src-tauri/src/lib.rs` | `Migration { version: 50 }` + DELETE list entry + INSERT loop + both result initializers | VERIFIED | `version: 50` at line 303; `udb_leader_targets` in DELETE list at line 777; INSERT loop at line 1037; both initializers at lines 748 and 766 |
| `scripts/lib/types.ts` | `UdbLeaderTargetRow` type + `leader_targets` field on `UnitDatabaseJson` | VERIFIED | Confirmed by grep: `leader_targets` field in types; TS compile clean |
| `scripts/build-unit-db.ts` | Leader parse step + content-hash inclusion + output assembly | VERIFIED | Step 7b at line 335; hash at line 867 (includes `leaderTargets`); output at line 888 |
| `src-tauri/data/unit_database.json` | Non-empty `leader_targets` array, changed version string | VERIFIED | 1,901 pairs, version `1.0.0+2f4d062a` |
| `src/db/queries/leaderTargets.ts` | `getLeaderTargetsForList` + `CanonicalLeaderPairRow` via FK join | VERIFIED | Full 5-table join with `SELECT DISTINCT`, parameterized `$1` |
| `src/hooks/useLeaderTargets.ts` | Rewritten to list-keyed with `staleTime: Infinity` | VERIFIED | Lines 29-37; no bsdataExtended import |
| `src/features/army-lists/LeaderAttachmentSheet.tsx` | Id-based valid-target set + permissive NULL fallback + advisory | VERIFIED | Lines 52-109; `validTargetIds: null` sentinel path confirmed |
| `tests/data-layer/leader-targets.test.ts` | Schema assertions: table, composite PK, FK CASCADE | VERIFIED | 5 tests passing (table exists, columns NOT NULL, composite PK, 2 CASCADE FKs, observable CASCADE deletion) |
| `tests/army-lists/LeaderAttachmentSheet.test.tsx` | Canonical path + NULL permissive fallback tests | VERIFIED | 12 tests passing including Test 1 (canonical), Test 2 (NULL fallback + advisory), empty-canonical-state, detach, tooltip |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src-tauri/src/lib.rs` | `050_udb_leader_targets.sql` | `include_str!("../migrations/050_udb_leader_targets.sql")` at version 50 | WIRED | Confirmed at lib.rs line 305 |
| `scripts/build-unit-db.ts` | Content-hash input | `leaderTargets` in `JSON.stringify({...})` at line 867 | WIRED | Confirmed: D-06 honored |
| `src-tauri/src/lib.rs` | `udb_leader_targets` table | `INSERT OR IGNORE INTO udb_leader_targets` loop | WIRED | Confirmed at lib.rs line 1037 |
| `src/features/army-lists/LeaderAttachmentSheet.tsx` | `src/hooks/useLeaderTargets.ts` | `useLeaderTargets(list?.id ?? null)` at sheet level | WIRED | Line 52 |
| `src/db/queries/leaderTargets.ts` | `udb_leader_targets` | FK join `JOIN udb_leader_targets lt ON lt.leader_unit_id = leader_u.udb_unit_id` | WIRED | Lines 47-48 |
| `src/features/army-lists/ArmyListDetailPage.tsx` | `ArmyListUnitTable.tsx` | `leaderAluIds: Set<number>` prop (replaces `leaderTargets: SyncedLeaderTargetRow[]`) | WIRED | Page lines 127-129 → table line 39 → row line 95 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `LeaderAttachmentSheet.tsx` | `leaderTargetPairs` (from `useLeaderTargets`) | `getLeaderTargetsForList(listId)` → `udb_leader_targets` FK join | Yes — real DB join on populated table (1,901 rows) | FLOWING |
| `ArmyListDetailPage.tsx` | `leaderTargetPairs` → `leaderAluIds: Set<number>` | Same hook via `useLeaderTargets(list.id)` | Yes — derived Set from live pairs | FLOWING |
| `unit_database.json` | `leader_targets: []` | `scripts/build-unit-db.ts` parsing `Datasheets_leader.csv` via Rust importer | Yes — 1,901 pairs confirmed in bundle | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `unit_database.json` has non-empty `leader_targets` and correct version | `node -e "const j=require('./src-tauri/data/unit_database.json'); console.log(j.version, j.leader_targets.length)"` | `1.0.0+2f4d062a 1901` | PASS |
| `check-version.mjs` exits 0 (50 SQL == 50 Migration{} blocks, no CR bytes) | `node scripts/check-version.mjs` | `[version] OK: 0.5.7 \| [migration-count] OK: 50 .sql files === 50 Migration{} entries \| [cr-byte] OK: no CR bytes` | PASS |
| Leader-targets schema tests green | `pnpm test -- tests/data-layer/leader-targets.test.ts` | 5/5 tests passing | PASS |
| LeaderAttachmentSheet component tests green | `pnpm test -- tests/army-lists/LeaderAttachmentSheet.test.tsx` | 12/12 tests passing (canonical path + NULL fallback + advisory + mutate callbacks) | PASS |
| Migration-parity test green with migration 050 | `pnpm test -- tests/data-layer/migration-parity.test.ts` | 4/4 active tests passing | PASS |
| Full suite regression-free | `pnpm test` | 307 test files passed, 2,829 tests passed, 0 failures | PASS |
| Dead writer removed, rules-hub read path intact | `grep -rn "replaceSyncedLeaderTargets" src/` | No matches | PASS |
| No INSERT/DELETE writers to `synced_leader_targets` remain | `grep -rn "INSERT INTO synced_leader_targets\|DELETE FROM synced_leader_targets" src/` | No matches | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PLAY-02 | Plans 01, 02 | `udb_leader_targets` table (composite PK, both FK CASCADE) populated from Wahapedia CSV via canonical pipeline | SATISFIED | Migration 050 DDL verified; 1,901 pairs in bundled JSON; Rust importer confirmed; D-06 content-hash inclusion verified |
| PLAY-03 | Plans 03, 04 | Leader attachment validates against canonical FK join; Phase-92 UI repointed off name matching; graceful NULL fallback | SATISFIED | `getLeaderTargetsForList` uses FK join with SELECT DISTINCT; `useLeaderTargets` is list-keyed; `LeaderAttachmentSheet` uses id-based `validTargetIds`; NULL → `validTargetIds = null` (permissive) confirmed; `isLeader` via canonical `Set<number>`; dead writer removed |

Both PLAY-02 and PLAY-03 fully satisfied. Requirements table in `REQUIREMENTS.md` marks both Complete for Phase 137 — consistent with codebase evidence.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | No TBD/FIXME/XXX/placeholder/TODO debt markers found in phase-modified files | — | — |

The `staleTime: Infinity` in `useLeaderTargets.ts` was flagged as WR-02 in the code review. It is a pre-existing codebase pattern (identical to `useUdbMeta`) and is deliberate per D-08 (canonical data is immutable between imports). It is NOT a blocker — it is a known design trade-off with a narrow race window on first-launch, documented in the review.

---

### Code Review Disposition Summary

The 137-REVIEW.md found 2 critical issues, 4 warnings, and 3 info items. All items are resolved or documented:

| Finding | Status | Disposition |
|---------|--------|-------------|
| CR-01: `Datasheets_leader.csv` absent from `REQUIRED_CSVs` | FIXED | `Datasheets_leader.csv` confirmed at `build-unit-db.ts:76` in `REQUIRED_CSVs` |
| CR-02: Missing `SELECT DISTINCT` in `getLeaderTargetsForList` | FIXED | `SELECT DISTINCT` confirmed at `leaderTargets.ts:43` |
| WR-03: Ghost leader cannot open Attach sheet (isLeader always false) | OPEN — design tension | The `Attach Leader` button is gated by `isLeader = leaderAluIds?.has(unit.id) ?? false`. Since ghost units (NULL `udb_unit_id`) never appear in `leaderTargetPairs`, `isLeader` is always `false` for them, making the sheet's permissive NULL fallback unreachable for ghost leaders. This is NOT a regression (pre-137 the empty `synced_leader_targets` meant no unit could attach). But the code's comment "ghost/manual units must never be blocked" is contradicted by the button never rendering. See human verification item 3 below. |
| WR-01: FK-ON best-effort after commit failure | Accepted | Pre-existing Rust pattern; low risk for single-user offline app |
| WR-02: `staleTime: Infinity` race on first-launch | Accepted | Documented design decision per D-08 |
| WR-04: `getLeaderTargetsByFaction` flagged as dead | Correctly retained | Still consumed by rules-hub via `useBsdataFaction.ts` → `DatasheetPointsTab`; correctly kept per D-10 |
| IN-01/02/03 | Informational | Style/comment gaps; no behavioral impact |

---

### Human Verification Required

#### 1. Canonical leader attachment in live app

**Test:** Open `pnpm tauri dev`. Create or open an army list containing a canonical leader (e.g. a Space Marine Captain with a known `udb_unit_id`). Click the Attach Leader button.
**Expected:** Only units that are canonically valid targets for that specific leader appear in the sheet. Non-canonical units are absent.
**Why human:** The FK join works against the real SQLite database with 1,901 imported pairs. Unit tests mock `useLeaderTargets`. The end-to-end path (Rust import → SQLite `udb_leader_targets` → TypeScript FK join → sheet UI) must be exercised in the live app.

#### 2. Ghost target unit is selectable for canonical leader

**Test:** Add a ghost/manual unit (not linked to UDB) and a canonical leader to the same army list. Click Attach Leader on the canonical leader.
**Expected:** The ghost unit appears as a selectable target in the sheet, even though it has `udb_unit_id: null`. (Ghost TARGETS — units that could receive a leader — are selectable because they are simply absent from the canonical pairs, not blocked.)
**Why human:** The permissive-for-targets behavior requires a live list with mixed canonical/ghost units.

#### 3. Ghost leader — Attach Leader button visibility (WR-03 design decision)

**Test:** Add a ghost/manual unit as a "leader" character (no UDB link, `udb_unit_id: null`). Inspect the army list table row for that unit.
**Expected (current behavior):** The Attach Leader button does NOT appear, because `isLeader` is derived from canonical `leaderTargetPairs` and ghost units never appear in them.
**Expected (design intent in code comments):** The code comments say "ghost/manual units must never be blocked from attaching," but the button never renders.
**Why human:** This is a product decision. Either:
  - Accept the current behavior (ghost leaders simply cannot use the canonical attachment flow — acceptable because pre-137 no unit could attach either), OR
  - Add a secondary fallback to show the Attach Leader button for ghost Character units (the minimal fix in WR-03: `leaderAluIds?.has(unit.id) || (unit.udb_unit_id == null && isCharacter && !isEpicHero)`).

If the current behavior is accepted, the code comment "ghost/manual units must never be blocked" should be updated to reflect the actual scope of the NULL fallback (it applies to ghost LEADERS when the sheet is open, but the sheet cannot be opened for ghost leaders).

---

### Gaps Summary

No gaps. All 7 must-have truths are VERIFIED. All code review blockers (CR-01, CR-02) were fixed before phase submission. The status is `human_needed` solely because the end-to-end canonical FK join path in the live Tauri app cannot be verified programmatically, and the WR-03 design tension requires a product decision.

---

_Verified: 2026-06-18_
_Verifier: Claude (gsd-verifier)_
