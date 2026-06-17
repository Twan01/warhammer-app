# Phase 135: Faction & Navigation Consolidation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-17
**Phase:** 135-faction-navigation-consolidation
**Areas discussed:** Consolidation structural model, Map-not-delete safety contract, Zero-data-loss verification, New home for faction management, Data Health placement, Migration parity gate
**Mode:** `--auto` — all gray areas auto-selected, recommended option chosen for each (no interactive prompts).

---

## Consolidation structural model (HON-05)

| Option | Description | Selected |
|--------|-------------|----------|
| Align + dedup the integer-PK `factions` table to canonical; keep FK types | Collection factions all map to a `udb_factions` row; duplicates merged; integer FKs unchanged | ✓ |
| Rewrite all `faction_id` FKs INTEGER→canonical TEXT id | True single-model unification; rewrites 5 FK columns | |

**User's choice:** Align + dedup (recommended default).
**Notes:** FK column-type rewrite rejected as unacceptable risk for a zero-data-loss requirement; the canonical `udb_factions` is identity source-of-truth, collection `factions` row is its themed projection. (D-01/D-02)

---

## Map-not-delete safety contract (HON-05)

| Option | Description | Selected |
|--------|-------------|----------|
| Re-point every dependent FK to survivor, THEN delete zero-dependency duplicate | Re-point units/recipes/army_lists/wishlist/default_faction_id first; delete is safe | ✓ |
| Delete duplicate faction rows directly | RESTRICT-blocks on units, SET NULL loses links, CASCADE deletes wishlist items | |

**User's choice:** Re-point-then-delete (recommended default).
**Notes:** The re-point step is precisely what makes the delete safe; unmapped factions are mapped or kept, never destroyed. (D-03/D-04)

---

## Zero-data-loss verification (HON-05)

| Option | Description | Selected |
|--------|-------------|----------|
| better-sqlite3 data-layer test across all 5 FK surfaces + cold-boot theming | Seed duplicates with dependents, run migration, assert counts/links preserved | ✓ |
| Manual verification only | Eyeball after running | |

**User's choice:** Data-layer test (recommended default).
**Notes:** Mirrors the existing migration-parity suite; asserts unit resolution, no new NULLs, unchanged wishlist counts, default-faction theming still resolves cold. (D-05/D-06)

---

## New home for faction management (HON-06)

| Option | Description | Selected |
|--------|-------------|----------|
| Settings — dedicated "Factions" section, reuse existing components | Alongside DefaultFactionSetting + DataManagementTab; Quick Add keeps create | ✓ |
| Unit Database page | Add CRUD to the read-oriented browser | |

**User's choice:** Settings (recommended default).
**Notes:** Settings is the established config home and already hosts faction theming/default; CRUD doesn't belong in the read-oriented Unit Database. Existing `src/features/factions/*` components rehomed verbatim. (D-07/D-08)

---

## Data Health placement (HON-07)

| Option | Description | Selected |
|--------|-------------|----------|
| Remove sidebar entry only; keep `/data-health` route (Settings → Data card already links it) | Minimal demotion | ✓ |
| Inline full diagnostics UI into the Data tab | Remove the separate route | |

**User's choice:** Remove sidebar entry only (recommended default).
**Notes:** The Settings → Data "Open Data Health" card already satisfies "moved into Settings → Data". (D-09)

---

## Migration parity gate (cross-cutting)

| Option | Description | Selected |
|--------|-------------|----------|
| Migration 048 (data-only) + increment lib.rs Migration count + LF endings | Satisfies the Phase-130 three-leg gate | ✓ |

**User's choice:** As above (recommended default).
**Notes:** Data-layer migration list self-derives from disk; lib.rs count must match; CR bytes fail the gate. (D-10)

## Claude's Discretion

- Exact placement of the Factions section within Settings (tab vs. card).
- Survivor-selection rule when two mapped duplicates collide.
- SQL shape of the re-point (correlated UPDATEs vs. temp mapping table) and FK-disable-during-delete vs. strict ordering.
- Empty-state copy.

## Deferred Ideas

- INTEGER→TEXT FK unification (rejected here as too risky; own phase if ever).
- Inlining full Data Health UI into the Data tab (later UX polish).
- WeaponTable dedup / ArmyListDetailPage decomposition — Phase 136.
- `udb_leader_targets` migration — Phase 137.
