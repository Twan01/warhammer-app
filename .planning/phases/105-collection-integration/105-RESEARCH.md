# Phase 105: Collection Integration — Research

**Researched:** 2026-05-30
**Domain:** SQLite FK migration, React Query cross-feature invalidation, pre-filled form flows, ownership badge queries
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Migration `039_collection_udb_link.sql` adds `udb_unit_id TEXT REFERENCES udb_units(id) ON DELETE SET NULL` to `units`. Nullable.
- **D-02:** Migration includes best-effort backfill: case-insensitive name match + faction scope via `wahapedia_faction_id` join.
- **D-03:** Index `idx_units_udb_unit_id` on `units(udb_unit_id)`.
- **D-04:** "Add to Collection" button lives on `UdbDatasheetSheet`. Opens `UnitSheet` in create mode with pre-filled fields.
- **D-05:** Pre-filled: `name`, `faction_id` (mapped from udb faction), `category` (from `udb_units.role`), `points` (MIN tier), `model_count` (from `udb_unit_composition.min_models` or 1). `udb_unit_id` set automatically.
- **D-06:** All pre-filled fields editable. Painting status fields default to normal defaults.
- **D-07:** After creation, ownership badge updates immediately via React Query invalidation.
- **D-08:** Faction mapping uses `factions.wahapedia_faction_id` column (added by migration if not present), backfilled from `udb_factions` by name match.
- **D-09:** `UdbUnitRow` shows "Owned ×N" count badge (outline/secondary variant). Not owned = no badge.
- **D-10:** Ownership count data fetched once per faction view as a `Map<udb_unit_id, count>`. No N+1 queries.
- **D-11:** Readiness badge: green (all "Display Ready"/"Battle Ready"), amber (any in-progress), gray (all "Not Started").
- **D-12:** Readiness data bundled into same ownership query.
- **D-13:** New diagnostic `"unlinked_units"` (warning severity) in Data Health — count of units where `udb_unit_id IS NULL`.
- **D-14:** Diagnostic is informational only — no linking wizard.
- **D-15:** `UnitSheet` gains read-only "Database Link" display field (linked unit name or "Custom unit").
- **D-16:** `createUnit` and `updateUnit` accept `udb_unit_id` parameter. `Unit` and `CreateUnitInput` types extended.

### Claude's Discretion

- Exact badge styling (color, variant, position on row)
- Readiness display format (colored dot, text badge, mini progress ring)
- Layout of "Add to Collection" button on datasheet sheet (header action, footer button)
- Whether collection table/gallery shows "linked" icon (nice-to-have, not required)
- Navigate from collection unit to database entry (nice-to-have, not required)
- Empty state messaging when backfill finds 0 matches
- Whether `wahapedia_faction_id` is added to `factions` table or handled via join through `udb_factions`

### Deferred Ideas (OUT OF SCOPE)

- Bulk linking wizard for unmatched units
- Army list points resolved from database FK join (Phase 106 ALI-01)
- Remove synced_unit_points cache table (Phase 106 ALI-03)
- Collection page "linked" icon
- Navigate from collection unit to database entry
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COL-01 | "Add from database" flow — browse/search → pick unit → add to collection with faction/role/keywords/points pre-filled | UnitSheet pre-fill pattern; UdbDatasheetSheet button injection; faction mapping via migration 039 |
| COL-02 | FK link from collection `units.udb_unit_id` to `udb_units.id` (nullable, ON DELETE SET NULL) | Migration 039 DDL; existing ON DELETE SET NULL pattern confirmed in codebase |
| COL-03 | Migration backfills existing collection units to database FK by name matching (best-effort, advisory) | SQL UPDATE with LOWER() match and faction scope subquery; requires `wahapedia_faction_id` column |
| COL-04 | Ownership badges on database browser rows (owned / not owned) | Page-level Map pattern; single aggregated query per faction; UdbUnitRow badge injection |
| COL-05 | Readiness badges on database browser rows (painting status) | Bundled into ownership query; PAINTING_STATUS_ORDER constants available |
| COL-06 | Data Health diagnostic surfaces unlinked collection units | DiagnosticsCard + getDiagnosticFlags pattern; new `getUnlinkedUnitsCount` query function |
| COL-07 | Custom/kitbash units can still be added manually without database link | `udb_unit_id` is nullable; UnitSheet create flow unchanged; no mandatory linking |
</phase_requirements>

---

## Summary

Phase 105 is a pure integration phase — no new UI framework, no new libraries, no external dependencies. All capabilities are implemented by extending existing patterns established in Phases 103 and 104. The work divides into five clean tracks: (1) schema migration, (2) type and query layer extension, (3) database browser badge injection, (4) "Add from Database" flow, and (5) Data Health diagnostic.

The most architecturally significant decision is the faction mapping problem (D-08). The `factions` table uses integer auto-increment IDs; `udb_units.faction_id` uses Wahapedia text IDs (e.g. "SM", "TAU"). These two key spaces have no current bridge column. Migration 039 must add `wahapedia_faction_id TEXT` to the `factions` table and backfill it by name-matching `factions.name` against `udb_factions.name`. This column then enables the COL-03 backfill and the "Add from Database" faction_id mapping in COL-01.

The ownership badge query (COL-04/05) must aggregate across `units.udb_unit_id` for the currently viewed faction. The correct pattern is a single query that returns `Map<udb_unit_id, { count, worst_status }>`, passed as a prop to UdbUnitRow for O(1) lookup — confirmed by the existing Rules Hub annotation pattern.

**Primary recommendation:** Implement in strict dependency order: migration DDL first, then type/query extension, then ownership hook, then browser badges, then "Add from Database" flow, then Data Health diagnostic. The migration is the critical blocker for all other tracks.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Schema FK link (`udb_unit_id`) | Database / Storage | — | DDL migration on `units` table; SQLite only |
| Faction mapping (`wahapedia_faction_id`) | Database / Storage | — | DDL migration on `factions` table; backfill via SQL |
| Backfill of existing units | Database / Storage | — | SQL UPDATE in migration file; runs at app startup |
| Ownership count query | API / Backend (DB query layer) | — | `src/db/queries/unitDatabase.ts` — aggregated SELECT |
| Ownership hook | Frontend (React Query) | — | `src/hooks/useUnitDatabase.ts` — useUdbOwnership |
| Ownership badges on rows | Browser / Client | — | `UdbUnitRow` — reads from Map prop; no DB call |
| "Add to Collection" button | Browser / Client | — | `UdbDatasheetSheet` — triggers state callback |
| UnitSheet pre-fill | Browser / Client | — | `UnitSheet` accepts `prefill` props; no new DB logic |
| `createUnit` with `udb_unit_id` | API / Backend (DB query layer) | — | `src/db/queries/units.ts` — extend INSERT |
| Data Health diagnostic | API / Backend (DB query layer) | Browser / Client | Query in `diagnostics.ts`; rendering in `DiagnosticsCard` |

---

## Standard Stack

No new libraries required. All capabilities use the existing project stack.

### Core (already installed)

| Library | Purpose | Usage in this phase |
|---------|---------|---------------------|
| `@tauri-apps/plugin-sql` | SQLite access via `$1, $2` params | Migration 039, ownership query, `createUnit` extension |
| `@tanstack/react-query` | Server state, cache invalidation | `useUdbOwnership` hook; invalidation in `useCreateUnit` |
| `react-hook-form` + `zod` | Form validation + schema | `UnitSheet` pre-fill via `form.reset(prefill)` |
| `shadcn/ui` Badge | Status indicator badges | Ownership and readiness badges in `UdbUnitRow` |

### Installation

None required. [VERIFIED: codebase grep]

---

## Package Legitimacy Audit

No new packages are being installed in this phase.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| (none) | — | — | — | — | — | N/A |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
UdbDatasheetSheet (open for unitId)
    │
    ├── "Add to Collection" button
    │       │
    │       ▼
    │   onAddToCollection(udbUnit) callback
    │       │
    │       ▼
    │   DatabaseBrowserPage (state: UnitSheet open + prefill)
    │       │
    │       ▼
    │   UnitSheet (create mode, prefill from udb entry)
    │       │
    │       ▼
    │   createUnit({ ...fields, udb_unit_id: unit.id })
    │       │
    │       ▼
    │   React Query invalidation → UNITS_KEY
    │                           → UDB_OWNERSHIP_KEY(factionId)  ← badge updates
    │
UdbUnitList / UdbUnitRow (faction view)
    │
    ├── useUdbOwnership(factionId)
    │       └── single SELECT COUNT(*) + painting status GROUP BY udb_unit_id
    │               WHERE udb_unit_id IN (units for this faction)
    │
    ├── ownershipMap: Map<udb_unit_id, { count, worst_status }>
    │
    └── UdbUnitRow receives ownershipMap → badge lookup O(1)

Data Health Page
    │
    └── getDiagnosticFlags()
            └── getUnlinkedUnitsCount()
                    SELECT COUNT(*) FROM units WHERE udb_unit_id IS NULL
```

### Recommended Project Structure (additions only)

```
src-tauri/migrations/
  039_collection_udb_link.sql   # FK column + faction mapping + backfill + index

src/db/queries/
  unitDatabase.ts               # + getUdbOwnershipByFaction()
  units.ts                      # + udb_unit_id in createUnit / updateUnit
  diagnostics.ts                # + getUnlinkedUnitsCount()

src/hooks/
  useUnitDatabase.ts            # + useUdbOwnership(factionId)
  useUnits.ts                   # + invalidate UDB_OWNERSHIP_KEY on create/update

src/types/
  unit.ts                       # + udb_unit_id: string | null on Unit, CreateUnitInput, UpdateUnitInput

src/features/unit-database/
  UdbUnitRow.tsx                # + ownershipData prop, badge rendering
  UdbUnitList.tsx               # + pass ownershipMap to each row
  UdbDatasheetSheet.tsx         # + "Add to Collection" button + onAddToCollection prop
  DatabaseBrowserPage.tsx       # + UnitSheet open state + prefill state

src/features/units/
  UnitSheet.tsx                 # + prefill prop + "Database Link" display field
  unitSchema.ts                 # udb_unit_id NOT in schema (hidden field, not user-editable)

src-tauri/src/
  lib.rs                        # + Migration { version: 39, ... }

tests/
  collection/udbCollectionLink.test.ts      # getUdbOwnershipByFaction, unit type extension
  data-health/unlinkedUnitsDiagnostic.test.ts  # getUnlinkedUnitsCount
```

### Pattern 1: Migration with ALTER TABLE + backfill

Migration 039 must use `ALTER TABLE` (not `CREATE TABLE ... AS SELECT`) because SQLite does not support `ADD COLUMN` with a FK constraint that references an existing table via a non-trivial expression. The correct approach:

```sql
-- Source: established project pattern (migrations 007, 026, 034, 037)
-- Step 1: Add wahapedia_faction_id to factions (bridge column)
ALTER TABLE factions ADD COLUMN wahapedia_faction_id TEXT;

-- Step 2: Backfill factions.wahapedia_faction_id by name match
UPDATE factions
SET wahapedia_faction_id = (
  SELECT uf.id
  FROM udb_factions uf
  WHERE LOWER(uf.name) = LOWER(factions.name)
  LIMIT 1
)
WHERE wahapedia_faction_id IS NULL;

-- Step 3: Add udb_unit_id FK column to units
ALTER TABLE units ADD COLUMN udb_unit_id TEXT REFERENCES udb_units(id) ON DELETE SET NULL;

-- Step 4: Best-effort backfill units by name + faction scope
UPDATE units
SET udb_unit_id = (
  SELECT uu.id
  FROM udb_units uu
  WHERE LOWER(uu.name) = LOWER(units.name)
    AND uu.faction_id = (
      SELECT f.wahapedia_faction_id
      FROM factions f
      WHERE f.id = units.faction_id
    )
  LIMIT 1
)
WHERE udb_unit_id IS NULL;

-- Step 5: Index for reverse join (ownership badge queries)
CREATE INDEX IF NOT EXISTS idx_units_udb_unit_id ON units(udb_unit_id);

PRAGMA user_version = 39;
```

[VERIFIED: codebase grep — existing migrations use this ALTER TABLE pattern]

### Pattern 2: Page-level ownership Map (anti-N+1)

This pattern is established in the Rules Hub annotation feature. Load once per faction view, build a Map, pass to rows:

```typescript
// src/db/queries/unitDatabase.ts (addition)
// Source: established project pattern (Rules Hub annotations)
export interface UdbOwnershipEntry {
  udb_unit_id: string;
  owned_count: number;
  worst_status: string;   // the "least painted" status across all owned copies
}

export async function getUdbOwnershipByFaction(
  factionId: string,
): Promise<UdbOwnershipEntry[]> {
  const db = await getDb();
  return db.select<UdbOwnershipEntry[]>(
    `SELECT
       u.udb_unit_id,
       COUNT(*) AS owned_count,
       MIN(u.status_painting) AS worst_status
     FROM units u
     JOIN udb_units uu ON uu.id = u.udb_unit_id
     WHERE uu.faction_id = $1
       AND u.udb_unit_id IS NOT NULL
     GROUP BY u.udb_unit_id`,
    [factionId],
  );
}
```

**Note on `worst_status` ordering:** SQLite `MIN()` on `status_painting` gives alphabetical minimum, which is NOT the painting progression order. The query layer should return `worst_status` as a raw string and the UI should resolve badge color using `PAINTING_STATUS_ORDER.indexOf()` comparison. See Pitfall 1.

```typescript
// src/hooks/useUnitDatabase.ts (addition)
export const UDB_OWNERSHIP_KEY = (factionId: string) =>
  ["udb-ownership", factionId] as const;

export function useUdbOwnership(factionId: string | null) {
  return useQuery({
    queryKey: factionId ? UDB_OWNERSHIP_KEY(factionId) : (["udb-ownership", "disabled"] as const),
    queryFn: () => factionId ? getUdbOwnershipByFaction(factionId) : Promise.resolve([]),
    enabled: !!factionId,
    staleTime: 0,  // must be fresh after unit creation/deletion
  });
}
```

### Pattern 3: UnitSheet pre-fill via reset()

`UnitSheet` already uses `form.reset(buildDefaultValues(unit, defaultFactionId))` inside a `useEffect` when `unit` or `defaultFactionId` changes. The pre-fill from a UDB entry follows the same mechanism — pass a `prefill` prop that maps to `UnitFormValues` shape:

```typescript
// src/features/units/UnitSheet.tsx (extended interface)
interface UnitSheetProps {
  open: boolean;
  unit: Unit | EnrichedUnit | null;   // existing
  defaultFactionId?: number;           // existing
  prefill?: Partial<UnitFormValues>;   // NEW — for "Add from Database" flow
  prefillUdbUnitId?: string | null;    // NEW — stored separately, not in form schema
  onClose: () => void;
}
```

`udb_unit_id` must NOT be added to `unitSchema` (it is not user-editable). It is passed as a separate prop and included in the `createUnit` payload in `onSubmit`.

### Pattern 4: DatabaseBrowserPage orchestration

`DatabaseBrowserPage` already manages the `selectedUnitId` → `UdbDatasheetSheet` open state. The "Add to Collection" flow needs two additional state variables:

```typescript
const [unitSheetOpen, setUnitSheetOpen] = useState(false);
const [unitSheetPrefill, setUnitSheetPrefill] = useState<Partial<UnitFormValues> | null>(null);
const [unitSheetUdbId, setUnitSheetUdbId] = useState<string | null>(null);
```

The `UdbDatasheetSheet` receives an `onAddToCollection` callback. When the user clicks "Add to Collection", the sheet calls this callback with the UDB unit data. `DatabaseBrowserPage` builds the prefill values, closes the datasheet sheet, and opens `UnitSheet`.

### Pattern 5: Faction ID mapping for prefill

When a user clicks "Add to Collection" on a UDB unit, the `udbUnit.faction_id` is a text Wahapedia ID (e.g. "TAU"). The `UnitSheet` needs an integer `faction_id` from the `factions` table. The mapping is available via a JOIN query or by matching `factions.wahapedia_faction_id` (added in migration 039):

```typescript
// In DatabaseBrowserPage or a helper function — client-side lookup
// factions data is already loaded by useFactions()
function mapUdbFactionToCollectionFaction(
  udbFactionId: string,
  factions: Faction[],
): number | undefined {
  const match = factions.find(
    (f) => f.wahapedia_faction_id === udbFactionId,
  );
  return match?.id;
}
```

If no match is found (user has the faction in UDB but not in their collection factions list), `faction_id` defaults to 0 (triggering form validation error — user must select faction manually).

### Pattern 6: Data Health diagnostic extension

`getDiagnosticFlags()` calls functions in parallel via `Promise.all`. Adding `getUnlinkedUnitsCount` follows the same pattern as `getOrphanedProgressRows`:

```typescript
// src/db/queries/diagnostics.ts (addition)
export async function getUnlinkedUnitsCount(): Promise<DiagnosticFlag | null> {
  const db = await getDb();
  const rows = await db.select<{ c: number }[]>(
    "SELECT COUNT(*) as c FROM units WHERE udb_unit_id IS NULL",
  );
  const count = rows[0]?.c ?? 0;
  if (count === 0) return null;
  return {
    type: "unlinked_units",
    count,
    description: `${count} collection unit${count !== 1 ? "s are" : " is"} not linked to the unit database`,
    severity: "warning",
  };
}
```

Then add it to `getDiagnosticFlags()`:

```typescript
const results = await Promise.all([
  getOrphanedProgressRows(),
  getAmbiguousPointMatches(),
  getUnmatchedPointsCount(),
  getUnlinkedUnitsCount(),  // NEW
]);
```

### Anti-Patterns to Avoid

- **Per-row ownership query:** Never call a DB query inside UdbUnitRow render. Use the page-level Map pattern (D-10).
- **Adding `udb_unit_id` to `unitSchema`:** The field is system-managed, not user-typed. Adding it to Zod schema risks it appearing in the form or causing unexpected validation failures.
- **Mutating `staleTime: Infinity` for ownership:** The UDB unit data (names, roles, points) is static reference data — `Infinity` is correct. But the ownership overlay (`useUdbOwnership`) is dynamic (changes on unit create/delete) — use `staleTime: 0` or invalidate explicitly.
- **Relying on SQLite `MIN()` for painting status ordering:** `MIN(status_painting)` returns alphabetical minimum ("Based" < "Battle Ready" < "Completed"), which does not match the painted progression. Sort in JS using `PAINTING_STATUS_ORDER`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Painting status aggregate | Custom ordering SQL | JS comparison with `PAINTING_STATUS_ORDER` | SQLite MIN/MAX on TEXT is alphabetical, not semantic |
| Cache invalidation after "Add to Collection" | Manual state reset | `qc.invalidateQueries({ queryKey: UDB_OWNERSHIP_KEY(factionId) })` in `useCreateUnit` | React Query handles all subscribers |
| Faction text↔integer mapping at query time | JOIN in every query | Client-side `Map<wahapedia_faction_id, faction_id>` built once from `useFactions()` data | Avoids cross-table query complexity; factions data already loaded |
| Pre-fill form from UDB | Custom state management | `form.reset(prefill)` in existing `useEffect` pattern | Already the established pattern in UnitSheet |

---

## Common Pitfalls

### Pitfall 1: Painting Status Aggregate Ordering
**What goes wrong:** Query uses `MIN(status_painting)` to find "worst" painting state. SQLite returns alphabetical minimum ("Based") not semantic minimum ("Not Started").
**Why it happens:** `status_painting` is a TEXT column using the `PAINTING_STATUS_ORDER` enumeration, but SQLite has no knowledge of the ordering semantics.
**How to avoid:** Return all status values per unit or use `GROUP_CONCAT` and resolve in JS. Alternatively, add a `painting_order` computed column — but this is overkill. Simplest: return `MIN` and let JS compare using `PAINTING_STATUS_ORDER.indexOf()`. A lower index = less painted.
**Warning signs:** Readiness badges showing green for units that are "Based" but not "Completed".

**Recommended approach:** Return the status with the lowest `PAINTING_STATUS_ORDER` index:

```sql
-- Cannot do this directly in SQLite without CASE statements
-- Instead, return all statuses and resolve in JS:
SELECT u.udb_unit_id, COUNT(*) AS owned_count,
       GROUP_CONCAT(u.status_painting, '|') AS all_statuses
FROM units u
JOIN udb_units uu ON uu.id = u.udb_unit_id
WHERE uu.faction_id = $1 AND u.udb_unit_id IS NOT NULL
GROUP BY u.udb_unit_id
```

Then JS picks worst: `allStatuses.split('|').reduce((worst, s) => PAINTING_STATUS_ORDER.indexOf(s) < PAINTING_STATUS_ORDER.indexOf(worst) ? s : worst)`.

### Pitfall 2: Faction Mapping Fails for Unmatched Factions
**What goes wrong:** The `factions` table name-match against `udb_factions` name fails for factions with slight name variations (e.g. "Space Marines" vs. "Space Marines (Adeptus Astartes)").
**Why it happens:** `factions` were seeded with human-friendly short names; `udb_factions` uses Wahapedia canonical names.
**How to avoid:** The `wahapedia_faction_id` backfill in the migration is best-effort. The "Add from Database" flow must handle `faction_id === undefined` gracefully — default to 0 (which fails Zod validation) so the user is forced to pick their faction from the dropdown. Show a tooltip on the faction field explaining why it was not pre-filled.
**Warning signs:** `UnitSheet` opens with faction_id = 0 and the user is confused about why.

### Pitfall 3: Ownership Query staleTime Mismatch
**What goes wrong:** `useUdbOwnership` is initialized with `staleTime: Infinity` (copied from other UDB hooks). After a user creates a unit, the badge does not update.
**Why it happens:** The UDB hooks all use `staleTime: Infinity` because the UDB data is static. Ownership data is NOT static — it changes every time a collection unit is created or deleted.
**How to avoid:** `useUdbOwnership` must use `staleTime: 0`. Additionally, `useCreateUnit` and `useDeleteUnit` in `useUnits.ts` must explicitly invalidate `UDB_OWNERSHIP_KEY(factionId)`. The faction ID is not directly available in the mutation's `onSuccess` — invalidate the entire `["udb-ownership"]` key prefix: `qc.invalidateQueries({ queryKey: ["udb-ownership"] })`.
**Warning signs:** Badge shows "Owned ×0" immediately after adding a unit; requires page refresh.

### Pitfall 4: Migration 039 Runs Before udb_* Tables Are Populated
**What goes wrong:** The backfill UPDATE in migration 039 tries to JOIN against `udb_units` but the tables are empty on a fresh install (data is loaded via `import_unit_database` Tauri command after startup, not via migration).
**Why it happens:** Phase 103 deliberately avoided seeding data in migrations after a boot-loop incident. The `udb_*` tables exist but are empty until the Rust import command runs.
**How to avoid:** The migration 039 backfill runs at migration time (before data import). On a fresh install, it matches 0 rows — which is correct and harmless. On an existing install with udb_* data already imported, it matches correctly. The backfill is idempotent and advisory; the diagnostic (COL-06) handles residual unmatched units.
**Warning signs:** None visible — but if you see the diagnostic flag showing 100% unlinked units on a fresh install, this is expected until the user triggers the data import.

### Pitfall 5: UnitSheet prop signature collision
**What goes wrong:** `UnitSheet` receives both `unit` (for edit mode) and `prefill` (for create-from-database mode). If both are provided simultaneously, `buildDefaultValues` logic becomes ambiguous.
**Why it happens:** The "Add from Database" flow passes `prefill` but `unit = null` (create mode). An edit flow passes `unit` but no `prefill`. The `useEffect` reset triggers on either change.
**How to avoid:** Make the flows mutually exclusive in the interface: `prefill` is only relevant when `unit === null`. Document this constraint in a code comment. The `buildDefaultValues` function should apply `prefill` only when `unit === null`:

```typescript
function buildDefaultValues(
  unit: Unit | null,
  defaultFactionId?: number,
  prefill?: Partial<UnitFormValues>,
): UnitFormValues {
  if (unit) return { /* existing edit-mode logic */ };
  return { ...emptyDefaults(defaultFactionId), ...prefill };
}
```

### Pitfall 6: `createUnit` INSERT missing `udb_unit_id` parameter
**What goes wrong:** `units.ts` `createUnit` is updated to include `udb_unit_id` in the type but the SQL INSERT still has 22 positional parameters — adding `udb_unit_id` makes it 23 but the SQL is not updated.
**Why it happens:** TypeScript does not validate SQL strings. The DB call silently passes wrong parameter count.
**How to avoid:** When adding `udb_unit_id` to the INSERT, count all `$N` parameters and ensure they match the values array length. Add a comment showing the parameter count.

---

## Code Examples

### Example 1: Ownership badge in UdbUnitRow

```typescript
// src/features/unit-database/UdbUnitRow.tsx (extended)
// Source: established project Badge pattern (see collection page status badges)
interface UdbUnitRowProps {
  unit: UdbUnitSummary;
  onOpen: (id: string) => void;
  ownershipData?: { count: number; worstStatus: string } | null;
}

export function UdbUnitRow({ unit, onOpen, ownershipData }: UdbUnitRowProps) {
  const isOwned = ownershipData && ownershipData.count > 0;
  const readinessBadgeClass = isOwned
    ? resolveReadinessBadgeClass(ownershipData.worstStatus)
    : null;

  return (
    <div className="flex items-center gap-3 px-4 h-10 hover:bg-secondary cursor-pointer ...">
      <span className="text-sm font-medium flex-1 truncate">{unit.name}</span>
      {unit.role && <Badge variant="secondary" className="text-xs shrink-0">{unit.role}</Badge>}
      {isOwned && (
        <>
          <Badge variant="outline" className={`text-xs shrink-0 ${readinessBadgeClass}`}>
            Owned ×{ownershipData.count}
          </Badge>
        </>
      )}
      <span className="text-xs text-muted-foreground tabular-nums w-20 text-right shrink-0">
        {unit.base_points !== null ? `from ${unit.base_points} pts` : "—"}
      </span>
    </div>
  );
}
```

### Example 2: Readiness color resolution

```typescript
// Pure function — no DB, no React
// Source: PAINTING_STATUS_ORDER from src/types/unit.ts
import { PAINTING_STATUS_ORDER } from "@/types/unit";

const DONE_STATUSES = new Set(["Display Ready", "Battle Ready", "Varnished", "Completed"]);

export function resolveReadinessBadgeClass(worstStatus: string): string {
  const idx = PAINTING_STATUS_ORDER.indexOf(worstStatus as typeof PAINTING_STATUS_ORDER[number]);
  if (DONE_STATUSES.has(worstStatus)) return "border-green-500 text-green-600";
  if (idx <= 0) return "border-muted text-muted-foreground";  // Not Started or unknown
  return "border-amber-500 text-amber-600";  // in progress
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-row DB query for ownership | Page-level Map aggregation | Phase 105 (new) | Eliminates N+1 queries for faction views with 30–100+ units |
| Manual unit creation only | Pre-filled "Add from Database" flow | Phase 105 (new) | Dramatically reduces friction for adding known units |
| No FK between collection and canonical data | `units.udb_unit_id TEXT REFERENCES udb_units(id)` | Phase 105 (new) | Enables Phase 106 army list points resolution |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `wahapedia_faction_id` does not yet exist on `factions` table — migration 039 must add it | Architecture Patterns (Pattern 1) | If it already exists, the ALTER TABLE fails silently or errors; migration must use `ADD COLUMN IF NOT EXISTS` check or verify against existing migrations [VERIFIED: grep of all migrations confirms column does not exist] |
| A2 | `GROUP_CONCAT(status_painting, '\|')` is sufficient for worst-status resolution in JS | Pitfall 1 | If a unit has many copies, the string grows but remains manageable for typical collection sizes (5–20 copies per unit max) |
| A3 | `factions.name` will match `udb_factions.name` for the 4 seeded factions ("Tau Empire", "Ultramarines", "Necrons", "Tyranids") | Pitfall 2 | Mismatch means backfill leaves `wahapedia_faction_id` NULL; "Add from Database" faction pre-fill fails; user must manually select faction |

**If this table is empty:** All claims in this research were verified or cited.

Note: A1 was confirmed by code inspection. A2 and A3 are practical assessments based on codebase structure.

---

## Open Questions

1. **`factions.name` vs `udb_factions.name` match quality**
   - What we know: Seeded factions are "Tau Empire", "Ultramarines", "Necrons", "Tyranids". `udb_factions` names come from Wahapedia data imported in Phase 103.
   - What's unclear: Whether Wahapedia uses "Tau Empire" or "T'au Empire" or "T'au Sept" — the exact canonical name matters for the name-match backfill.
   - Recommendation: The planner should add a verification task to query `SELECT id, name FROM udb_factions WHERE name LIKE '%au%' OR name LIKE '%cron%' OR name LIKE '%marin%' OR name LIKE '%ranid%'` and document the actual names so the migration can use exact CASE expressions if needed.

2. **`worst_status` query strategy: GROUP_CONCAT vs CASE chain**
   - What we know: `GROUP_CONCAT` with JS resolution is simpler; a CASE chain in SQL is more performant but verbose.
   - What's unclear: Whether the extra string parsing overhead matters for typical collection sizes.
   - Recommendation: Use `GROUP_CONCAT` — it keeps SQL simple and collection sizes are small (< 100 units per faction typically).

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely code/config/migration changes. No new external tools, CLI utilities, runtimes, or services are required beyond those already confirmed in Phase 103–104.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vite.config.ts` |
| Quick run command | `pnpm test -- tests/collection/udbCollectionLink.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COL-02 | `udb_unit_id` column present on Unit type; accepted by createUnit | unit | `pnpm test -- tests/collection/udbCollectionLink.test.ts` | Wave 0 |
| COL-03 | Backfill migration: units with matching name+faction get udb_unit_id set | unit | `pnpm test -- tests/collection/udbCollectionLink.test.ts` | Wave 0 |
| COL-04 | `getUdbOwnershipByFaction` returns correct count per udb_unit_id | unit | `pnpm test -- tests/collection/udbCollectionLink.test.ts` | Wave 0 |
| COL-05 | `resolveReadinessBadgeClass` returns correct color class for each status band | unit | `pnpm test -- tests/collection/udbCollectionLink.test.ts` | Wave 0 |
| COL-06 | `getUnlinkedUnitsCount` returns null when all linked, flag when any unlinked | unit | `pnpm test -- tests/data-health/unlinkedUnitsDiagnostic.test.ts` | Wave 0 |
| COL-01, COL-07 | UnitSheet accepts prefill prop; renders without crashing in create mode | manual/smoke | `pnpm dev` — visual inspection | — |

### Sampling Rate

- **Per task commit:** `pnpm test -- tests/collection/udbCollectionLink.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/collection/udbCollectionLink.test.ts` — covers COL-02, COL-03, COL-04, COL-05
- [ ] `tests/data-health/unlinkedUnitsDiagnostic.test.ts` — covers COL-06

*(Existing test infrastructure: Vitest + jsdom + jest-dom fully configured. DB mocked via `vi.mock("@/db/client")`)*

---

## Security Domain

This phase does not introduce authentication, session management, access control, cryptography, or external network calls. The only data flow is from the user's local SQLite database to the UI.

Input validation: `udb_unit_id` is a TEXT FK value passed via `$1` positional parameter — parameterized, not interpolated. Zod schema validation covers all form inputs. No new ASVS categories apply.

---

## Sources

### Primary (HIGH confidence)

- Codebase inspection: `src-tauri/migrations/001_core_schema.sql` through `038_udb_schema.sql` — confirmed all existing table structures, FK patterns, ALTER TABLE patterns [VERIFIED: codebase grep]
- Codebase inspection: `src/db/queries/units.ts` — confirmed current `createUnit` / `updateUnit` SQL and parameter count [VERIFIED: codebase grep]
- Codebase inspection: `src/types/unit.ts` — confirmed `Unit` interface shape, `PAINTING_STATUS_ORDER` [VERIFIED: codebase grep]
- Codebase inspection: `src/features/units/UnitSheet.tsx` — confirmed `form.reset()` pre-fill pattern [VERIFIED: codebase grep]
- Codebase inspection: `src/db/queries/diagnostics.ts` — confirmed `DiagnosticFlag` shape and `getDiagnosticFlags()` aggregation pattern [VERIFIED: codebase grep]
- Codebase inspection: `src/features/unit-database/DatabaseBrowserPage.tsx` — confirmed selectedUnitId state pattern and UdbDatasheetSheet integration [VERIFIED: codebase grep]
- Codebase inspection: `src/types/faction.ts` + `src/db/queries/factions.ts` — confirmed `Faction` interface has no `wahapedia_faction_id` column [VERIFIED: codebase grep]
- CONTEXT.md decisions D-01 through D-16 — locked decisions from discuss-phase [CITED: .planning/phases/105-collection-integration/105-CONTEXT.md]

### Secondary (MEDIUM confidence)

- STATE.md key decisions — FK nullable strategy and entity ID reuse decisions [CITED: .planning/STATE.md]

---

## Metadata

**Confidence breakdown:**
- Migration DDL: HIGH — existing pattern is clear and confirmed in 38 prior migrations
- Type extension: HIGH — `Unit` interface and `CreateUnitInput` pattern are well-established
- Ownership query: HIGH — GROUP BY aggregation on FK is standard SQL; pattern confirmed in Rules Hub
- Pre-fill flow: HIGH — `UnitSheet` `form.reset()` pattern is already in use
- Faction mapping: MEDIUM — name-match quality depends on actual `udb_factions` data content (Open Question 1)
- Painting status aggregate: MEDIUM — `GROUP_CONCAT` approach is pragmatic but slightly unconventional

**Research date:** 2026-05-30
**Valid until:** 2026-06-30 (stable stack, no fast-moving dependencies)
