---
phase: 111-bilingual-infrastructure
verified: 2026-06-01T15:00:00Z
status: human_needed
score: 9/9 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Toggle EN/FR in the running app and confirm canonical unit names switch language"
    expected: "After clicking FR, faction list and unit names show French equivalents (e.g., 'Nécrons', 'Garde Custodien'); clicking EN reverts to English"
    why_human: "COALESCE and invalidateQueries wiring is verified programmatically but the end-to-end visual switch requires a running Tauri window with a populated rules.db"
  - test: "Search for a French unit name after switching to FR and syncing unit data"
    expected: "Typing 'Garde' into the search bar returns 'Custodian Guard' unit record (English name in result, French in keyword index)"
    why_human: "FTS5 bilingual indexing requires a live rules.db populated by bulk_sync_rules; cannot be verified via grep or unit tests"
  - test: "Close and reopen the app; confirm locale preference is remembered"
    expected: "If FR was selected before closing, the sidebar shows FR as active after restart (persisted via localStorage 'app:locale')"
    why_human: "localStorage persistence requires a real browser/Tauri webview session; jsdom tests mock zustand persist"
  - test: "Collapse the sidebar and verify locale toggle shows current locale code with tooltip"
    expected: "Collapsed sidebar shows 'EN' or 'FR' as an icon-sized ghost button; hovering reveals 'Switch to French' or 'Switch to English' tooltip"
    why_human: "Visual layout and tooltip visibility require a running app; RTL tests verify the render but not the visual appearance in context"
---

# Phase 111: Bilingual Infrastructure Verification Report

**Phase Goal:** Users can toggle between English and French for all canonical data display; the build pipeline populates French fields from a manual overlay; search works in both languages
**Verified:** 2026-06-01T15:00:00Z
**Status:** human_needed (all automated checks pass; 4 items require running app)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Build script with translations_fr.json writes French names into _fr columns | ✓ VERIFIED | `scripts/build-unit-db.ts` line 618–668: Step 10.5 loop applies overlay to all 5 entity arrays; summary log confirmed |
| 2 | Build script without translations_fr.json warns but completes with _fr fields null | ✓ VERIFIED | `loadTranslationsFr()` lines 91–101: existsSync check + console.warn + return null; 13 tests cover this |
| 3 | Overlay applied as last mutation step before JSON output assembly | ✓ VERIFIED | Step 10.5 at line 618 is after sub-faction stats (line 615) and before Build Summary (line 673) |
| 4 | Query functions accept locale and return COALESCE'd French names when locale is 'fr' | ✓ VERIFIED | `unitDatabase.ts`: getUdbFactions (line 139), getUdbUnitsByFaction (line 155), getUdbUnitDetail (lines 184–188) all use conditional COALESCE SQL |
| 5 | React Query hooks include locale in query keys so cache auto-refreshes on locale switch | ✓ VERIFIED | `useUnitDatabase.ts` lines 29–34: UDB_FACTIONS_KEY, UDB_UNITS_KEY, UDB_UNIT_DETAIL_KEY are all locale-parameterized functions |
| 6 | Locale store persists 'en' or 'fr' to localStorage under key 'app:locale' | ✓ VERIFIED | `src/stores/localeStore.ts` line 17: `{ name: "app:locale" }` in persist config; default locale 'en' confirmed by tests |
| 7 | When locale is 'fr' and name_fr is null, English name is returned via COALESCE fallback | ✓ VERIFIED | All COALESCE expressions use pattern `COALESCE(col_fr, col)` — null _fr falls back to English; 9 locale-queries tests verify SQL output |
| 8 | EN/FR toggle is visible in sidebar; clicking switches locale and invalidates cache | ✓ VERIFIED | `LocaleToggle.tsx`: handleLocaleSwitch (lines 14–19) calls setLocale + invalidateQueries for ["udb-factions"], ["udb-units"], ["udb-unit-detail"]; AppSidebar.tsx line 223 renders it; 6 RTL tests pass |
| 9 | FTS5 search index includes French names for bilingual search | ✓ VERIFIED | `lib.rs` lines 733–734: keywords column prepended with `COALESCE(u.name_fr \|\| ' ', '') \|\| COALESCE(f.name_fr \|\| ' ', '')` before sub_faction and keyword tags |

**Score:** 9/9 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/data/translations_fr.json` | French overlay stub with sample entries | ✓ VERIFIED | 22 factions, 3 units, 1 ability, 1 weapon, 12 keywords; valid JSON with required 5 top-level keys |
| `scripts/lib/types.ts` | TranslationsFrOverlay interface | ✓ VERIFIED | Lines 137–143: exported interface with all 5 optional sections typed correctly |
| `scripts/build-unit-db.ts` | Step 10.5 overlay loading + TRANSLATIONS_FR_PATH | ✓ VERIFIED | Lines 61, 90–102, 618–668: constant, loader function, full overlay application loop |
| `tests/build-pipeline/translations-overlay.test.ts` | Test file with describe blocks | ✓ VERIFIED | 13 tests covering overlay loading, graceful degrade, per-entity application |
| `src/stores/localeStore.ts` | Zustand persist store exporting useLocaleStore + Locale | ✓ VERIFIED | 19-line file: Locale type, useLocaleStore with persist middleware, default 'en', key 'app:locale' |
| `src/db/queries/unitDatabase.ts` | COALESCE queries for locale | ✓ VERIFIED | 3 functions extended: getUdbFactions, getUdbUnitsByFaction, getUdbUnitDetail; searchUdbUnits correctly has NO locale param |
| `src/hooks/useUnitDatabase.ts` | Locale-keyed React Query hooks | ✓ VERIFIED | UDB_FACTIONS_KEY/UDB_UNITS_KEY/UDB_UNIT_DETAIL_KEY are locale-parameterized; 3 hooks read locale from store |
| `tests/unit-database/locale-queries.test.ts` | Tests for locale-aware queries | ✓ VERIFIED | 9 tests pass |
| `tests/unit-database/locale-store.test.ts` | Tests for locale store | ✓ VERIFIED | 4 tests pass |
| `src/components/common/LocaleToggle.tsx` | EN/FR pill toggle component | ✓ VERIFIED | 72-line component: expanded pill + collapsed icon with tooltip; exports LocaleToggle function |
| `src/components/common/AppSidebar.tsx` | Sidebar with LocaleToggle integrated | ✓ VERIFIED | Line 223: `<LocaleToggle collapsed={collapsed} />` above collapse toggle div |
| `src-tauri/src/lib.rs` | FTS5 rebuild with French names in keywords column | ✓ VERIFIED | Lines 733–734: COALESCE(u.name_fr || ' ', '') || COALESCE(f.name_fr || ' ', '') prepended to keywords |
| `tests/unit-database/locale-toggle.test.ts` | Tests for LocaleToggle | ✓ VERIFIED | 6 tests pass (expanded/collapsed rendering, click behavior, no-op on active locale) |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `scripts/build-unit-db.ts` | `scripts/data/translations_fr.json` | `loadTranslationsFr()` / `TRANSLATIONS_FR_PATH` | ✓ WIRED | TRANSLATIONS_FR_PATH used in loadTranslationsFr; graceful null degrade on missing file |
| `src/hooks/useUnitDatabase.ts` | `src/stores/localeStore.ts` | `useLocaleStore` import | ✓ WIRED | Line 26 import; lines 42, 54, 71 consume locale from store |
| `src/hooks/useUnitDatabase.ts` | `src/db/queries/unitDatabase.ts` | locale parameter pass-through | ✓ WIRED | Lines 45, 61, 78 pass locale to query functions |
| `src/components/common/LocaleToggle.tsx` | `src/stores/localeStore.ts` | `useLocaleStore` import | ✓ WIRED | Line 8 import; line 11 destructures locale + setLocale |
| `src/components/common/LocaleToggle.tsx` | `@tanstack/react-query` | `useQueryClient().invalidateQueries` | ✓ WIRED | Line 1 import; lines 16–18: 3 prefix keys invalidated on locale switch |
| `src/components/common/AppSidebar.tsx` | `src/components/common/LocaleToggle.tsx` | component import and render | ✓ WIRED | Line 25 import; line 223 rendered with collapsed prop |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `useUnitDatabase.ts` useUdbFactions | `locale` from `useLocaleStore` | Zustand persist store (localStorage 'app:locale') | Yes — real locale string drives COALESCE SQL | ✓ FLOWING |
| `unitDatabase.ts` getUdbFactions | `nameSql` conditional | TypeScript union 'en' \| 'fr' drives SQL template | Yes — COALESCE(name_fr, name) for 'fr'; plain name for 'en' | ✓ FLOWING |
| `LocaleToggle.tsx` | `locale` from `useLocaleStore` | Zustand store | Yes — renders EN/FR active state and drives handleLocaleSwitch | ✓ FLOWING |
| `lib.rs` FTS5 INSERT | `name_fr`, `f.name_fr` | udb_units and udb_factions tables | Real DB columns from import_unit_database_inner; populated by Rust serde bindings | ✓ FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED (requires running Tauri app + populated rules.db; no standalone runnable entry point for these features)

---

### Probe Execution

Step 7c: N/A — no probe scripts declared or applicable in phase PLAN files.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| FR-02 | Plan 01 | Build script loads French translations from translations_fr.json overlay and populates _fr columns | ✓ SATISFIED | loadTranslationsFr() + Step 10.5 in build-unit-db.ts; 13 tests |
| FR-03 | Plan 02 | Query layer accepts optional locale parameter, uses COALESCE(col_fr, col) for bilingual fallback | ✓ SATISFIED | 3 query functions extended; locale-keyed hooks; 9+4 tests |
| FR-04 | Plan 03 | App shows EN/FR locale toggle persisted to localStorage, switching all canonical data display language | ✓ SATISFIED (partial — human verification for visual/runtime) | LocaleToggle in AppSidebar; invalidateQueries on switch; 6 tests |
| FR-05 | Plan 03 | FTS5 search index includes French names for bilingual search | ✓ SATISFIED | lib.rs FTS5 INSERT keywords column extended with COALESCE(u.name_fr) and COALESCE(f.name_fr) |

**Requirements not claimed by Phase 111:** FR-01 (Phase 108) and FR-06 (Phase 108) — correctly not in scope here; traceability table in REQUIREMENTS.md confirms.

**Orphaned requirements check:** None. All 4 phase-111 requirements (FR-02, FR-03, FR-04, FR-05) are fully accounted for across the 3 plans.

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| None | — | — | No debt markers (TODO/FIXME/TBD/XXX) found in any modified file |

Stub detection: `translations_fr.json` has sparse unit/ability/weapon coverage by design (22 factions, 3 units). This is documented as intentional in SUMMARY.md — the infrastructure is complete; data population is an ongoing curation process. The file is NOT a code stub; it is a data seed file. No blocker.

---

### Human Verification Required

#### 1. Language Switch Visual Verification

**Test:** Run `pnpm tauri dev`, navigate to the Unit Database browser, click FR in the sidebar toggle, and observe faction and unit names.
**Expected:** Faction names switch to French equivalents (e.g., "Space Marines du Chaos" for CSM, "Nécrons" for NEC); unit names for translated units (e.g., "Garde Custodien") appear in French; untranslated units fall back to English.
**Why human:** COALESCE SQL is verified in tests against mock DB; actual name rendering in the live browser UI with a real populated rules.db cannot be verified statically.

#### 2. Bilingual FTS5 Search

**Test:** After running `bulk_sync_rules` (import unit data), switch to FR, type "Garde" into the search box.
**Expected:** The search returns the Custodian Guard unit (its name_fr "Garde Custodien" is in the FTS5 keywords column, so it matches).
**Why human:** FTS5 search requires a live rules.db populated by the Rust import command; the keyword index is rebuilt on import and cannot be tested without running the Tauri backend.

#### 3. Locale Persistence Across App Restarts

**Test:** Set locale to FR, close the Tauri window, reopen the app.
**Expected:** The sidebar FR button is active on relaunch (locale 'fr' was persisted to localStorage under 'app:locale').
**Why human:** localStorage persistence in jsdom is mocked away by the Zustand test mock; only a real webview session verifies actual write/read behavior.

#### 4. Collapsed Sidebar Locale Toggle Appearance

**Test:** Collapse the sidebar; observe the locale toggle area.
**Expected:** A ghost icon-sized button shows "EN" or "FR" (current locale); hovering shows "Switch to French" or "Switch to English" tooltip.
**Why human:** Visual layout, tooltip positioning, and icon sizing require a running app; RTL tests confirm the DOM structure but not pixel-level appearance.

---

### Gaps Summary

No gaps found. All 9 must-have truths are VERIFIED and all 13 required artifacts pass Level 1 (exists), Level 2 (substantive), Level 3 (wired), and Level 4 (data flowing) checks.

The 4 human verification items are all runtime/visual checks that cannot be automated via grep or unit tests. They do not indicate missing implementation — the implementation is complete and tested at the unit level.

---

_Verified: 2026-06-01T15:00:00Z_
_Verifier: Claude (gsd-verifier)_
