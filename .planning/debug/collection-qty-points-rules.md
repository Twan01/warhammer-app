---
slug: collection-qty-points-rules
status: root_cause_found
trigger: user_report
created: 2026-06-09
---

# Debug: Collection Quantity & Points Not Tied to Rules

## Symptoms
1. Collection form allows arbitrary model counts (e.g. 4, 5) when rules define specific valid tiers (e.g. 3 or 6 for Aggressors)
2. Changing quantity in collection does not update points — points remain static regardless of model count changes

## Evidence

### 1. model_count field is a free-form integer input
- timestamp: 2026-06-09
- source: `src/features/units/UnitFormOptional.tsx` line 109
- detail: `<NullableNumberField name="model_count" label="Model Count" min={0} />` — plain number input with no tier awareness
- The Zod schema (`unitSchema.ts` line 14) validates as `z.number().int().min(0).optional().nullable()` — no tier constraint

### 2. Points field is independent of model_count
- timestamp: 2026-06-09
- source: `src/features/units/UnitFormOptional.tsx` lines 112-146
- detail: Points is a separate number input. When tiers exist (`hasTiers`), it's disabled and shows "Managed by point tiers". But there is NO automatic sync between model_count changes and the active tier's points.

### 3. getUnitsWithPoints always uses MIN tier
- timestamp: 2026-06-09
- source: `src/db/queries/units.ts` lines 18-38
- detail: The SQL join picks `MIN(model_count)` tier for base points fallback. It ignores the unit's actual `model_count` value entirely.

### 4. TierManager requires manual "Set Active" click
- timestamp: 2026-06-09
- source: `src/features/units/TierManager.tsx` lines 66-78
- detail: `handleSetActive(tier.points)` writes points to `units.points` but does NOT update `model_count`. The "Set Active" button only copies points — no bidirectional sync.

### 5. UDB points tiers are available but unused by the collection form
- timestamp: 2026-06-09
- source: `src/db/queries/unitDatabase.ts` lines 75-80 (UdbPointsTier type)
- detail: UDB stores per-unit points tiers in `udb_unit_points` table (unit_id, model_count, points). The collection form could query these for linked units but currently does not.

### 6. Two separate tier systems exist
- timestamp: 2026-06-09
- source: `unit_point_tiers` table (hobbyforge.db, per-collection-unit) vs `udb_unit_points` table (hobbyforge.db, per-UDB-datasheet)
- detail: `unit_point_tiers` is manual user-defined tiers per collection unit. `udb_unit_points` is canonical rules data imported from Wahapedia. Collection form only checks `unit_point_tiers` (via `useUnitPointTiers` hook). For linked units, UDB tiers should be the source of truth.

## Current Focus

- **hypothesis**: The collection form treats model_count and points as independent free-form fields with no connection to rules data. For UDB-linked units, model_count should be constrained to valid tier sizes from `udb_unit_points`, and selecting a tier should auto-set both model_count and points.
- **next_action**: Implement tier-aware model count selector and auto-points sync for linked units

## Resolution

- **root_cause**: The collection unit form was designed before the UDB/rules integration existed. model_count is a plain integer input and points is a separate field — neither reads from `udb_unit_points` for linked units. The `getUnitsWithPoints` query always falls back to MIN(model_count) tier regardless of the unit's actual model_count. The TierManager component only does manual one-way sync (points only, not model_count). There is no mechanism to constrain model_count to valid tiers or auto-derive points from the selected tier.
- **fix**: For UDB-linked units: (1) Replace free-form model_count input with a dropdown/select of valid tier sizes from `udb_unit_points`, (2) On tier selection, auto-set both model_count and points, (3) Update `getUnitsWithPoints` to match points by actual model_count instead of always MIN, (4) Keep free-form input for unlinked/custom units. Falls back gracefully if no UDB data exists.
- **specialist_hint**: typescript
