---
phase: 135-faction-navigation-consolidation
verified: 2026-06-17T13:00:00Z
status: human_needed
score: 3/3 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Faction management fully preserved in Settings -> Factions tab"
    expected: "Settings -> Factions tab (2nd position) renders the full FactionsPage: faction list shows, edit name/color works, delete an empty faction works, create via the tab's Add Faction button works, color save updates --faction-accent theming"
    why_human: "Component rendering, reactive color update, and interactive CRUD flows cannot be verified with grep or test-only checks"
  - test: "Quick Add -> Add Faction opens the FactionSheet (create path independent of retired route)"
    expected: "Clicking the sidebar Quick Add (+) button -> Add Faction opens the FactionSheet sheet; a faction can be created from it"
    why_human: "Sidebar interaction and sheet open/close flow require a running Tauri window"
  - test: "Data Health is gone from the sidebar and reachable in <= 2 clicks via Settings -> Data"
    expected: "Sidebar Management group shows only Spending and Wishlist (no Data Health entry). Settings -> Data tab -> clicking Open Data Health navigates to the full /data-health page"
    why_human: "Sidebar visual state and navigation flow require a running Tauri window"
---

# Phase 135: Faction & Navigation Consolidation — Verification Report

**Phase Goal:** Faction management lives in one coherent home with zero data loss, and the sidebar stops carrying redundant destinations.
**Verified:** 2026-06-17T13:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | A map-not-delete migration consolidates user factions into the canonical faction model preserving every FK reference (units RESTRICT, painting_recipes SET NULL, army_lists SET NULL, wishlist_items CASCADE, default_faction_id) with zero data loss | ✓ VERIFIED | `048_consolidate_factions.sql` uses `SELECT MIN(...)` anchored survivor selection across all 5 Steps (CR-01 fix confirmed at lines 59-71, 77-90, 93-108, 111-126, 132-149); Step 6 DELETE uses same MIN predicate (lines 152-156); Step 0 backfill moved first (WR-02 fix confirmed at lines 46-54). Migration048 test suite: 3 tests, all PASS — 2-row case + CR-01 3-row regression + unmapped faction preservation. `pnpm test` exit 0. |
| 2 | The standalone /factions sidebar page is removed, and faction create/edit/theming remains reachable from Settings -> Factions tab with no loss of capability (Quick Add "Add Faction" preserved) | ✓ VERIFIED (automated portion) | `src/app/router.tsx`: no `factionsRoute` reference anywhere; `dataHealthRoute` present at line 194. `src/app/factions/` directory: deleted (glob returns no files). `src/app/settings/page.tsx`: `<TabsTrigger value="factions">Factions</TabsTrigger>` at line 20 (2nd position); `<TabsContent value="factions"><FactionsPage /></TabsContent>` at lines 38-40; `FactionsPage` imported at line 9. `AppSidebar.tsx` MANAGEMENT_NAV: no `/factions` entry (lines 56-59). Shield icon retained at line 115 for Quick Add. Human verification required for runtime behavior. |
| 3 | Data Health is moved out of the main sidebar into Settings -> Data (sidebar entry removed; /data-health route + Settings -> Data "Open Data Health" card kept) | ✓ VERIFIED (automated portion) | `AppSidebar.tsx`: no `HeartPulse` import, no `Data Health` string (grep confirms 0 matches). MANAGEMENT_NAV contains exactly Spending + Wishlist (lines 56-59). `router.tsx`: `dataHealthRoute` at line 194, registered in route tree at line 243. `DataManagementTab.tsx`: `onClick={() => navigate({ to: "/data-health" })}` + "Open Data Health" button confirmed at lines 177-179. Human verification required for runtime navigation. |

**Score:** 3/3 truths verified (automated checks)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src-tauri/migrations/048_consolidate_factions.sql` | Map-not-delete faction consolidation (re-point 4 FK surfaces + default_faction_id, then delete duplicates, backfill placed at Step 0) | ✓ VERIFIED | 157 lines; MIN(id) survivor anchoring in all 5 re-point steps; Step 0 backfill before consolidation; no BEGIN/COMMIT; no PRAGMA foreign_keys; scoped to `key = 'default_faction_id'` for app_settings UPDATE |
| `src-tauri/src/lib.rs` | Migration{} entry version 48 (count 47 -> 48) | ✓ VERIFIED | Lines 290-295: `version: 48, description: "consolidate_factions", sql: include_str!("../migrations/048_consolidate_factions.sql")` |
| `tests/data-layer/migration048.test.ts` | Zero-data-loss proof across all 4 FK surfaces + default_faction_id + 3-row CR-01 regression | ✓ VERIFIED | 394 lines; 3 describe-level tests: (1) 2-row duplicate case with all 4 FK surfaces + default_faction_id (2) 3-row CR-01 regression with dependents under mid AND high duplicates (3) unmapped faction preservation |
| `src/app/settings/page.tsx` | Factions tab (TabsTrigger value=factions + TabsContent rendering FactionsPage) | ✓ VERIFIED | `value="factions"` at line 20; `<FactionsPage />` at line 39; 2nd position between Preferences and Data |
| `src/app/router.tsx` | factionsRoute removed, dataHealthRoute kept | ✓ VERIFIED | No `factionsRoute` anywhere; `dataHealthRoute` at line 194 and in route tree at line 243 |
| `src/components/common/AppSidebar.tsx` | MANAGEMENT_NAV = Spending + Wishlist only; no Factions, no Data Health, no HeartPulse import; Shield retained | ✓ VERIFIED | MANAGEMENT_NAV lines 56-59: exactly 2 entries (Spending, Wishlist); HeartPulse: 0 matches; Shield: used at line 115 in Quick Add |
| `src/app/factions/page.tsx` | Deleted | ✓ VERIFIED | File does not exist (glob and grep return no matches) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src-tauri/src/lib.rs` | `048_consolidate_factions.sql` | `include_str!("../migrations/048_consolidate_factions.sql")` | ✓ WIRED | Exact string confirmed at line 293 |
| `tests/data-layer/migration048.test.ts` | `048_consolidate_factions.sql` | `readFileSync` + `db.exec` | ✓ WIRED | Lines 127-131 and 320-322 read and execute the file |
| `src/app/settings/page.tsx` | `src/features/factions/FactionsPage.tsx` | import + `<FactionsPage/>` in TabsContent | ✓ WIRED | Import at line 9; usage at line 39 |
| `AppSidebar.tsx` | Quick Add "Add Faction" | Shield icon in DropdownMenuItem, `openQuickAdd("add-faction")` | ✓ WIRED | Lines 114-117: `DropdownMenuItem onClick={() => openQuickAdd("add-faction")}` with Shield icon |
| `DataManagementTab.tsx` | `/data-health` route | `onClick={() => navigate({ to: "/data-health" })}` button | ✓ WIRED | Lines 175-180 confirmed |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `SettingsPage` (Factions tab) | `factions` list | `useFactions()` hook in `FactionsPage` | Yes — `useFactions()` queries SQLite via `getFactions()` in `src/db/queries/factions.ts` | ✓ FLOWING |
| `048_consolidate_factions.sql` | Survivor faction rows | `MIN(f_sur.id)` correlated subquery on live `factions` table | Yes — reads and re-points actual DB rows; no hardcoded values | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Migration 048 test suite (all 3 cases) | `pnpm test -- tests/data-layer/migration048.test.ts` | Exit 0; 3 tests passed (2783 total) | ✓ PASS |
| Parity gate: lib.rs count == disk count == 48 | `node scripts/check-version.mjs` | `[migration-count] OK: 48 .sql files === 48 Migration{} entries in lib.rs` | ✓ PASS |
| Parity gate: no CR bytes | `node scripts/check-version.mjs` | `[cr-byte] OK: no CR bytes in any migration file` | ✓ PASS |
| Migration parity test (D-04/D-06) | `pnpm test -- tests/data-layer/migration-parity.test.ts` (parity tests only) | 3 parity tests PASS; 1 skipped (rules.db — expected); only unrelated `recentActivityQuery` flake in run | ✓ PASS (parity tests) |
| factionsRoute absent from router | grep factionsRoute src/app/router.tsx | 0 matches | ✓ PASS |
| factions/page.tsx deleted | glob src/app/factions/page.tsx | No files found | ✓ PASS |
| MANAGEMENT_NAV has no Factions or Data Health entries | grep for HeartPulse/Data Health in AppSidebar | 0 matches | ✓ PASS |
| Shield retained in AppSidebar (Quick Add) | grep Shield src/components/common/AppSidebar.tsx | Match at line 115 | ✓ PASS |
| dataHealthRoute present in router | grep dataHealthRoute src/app/router.tsx | 2 matches (definition + route tree) | ✓ PASS |
| Open Data Health card in DataManagementTab | grep "data-health\|Open Data Health" DataManagementTab.tsx | Matches at lines 177-179 | ✓ PASS |

### Probe Execution

No explicit probe scripts declared for this phase. Step 7b behavioral checks cover all verifiable behaviors.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| HON-05 | 135-01 | User factions consolidated via map-not-delete migration preserving every FK reference with zero data loss | ✓ SATISFIED | Migration 048 with MIN(id) survivor anchoring; migration048.test.ts 3 passing tests including CR-01 regression |
| HON-06 | 135-02 | Standalone /factions sidebar page removed; faction management reachable from new home with no capability loss | ✓ SATISFIED (automated) | factionsRoute removed; factions/page.tsx deleted; Settings Factions tab wired to FactionsPage; Quick Add retained. Human runtime check required for capability completeness |
| HON-07 | 135-03 | Data Health moved out of main sidebar into Settings -> Data | ✓ SATISFIED (automated) | HeartPulse removed; MANAGEMENT_NAV has 2 entries; /data-health route kept; Open Data Health card confirmed in DataManagementTab. Human runtime check required |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found in phase-135 modified files | — | — | — | — |

Scanned: `048_consolidate_factions.sql`, `migration048.test.ts`, `lib.rs` (entry only), `settings/page.tsx`, `router.tsx`, `AppSidebar.tsx`. No TODO/FIXME/TBD/placeholder/stub patterns found in any of these files.

**Code Review BLOCKER (CR-01) — RESOLVED:** The REVIEW.md identified a non-deterministic survivor selection defect in migration 048 when 3+ rows share a `wahapedia_faction_id`. The fix (anchor all re-point subqueries and the DELETE to `MIN(id)`) is confirmed applied in the production SQL. A regression test (the 2nd `it(...)` block in `migration048.test.ts`, labeled "CR-01") seeds exactly the 3-row case and asserts zero orphaned FKs. Both pass.

**Code Review WR-02 (backfill ordering) — RESOLVED:** Step 7 (backfill) was moved to Step 0 in the shipped SQL, running before consolidation steps 1-6, preventing duplicate re-creation. Comment at line 38-45 documents the fix rationale.

**Code Review WR-03 (survivor updated_at) — NOT FIXED:** The survivor faction's `updated_at` is not bumped. This is a data-freshness cosmetic issue (React Query cache recency), not a data loss or blocking defect. The REVIEW classified it as WARNING, not CRITICAL. No phase-135 requirement mandates updated_at recency after consolidation. Flagged as informational only.

**Code Review IN-02 (stale TODO in NAV-01 test) — NOT FIXED:** Stale `// TODO Wave 1: mock useQuickAdd...` comment in `tests/navigation/AppSidebar.nav01.test.tsx`. The REVIEW classified it as INFO. Not a blocker.

### Human Verification Required

#### 1. Faction Management Fully Preserved in Settings -> Factions Tab

**Test:** Run `pnpm tauri dev`. Open Settings -> click the "Factions" tab (2nd tab, between Preferences and Data). Confirm:
  - The faction list renders with the "Factions" / "Manage your army factions" header
  - An existing faction can be edited (name, color)
  - Saving a color change updates the `--faction-accent` theming in the app
  - A new faction can be created from the tab's "Add Faction" button
  - An empty faction can be deleted (FactionDeleteDialog appears for non-empty factions)
**Expected:** All faction CRUD and theming flows work identically to the former `/factions` page.
**Why human:** Component rendering, interactive CRUD, and reactive CSS variable updates cannot be confirmed by static analysis.

#### 2. Quick Add -> Add Faction Opens FactionSheet

**Test:** From any page, click the sidebar Quick Add (+) button. Click "Add Faction" in the dropdown. Confirm the FactionSheet opens and a faction can be created.
**Expected:** Sheet opens; faction creation works; no navigation to the deleted /factions route occurs.
**Why human:** DropdownMenu interaction and sheet mount behavior require a running Tauri window.

#### 3. Data Health Demoted and Reachable in <= 2 Clicks

**Test:** Run `pnpm tauri dev`. Confirm the sidebar Management group shows only "Spending" and "Wishlist" (no "Data Health"). Open Settings -> Data tab -> click "Open Data Health". Confirm it navigates to the full Data Health diagnostics page.
**Expected:** Data Health absent from sidebar; Settings -> Data -> Open Data Health navigates to /data-health in <= 2 clicks from the Settings page.
**Why human:** Sidebar visual state and navigation transition require a running Tauri window.

### Gaps Summary

No gaps. All automated verifications pass. The phase goal is achieved in the codebase: the map-not-delete migration is correct and proven; the UI rehoming is structurally complete and wired; the sidebar is trimmed. Three items require human runtime confirmation before the phase can be fully closed.

---

_Verified: 2026-06-17T13:00:00Z_
_Verifier: Claude (gsd-verifier)_
