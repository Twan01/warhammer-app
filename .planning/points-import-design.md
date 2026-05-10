# Points Import Design

Design document for PTS-01 through PTS-04 (implementation deferred to future milestone)

---

## Schema

Both tables live in **hobbyforge.db** (not rules.db). This is critical: rules.db is fully
deleted and recreated on every sync. Points import data is user-generated, persistent data
that must survive rules re-syncs.

### Table: `points_imports`

Primary store for the current effective imported points per unit per faction.

```sql
CREATE TABLE IF NOT EXISTS points_imports (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_name    TEXT    NOT NULL,
  faction_id   TEXT,
  points       INTEGER NOT NULL,
  source       TEXT    NOT NULL DEFAULT 'csv',
  imported_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  version      TEXT,
  UNIQUE (unit_name, faction_id)
);
```

**Column notes:**

| Column | Type | Purpose |
|--------|------|---------|
| `unit_name` | TEXT NOT NULL | Matches unit name for linking — same TEXT copy pattern as `unit_overrides` |
| `faction_id` | TEXT | Wahapedia `faction_id` for scoping. NULL means globally applicable |
| `points` | INTEGER NOT NULL | Imported points value from CSV |
| `source` | TEXT NOT NULL DEFAULT 'csv' | Origin of the data; reserved for future sources (e.g., 'api', 'manual') |
| `imported_at` | TEXT NOT NULL DEFAULT (datetime('now')) | Timestamp of the import that wrote this row |
| `version` | TEXT | Optional version tag for the import batch (e.g., 'Q3 2024 MFM') |

The `UNIQUE (unit_name, faction_id)` constraint means only one imported points value exists
per unit per faction at any time. Re-importing overwrites the previous value via
`INSERT OR REPLACE` — the history is preserved in `points_import_history` instead.

### Table: `points_import_history`

Audit trail for every import batch. One row per import event.

```sql
CREATE TABLE IF NOT EXISTS points_import_history (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  imported_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  source_file     TEXT,
  version         TEXT,
  row_count       INTEGER NOT NULL DEFAULT 0,
  delta_added     INTEGER NOT NULL DEFAULT 0,
  delta_removed   INTEGER NOT NULL DEFAULT 0,
  delta_changed   INTEGER NOT NULL DEFAULT 0
);
```

**Column notes:**

| Column | Type | Purpose |
|--------|------|---------|
| `source_file` | TEXT | Original CSV filename (for traceability) |
| `version` | TEXT | User-provided version label or auto-generated `YYYY-MM-DD` |
| `row_count` | INTEGER | Total unit rows in this import |
| `delta_added` | INTEGER | Units newly present in this import (not in previous) |
| `delta_removed` | INTEGER | Units absent from this import (were in previous) |
| `delta_changed` | INTEGER | Units with the same `unit_name`/`faction_id` but a different `points` value |

---

## Versioning

Each import batch is treated as a full replacement for the affected faction(s). Versioning
works as follows:

1. **Version label**: The user may provide an explicit version string (e.g., `"Q3 2024 MFM"`)
   at import time. If not provided, the importer auto-generates a label from the current date:
   `YYYY-MM-DD` (e.g., `"2024-09-15"`).

2. **Latest-wins model**: The `points_imports` table stores only the current effective value per
   `(unit_name, faction_id)`. There is no version stacking — each import overwrites the previous
   value via `INSERT OR REPLACE ON CONFLICT`. This keeps the query path simple: no version filter
   is needed when computing `effective_points`.

3. **Audit trail via history table**: While `points_imports` holds only the latest values,
   `points_import_history` records every import event with delta counts. This gives users an
   answer to "what changed when" without requiring point-in-time snapshots of all rows.

4. **Version surfaced in UI**: `points_import_history.version` is displayed in the import
   history list (PTS-02 UI). The most recent row indicates which version is currently active.

---

## Delta Computation

Delta computation runs during the import transaction, producing counts for the
`points_import_history` row.

**Algorithm:**

```
1. Begin transaction.

2. Snapshot current state for the affected faction(s):
   SELECT unit_name, faction_id, points
   FROM points_imports
   WHERE faction_id = $factionId  -- or all rows for a global import
   → Store as Map<unit_name:faction_id, points> (the "before" snapshot)

3. Process CSV rows:
   For each CSV row (unit_name, faction_id, points):
     INSERT OR REPLACE INTO points_imports (unit_name, faction_id, points, version, ...)

4. Compute deltas against the "before" snapshot:
   - delta_added   = CSV rows whose (unit_name, faction_id) was NOT in the before snapshot
   - delta_removed = before snapshot rows whose (unit_name, faction_id) is NOT in the CSV
   - delta_changed = rows present in both, where points value differs

5. DELETE rows from points_imports for (unit_name, faction_id) combos
   that appeared in the before snapshot but are absent from the CSV.
   (INSERT OR REPLACE handles updates; removals must be explicit.)

6. INSERT INTO points_import_history (source_file, version, row_count, delta_added,
                                       delta_removed, delta_changed)
   VALUES (...)

7. COMMIT.
```

**PTS-02 UI query** — retrieving the most recent delta summary:

```sql
SELECT * FROM points_import_history
ORDER BY imported_at DESC
LIMIT 1;
```

The delta counts (`delta_added`, `delta_removed`, `delta_changed`) are displayed as a
summary card after each import: "15 units added, 3 removed, 7 changed."

---

## Manual Override Interaction

The `effective_points` for a unit in an army list follows a strict COALESCE precedence chain.
With the addition of `points_imports`, the chain becomes:

```sql
effective_points = COALESCE(alu.points_override, pi.points, uo.points, u.points, 0)
```

Where:

| Source | Table alias | Meaning |
|--------|-------------|---------|
| `alu.points_override` | `army_list_units` | User's per-list manual override — **highest priority** |
| `pi.points` | `points_imports` | Imported points from external CSV |
| `uo.points` | `unit_overrides` | User's unit-level points override (Wahapedia stat editor) |
| `u.points` | `units` | Original points value from the miniature collection |
| `0` | fallback | Ensures effective_points is never NULL |

**Precedence rules:**

1. `alu.points_override` (per-list manual override set on a specific `army_list_units` row)
   ALWAYS wins. This is explicit user intent — the user typed a specific value for this unit
   in this list. Imported points changes have zero effect on this unit's `effective_points`
   (satisfies PTS-04).

2. `pi.points` (imported points) takes effect only when no per-list override exists. This is
   the new layer introduced by points import.

3. `uo.points` (unit-level override from the Wahapedia stat editor) is the next fallback.
   A user may have edited a unit's stats directly; that value is respected if no import exists.

4. `u.points` (the raw value on the `units` table) is the last resort before the zero fallback.

**JOIN addition to `getArmyListWithUnits`:**

```sql
LEFT JOIN points_imports pi
  ON pi.unit_name = u.name
 AND (pi.faction_id IS NULL OR pi.faction_id = u.faction_id)
```

The `IS NULL OR` condition allows globally scoped imports (where `pi.faction_id` is NULL)
to match all factions.

**Key invariant:** If a user sets `points_override` on an `army_list_units` row, that row is
completely immune to imports. The COALESCE short-circuits at the first non-NULL value. No
additional code or flag is needed to "protect" an override from imports — the SQL precedence
chain handles it automatically.

---

## Army List Impact

After a points import, army list totals update automatically through the COALESCE chain.
No rebuild or cache invalidation beyond standard React Query stale logic is needed —
the next call to `getArmyListWithUnits` or `getArmyListReadiness` will include the new
`pi.points` values via the JOIN.

**Automatic total updates:**

- Army lists that contain units covered by the import will reflect updated totals on the
  next query. No explicit "recalculate" step is needed.
- Units with `points_override IS NOT NULL` are unaffected — their `effective_points` remains
  locked to the override value regardless of import changes.

**PTS-03 — Outdated points warning:**

```sql
SELECT
  al.id,
  al.name,
  MAX(pih.imported_at) AS last_import_at,
  CASE
    WHEN MAX(pih.imported_at) IS NULL THEN 'no_import'
    WHEN julianday('now') - julianday(MAX(pih.imported_at)) > 30 THEN 'stale'
    ELSE 'fresh'
  END AS points_freshness
FROM army_lists al
LEFT JOIN army_list_units alu ON alu.list_id = al.id
LEFT JOIN units u ON u.id = alu.unit_id
LEFT JOIN points_imports pi ON pi.unit_name = u.name
LEFT JOIN points_import_history pih ON pih.version = pi.version
GROUP BY al.id;
```

Staleness threshold: **30 days** from the most recent import batch that covers any unit
in the list. Lists with no imported points at all show `no_import` status (neutral badge,
not a warning). Lists with a stale import show a warning badge on the army list card.

**`getArmyListReadiness` update:**

The `getArmyListReadiness` query (used in Game Day readiness summary) also requires the
`LEFT JOIN points_imports` addition to include imported points in the `total_points` and
`battle_ready_points` sums:

```sql
LEFT JOIN points_imports pi
  ON pi.unit_name = u.name
 AND (pi.faction_id IS NULL OR pi.faction_id = u.faction_id)
```

Both `getArmyListWithUnits` and `getArmyListReadiness` must be updated together when
implementation begins.

---

## Implementation Notes

- This design is for **documentation only** — implementation is deferred to a future milestone.
  No migration is created by this document. No code changes are required for ARMY-06.

- **Migration**: When implementation begins, add a new numbered migration file in
  `src-tauri/migrations/` (e.g., `020_points_imports.sql`) containing the `CREATE TABLE IF NOT EXISTS`
  statements for `points_imports` and `points_import_history`. Never edit existing migrations.

- **COALESCE chain update**: The `getArmyListWithUnits` and `getArmyListReadiness` queries in
  `src/db/queries/armyLists.ts` must each gain a `LEFT JOIN points_imports pi` and have their
  COALESCE updated from `COALESCE(alu.points_override, uo.points, u.points, 0)` to
  `COALESCE(alu.points_override, pi.points, uo.points, u.points, 0)`.

- **CSV parsing**: The importer can reuse `src/lib/csv.ts` utilities from the Wahapedia sync.
  The CSV format should follow the same conventions (header row, comma-delimited, UTF-8).

- **Import UI**: PTS-01 requires a file picker. Tauri's `dialog.open()` API can be used to
  select a CSV file, then the file is read with Tauri's `fs` plugin and parsed client-side.

- **No rules.db dependency**: Points import data is entirely in hobbyforge.db. The import
  pipeline does not touch rules.db. This ensures imported points survive rules re-syncs.

- **Faction matching**: `points_imports.faction_id` uses the same Wahapedia faction_id text
  key as `unit_overrides` — it is NOT the integer `factions.id` from hobbyforge.db. The text
  key (e.g., `"SM"` for Space Marines) is stable across rules re-syncs.
