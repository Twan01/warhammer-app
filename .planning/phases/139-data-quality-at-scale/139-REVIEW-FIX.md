---
phase: 139-data-quality-at-scale
fixed_at: 2026-06-18T13:55:00Z
review_path: .planning/phases/139-data-quality-at-scale/139-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 139: Code Review Fix Report

**Fixed at:** 2026-06-18T13:55:00Z
**Source review:** `.planning/phases/139-data-quality-at-scale/139-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (CR-01, CR-02, WR-01, WR-02, WR-03, WR-04)
- Fixed: 7
- Skipped: 0

## Fixed Issues

### CR-01: Referential-integrity gate ignores detachment/stratagem/enhancement FK graph

**Files modified:** `scripts/lib/validateRefs.ts`, `scripts/build-unit-db.ts`
**Commit:** `9c8985e6`
**Applied fix:**
Extended `ValidateRefsInput` with four new array fields (`detachments`, `detachmentAbilities`, `stratagems`, `enhancements`) and extended `validateReferentialIntegrity()` with Check 5 covering all 7 FK edges from migrations 042/043:
- `udb_detachments.faction_id` (NOT NULL)
- `udb_detachment_abilities.detachment_id` (NOT NULL)
- `udb_detachment_abilities.faction_id` (NOT NULL)
- `udb_stratagems.faction_id` (nullable — null allowed, non-null must resolve)
- `udb_stratagems.detachment_id` (nullable — same)
- `udb_enhancements.faction_id` (NOT NULL)
- `udb_enhancements.detachment_id` (nullable)

Also fixed the ordering trap: moved the `validateReferentialIntegrity()` call in `build-unit-db.ts` from before step 11 (~line 619) to after step 13 (after enhancements are assembled), so all four arrays are actually populated when the validator runs. The updated call passes all four new arrays.

Build verified: `pnpm build:udb` exits 0, "Referential integrity: OK" printed.

---

### WR-01: Orphan sub_faction check is a tautological no-op

**Files modified:** `scripts/lib/validateRefs.ts` (committed as part of CR-01 fix)
**Commit:** `9c8985e6`
**Applied fix:**
Replaced the self-derived per-faction set (which always contains every value by construction) with an authoritative allow-list built from `Object.values(KEYWORD_SUB_FACTION_MAP)` and `Object.values(SUB_FACTION_MAP)` imported from `factionMap.ts`. Any `sub_faction` value not produced by these maps is now flagged. Removed the misleading comment admitting the check was a no-op. Updated the docstring in Check 4 to accurately describe the authoritative-allow-list approach.

Build verified: `pnpm build:udb` exits 0 — all 1710 units have recognized sub_faction values.

---

### CR-02: fk-integrity test does not import the 4 new tables

**Files modified:** `tests/data-layer/fk-integrity.test.ts`
**Commit:** `dcd46f9a`
**Applied fix:**
Added inserts for `udb_detachments`, `udb_detachment_abilities`, `udb_stratagems`, and `udb_enhancements` from the artifact in dependency order (detachments after factions, then detachment_abilities/stratagems/enhancements), all before the `foreign_keys = ON` flip. Added 7 targeted orphan assertions (belt-and-suspenders over PRAGMA) covering every FK edge in migrations 042/043 — including NULL-aware checks for the nullable columns.

Test verified: all 316 test files pass, 2893 tests pass.

---

### WR-02: fk-integrity test docstring overclaims "full import"

**Files modified:** `tests/data-layer/fk-integrity.test.ts` (committed as part of CR-02 fix)
**Commit:** `dcd46f9a`
**Applied fix:**
Replaced the "full in-memory import" claim with an accurate statement: "Each INSERT binds only the columns required for FK checking (PK + FK columns), not the full column set. This validates referential integrity only; it does not verify column shape, NOT NULL constraints, or type fidelity."

---

### WR-03: "Mirrors lib.rs DELETE order lines 769-790" comments are wrong

**Files modified:** `tests/data-layer/fk-integrity.test.ts`, `tests/data-layer/reimport-preservation.test.ts` (committed as part of CR-02 fix)
**Commit:** `dcd46f9a`
**Applied fix:**
- `fk-integrity.test.ts` comment: replaced "mirrors lib.rs import" with "FK OFF during INSERT (mirrors lib.rs bulk_sync_rules which disables FK enforcement for the delete+insert cycle; order is irrelevant under FK-OFF...)"
- `reimport-preservation.test.ts` file header and `simulateReimport` function: replaced "mirrors the DELETE order in src-tauri/src/lib.rs lines 769-790" with accurate behavioral note ("deletes all udb_* tables under FK-OFF; the order is functionally irrelevant because FK enforcement is disabled during the delete pass").

Test verified: all 316 test files pass.

---

### WR-04: Audit weapon-matching category tier mismatch

**Files modified:** `scripts/audit-faction.ts`
**Commit:** `ac16c0c6`
**Applied fix:**
Refactored the 3-tier weapon matching in `auditFaction()`:

1. Extracted a `nameMatches` array (all CSV rows sharing the weapon name) up-front.
2. Tier 2 (name+category): now compares `dbWeapon.category` against BOTH `r["wargear_role"] ?? r["type"]` and bare `r["type"]`, mirroring the exact `wargear_role ?? type` derivation in `weaponMapping.ts:47`. This prevents systematic tier-2 misses when `wargear_role` is populated.
3. Tier 3 (name-only): only used when `nameMatches.length === 1` (unambiguous). When multiple CSV rows share the name and tiers 1+2 both miss, the comparison is skipped (`continue`) rather than binding to an arbitrary row.

Verified: `pnpm audit:all` — all 25 factions audit at 0 per-unit errors and 0 systematic issues.

---

## Skipped Issues

None — all in-scope findings were fixed.

---

_Fixed: 2026-06-18T13:55:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
