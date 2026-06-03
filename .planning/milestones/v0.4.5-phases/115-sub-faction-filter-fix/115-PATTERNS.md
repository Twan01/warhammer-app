# Phase 115: Sub-faction Filter Fix - Pattern Map

**Mapped:** 2026-06-03
**Files analyzed:** 3 (2 modified source files + 1 modified test file)
**Analogs found:** 3 / 3

---

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/db/queries/unitDatabase.ts` | query | CRUD (read) | same file — `getDistinctSubFactions()` at line 361 | exact — same file, adjacent query |
| `src/features/unit-database/applyUdbFilters.ts` | utility | transform | same file — `roleFilter` and `pointMin` guard blocks | exact — same function, same pattern |
| `tests/unit-database/applyUdbFilters.test.ts` | test | — | same file — existing sub-faction tests at lines 109–134 | exact — update in place |

---

## Pattern Assignments

### `src/db/queries/unitDatabase.ts` — fix `getUdbUnitIdsBySubFaction` (lines 378–388)

**Analog:** `getDistinctSubFactions()` in the same file (lines 361–372) — same `db.select` call structure with positional params.

**Imports pattern** (lines 1–8, read above):
```typescript
import { getDb } from "@/db/client";
```

**Core query pattern — getDistinctSubFactions as analog** (lines 361–372):
```typescript
export async function getDistinctSubFactions(
  factionId: string,
): Promise<string[]> {
  const db = await getDb();
  const rows = await db.select<{ sub_faction: string }[]>(
    `SELECT DISTINCT sub_faction FROM udb_units
     WHERE faction_id = $1 AND sub_faction IS NOT NULL
     ORDER BY sub_faction`,
    [factionId],
  );
  return rows.map((r) => r.sub_faction);
}
```

**Target function — current broken state** (lines 378–388):
```typescript
export async function getUdbUnitIdsBySubFaction(
  factionId: string,
  subFaction: string,
): Promise<string[]> {
  const db = await getDb();
  const rows = await db.select<{ id: string }[]>(
    `SELECT id FROM udb_units WHERE faction_id = $1 AND sub_faction = $2`,
    [factionId, subFaction],
  );
  return rows.map((r) => r.id);
}
```

**Required change — line 384 only:**
```typescript
// Before (line 384):
`SELECT id FROM udb_units WHERE faction_id = $1 AND sub_faction = $2`

// After:
`SELECT id FROM udb_units WHERE faction_id = $1 AND (sub_faction = $2 OR sub_faction IS NULL)`
```

**Pattern note:** The `(col = $param OR col IS NULL)` form is standard SQLite within Tauri plugin-sql parameterized queries. The existing `$1 AND sub_faction IS NOT NULL` in `getDistinctSubFactions` confirms IS NULL / IS NOT NULL are valid in this context.

---

### `src/features/unit-database/applyUdbFilters.ts` — fix sub-faction guard (line 28)

**Analog:** The `roleFilter` guard block in the same function (lines 33–35) — identical guard structure (`if (filters.X !== null && unit.X !== filters.X) return false`).

**Full current function** (lines 19–58):
```typescript
export function applyUdbFilters(
  units: UdbUnitSummary[],
  filters: UdbFiltersInput,
  keywordsMap?: Map<string, string>,
): UdbUnitSummary[] {
  const keyword = filters.keywordFilter.trim().toLowerCase();

  return units.filter((unit) => {
    // Sub-faction filter (checked first per plan specification)
    if (filters.subFactionFilter !== null && unit.sub_faction !== filters.subFactionFilter) {
      return false;
    }

    // Role filter
    if (filters.roleFilter !== null && unit.role !== filters.roleFilter) {
      return false;
    }
    // ... (point filters follow same pattern)
    return true;
  });
}
```

**Required change — line 28 only (expand single if into multi-line):**
```typescript
// Before (line 28):
if (filters.subFactionFilter !== null && unit.sub_faction !== filters.subFactionFilter) {
  return false;
}

// After:
if (
  filters.subFactionFilter !== null &&
  unit.sub_faction !== filters.subFactionFilter &&
  unit.sub_faction !== null
) {
  return false;
}
```

**Pattern note:** The additional `&& unit.sub_faction !== null` condition is placed last to mirror the TypeScript strict null check idiom — the `filters.subFactionFilter !== null` guard comes first as the activation check, then the value mismatch, then the null pass-through. This is consistent with the point filter null pass-through pattern at lines 44–48.

---

### `tests/unit-database/applyUdbFilters.test.ts` — update 2 tests, add 1 new test

**Analog:** Existing sub-faction tests in the same file (lines 109–134) — same fixture data, same assertion style.

**Existing fixtures (lines 15–21) — no changes needed:**
```typescript
const UNITS: UdbUnitSummary[] = [
  { id: "u1", faction_id: "SM", name: "Intercessors",  role: "Battleline", sub_faction: "Ultramarines", base_points: 80,  ... },
  { id: "u2", faction_id: "SM", name: "Captain",       role: "Character",  sub_faction: null,            base_points: 80,  ... },
  { id: "u3", faction_id: "SM", name: "Eradicators",   role: "Battleline", sub_faction: "Ultramarines", base_points: 95,  ... },
  { id: "u4", faction_id: "SM", name: "Repulsor",       role: "Transport",  sub_faction: null,            base_points: 200, ... },
  { id: "u5", faction_id: "SM", name: "Mystery Unit",  role: "Epic Hero",  sub_faction: "Dark Angels",  base_points: null, ... },
];
```

**Test 1 — UPDATE "filters by subFactionFilter" (line 109):**
```typescript
// Before: expects only Ultramarines-tagged units (2 results)
it("filters by subFactionFilter", () => {
  const result = applyUdbFilters(UNITS, { ...NO_FILTER, subFactionFilter: "Ultramarines" });
  expect(result).toHaveLength(2);
  expect(result.map((u) => u.name)).toEqual(["Intercessors", "Eradicators"]);
});

// After: expects Ultramarines-tagged AND generic null units (4 results)
it("filters by subFactionFilter", () => {
  const result = applyUdbFilters(UNITS, { ...NO_FILTER, subFactionFilter: "Ultramarines" });
  expect(result).toHaveLength(4);
  expect(result.map((u) => u.name)).toEqual(["Intercessors", "Captain", "Eradicators", "Repulsor"]);
});
```

**Test 2 — UPDATE "subFactionFilter excludes units with null sub_faction" (line 115):**
```typescript
// Before (encodes the bug): expects only the Dark Angels unit (1 result)
it("subFactionFilter excludes units with null sub_faction", () => {
  const result = applyUdbFilters(UNITS, { ...NO_FILTER, subFactionFilter: "Dark Angels" });
  expect(result).toHaveLength(1);
  expect(result[0].name).toBe("Mystery Unit");
});

// After (correct behavior): Dark Angels unit + generic null units (3 results)
it("subFactionFilter includes generic (null sub_faction) units", () => {
  const result = applyUdbFilters(UNITS, { ...NO_FILTER, subFactionFilter: "Dark Angels" });
  expect(result).toHaveLength(3);
  expect(result.map((u) => u.name)).toEqual(["Captain", "Repulsor", "Mystery Unit"]);
});
```

**Test 3 — AND logic test at line 126 — NO COUNT CHANGE NEEDED:**
The existing AND-logic test (`subFactionFilter: "Ultramarines", roleFilter: "Battleline"`) expects 2 results and is still correct after the fix — there are no generic Battleline units (`sub_faction: null, role: "Battleline"`) in the fixture. u2 is Character, u4 is Transport. Add a comment explaining this:
```typescript
it("AND logic with subFactionFilter and roleFilter", () => {
  // After the fix, Ultramarines filter also includes generic (null sub_faction) units,
  // but none of the generic fixtures have role "Battleline" — count stays 2.
  const result = applyUdbFilters(UNITS, {
    ...NO_FILTER,
    subFactionFilter: "Ultramarines",
    roleFilter: "Battleline",
  });
  expect(result).toHaveLength(2);
  expect(result.map((u) => u.name)).toEqual(["Intercessors", "Eradicators"]);
});
```

**Test 4 — ADD explicit regression test:**
```typescript
it("subFactionFilter: includes sub-faction-specific AND null sub_faction units, excludes other sub-factions", () => {
  const result = applyUdbFilters(UNITS, { ...NO_FILTER, subFactionFilter: "Ultramarines" });
  const names = result.map((u) => u.name);
  // Sub-faction specific units included
  expect(names).toContain("Intercessors");
  expect(names).toContain("Eradicators");
  // Generic parent-faction units (sub_faction === null) included
  expect(names).toContain("Captain");
  expect(names).toContain("Repulsor");
  // Other sub-faction excluded
  expect(names).not.toContain("Mystery Unit");
});
```

**Test structure pattern** (from existing file, lines 7–9):
```typescript
import { describe, it, expect } from "vitest";
import { applyUdbFilters, type UdbFiltersInput } from "@/features/unit-database/applyUdbFilters";
import type { UdbUnitSummary } from "@/db/queries/unitDatabase";
```

---

## Shared Patterns

### Nullable Column Pass-Through
**Source:** `applyUdbFilters.ts` lines 44–53 — point filter null pass-through
**Apply to:** The sub-faction filter fix in `applyUdbFilters.ts`
```typescript
// Pattern: when null means "not applicable / passes all filters", check for null before excluding
if (filters.pointMin !== null) {
  if (unit.base_points === null) return false;   // null base_points excluded by point filters
  if (unit.base_points < filters.pointMin) return false;
}
```
The sub-faction fix is the inverse: `unit.sub_faction === null` means "generic, passes all sub-faction filters" — so null must NOT be excluded.

### Parameterized SQL with IS NULL
**Source:** `unitDatabase.ts` lines 366–368 — `getDistinctSubFactions`
**Apply to:** `getUdbUnitIdsBySubFaction` SQL change
```typescript
`SELECT DISTINCT sub_faction FROM udb_units
 WHERE faction_id = $1 AND sub_faction IS NOT NULL
 ORDER BY sub_faction`
```
Confirms `IS NULL` / `IS NOT NULL` syntax is valid in this query context.

---

## No Analog Found

None — all three files have their own existing code as direct analog. The changes are one-line edits within already-established patterns.

---

## Metadata

**Analog search scope:** `src/db/queries/unitDatabase.ts`, `src/features/unit-database/applyUdbFilters.ts`, `tests/unit-database/applyUdbFilters.test.ts`
**Files scanned:** 3 (all read directly — no broad search needed; canonical refs in CONTEXT.md pinpoint exact locations)
**Pattern extraction date:** 2026-06-03
