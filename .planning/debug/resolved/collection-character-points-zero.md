---
slug: collection-character-points-zero
status: resolved
trigger: user_report
created: 2026-06-13
resolved: 2026-06-13
---

> **RESOLVED 2026-06-13** — Applied full fix + backfill.
> - `src/features/unit-database/DatabaseBrowserPage.tsx` — prefill falls back to `unit.base_points`.
> - `src/db/queries/units.ts` — `getUnitsWithPoints` COALESCEs to `udb_units.base_points`.
> - `src-tauri/migrations/045_backfill_collection_points.sql` (+ lib.rs v45) — backfills NULL points on linked collection units.
> Verified: tsc clean; backfill dry-run resolved all 39 affected collection units (0 unfixable).

# Debug: Character Units Get 0 Points When Added From Unit Database

## Symptoms
1. Adding a single-model character (e.g. Ultramarines Captain) from the Unit Database to the collection results in **0 points** on the collection unit.
2. The same unit clearly shows its points (e.g. 80) in the Unit Database datasheet.
3. User hypothesis: caused by model count — characters should be "1 unit = points".

## Evidence

### 1. Characters store points in udb_units.base_points, NOT in udb_unit_points tiers
- timestamp: 2026-06-13
- source: live hobbyforge.db query
- detail: `SELECT base_points, (udb_unit_points tiers) FROM udb_units WHERE name LIKE '%Captain%'`
  returns `base_points: 80, tiers: []` for every Captain. Single-model characters
  have an empty `udb_unit_points` table and their points live only in `udb_units.base_points`.

### 2. The "Add to Collection" prefill ignores base_points
- timestamp: 2026-06-13
- source: `src/features/unit-database/DatabaseBrowserPage.tsx` lines 132-135
- detail:
  ```js
  const basePoints =
    unit.points.length > 0
      ? Math.min(...unit.points.map((p) => p.points))
      : null;            // <-- characters fall here → null
  ```
  `unit.points` is the `udb_unit_points` tier array. For characters it is empty,
  so `basePoints = null`, and the new collection unit is created with `points: null`.

### 3. The UDB datasheet shows points via a different field (base_points), masking the bug
- timestamp: 2026-06-13
- source: `src/db/queries/unitDatabase.ts` getUdbUnitDetail returns both `base_points`
  (single value, populated for characters) and `points` (tier array, empty for characters).
- detail: The datasheet displays `base_points` (=80) so the user sees points,
  but the prefill only reads the empty `points` tier array → mismatch.

### 4. Scope: 79% of all units are affected, not just characters
- timestamp: 2026-06-13
- source: live hobbyforge.db audit
- detail: Of 1710 `udb_units`, only **359 have tier rows**; **1351 (79%) have no
  `udb_unit_points` tiers** and rely entirely on `base_points`. Breakdown of no-tier units:
  - Other: 669 (all have base_points)
  - Characters: 559 (558 have base_points, 1 missing)
  - Dedicated Transports: 53 (all have base_points)
  - Fortifications: 41 (39 have base_points)
  - Battleline: 28 (all have base_points)
  Every one of these gets 0 points when added to the collection today.
  Only multi-model tiered units (squads priced per 5/10 models) currently work.
- Units with NEITHER tiers NOR base_points (would still show 0 after the fix — a separate
  data-completeness issue, 4 rows): "Example Wargear" (junk row), "Sir Hekhtur",
  "Castellum Stronghold", "Imperial Fortress Walls".

### 5. Secondary gap: getUnitsWithPoints never falls back to udb_units.base_points
- timestamp: 2026-06-13
- source: `src/db/queries/units.ts` lines 22-33
- detail: The enriched-points join only reads `udb_unit_points`. For a linked
  character with `units.points = NULL`, `udb_base_points` is also NULL → effective
  points resolve to 0. (Not the primary trigger since the prefill writes points directly,
  but a latent robustness gap.)

## Resolution

- **root_cause**: Single-model characters keep their points in `udb_units.base_points`
  and have NO rows in the `udb_unit_points` tier table. The "Add to Collection" prefill
  (`openUnitSheet` in DatabaseBrowserPage.tsx) only reads the tier array (`unit.points`)
  and sets `points = null` when it is empty — which is always the case for characters.
  So the collection unit is created with no points even though the datasheet shows them
  (the datasheet reads `base_points`, a separate field). The user's "model count" intuition
  is directionally right (it IS about single-model units) but the actual mechanism is the
  empty tier array vs. the base_points fallback, not the model_count value.

- **fix**: In `openUnitSheet`, fall back to `unit.base_points` when the tier array is empty:
  ```js
  const basePoints =
    unit.points.length > 0
      ? Math.min(...unit.points.map((p) => p.points))
      : unit.base_points;   // single-value points for characters / no-tier units
  ```
  (Optional hardening) Update `getUnitsWithPoints` to COALESCE to `udb_units.base_points`
  so linked characters with NULL manual points also resolve correctly.

- **specialist_hint**: typescript
</content>
</invoke>
