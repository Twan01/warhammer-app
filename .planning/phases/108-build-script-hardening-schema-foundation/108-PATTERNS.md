# Phase 108: Build Script Hardening & Schema Foundation - Pattern Map

**Mapped:** 2026-06-01
**Files analyzed:** 14 new/modified files
**Analogs found:** 12 / 14

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `scripts/lib/parseCsv.ts` | utility | transform | `scripts/build-unit-db.ts` (lines 41-51) | exact |
| `scripts/lib/parseXml.ts` | utility | transform | `scripts/build-unit-db.ts` (lines 113-199) | exact |
| `scripts/lib/normalize.ts` | utility | transform | (none -- new capability) | no-analog |
| `scripts/lib/factionMap.ts` | config | static | `scripts/build-unit-db.ts` (lines 57-96) | exact |
| `scripts/lib/types.ts` | model | static | `scripts/build-unit-db.ts` (lines 101-111) | exact |
| `scripts/data/aliases.json` | config | static | (none -- new data file) | no-analog |
| `scripts/build-unit-db.ts` | utility | batch | self (refactor) | exact |
| `scripts/update-unit-database.ts` | utility | batch | self (refactor) | exact |
| `src-tauri/migrations/041_udb_sub_faction_fr.sql` | migration | DDL | `src-tauri/migrations/038_udb_schema.sql` | role-match |
| `src-tauri/src/lib.rs` | service | CRUD | self (lines 464-745) | exact |
| `src/features/data-health/PointsCoverageCard.tsx` | component | request-response | `src/features/data-health/DiagnosticsCard.tsx` | exact |
| `src/db/queries/diagnostics.ts` | service | CRUD | self (existing module) | exact |
| `src/hooks/useDiagnostics.ts` | hook | request-response | self (existing module) | exact |
| `src/components/common/DbHealthGate.tsx` | component | static | self (bump constant) | exact |

## Pattern Assignments

### `scripts/lib/parseCsv.ts` (utility, transform)

**Analog:** `scripts/build-unit-db.ts` lines 41-51

**Extract this function verbatim** (lines 41-51):
```typescript
function parseWahapediaCsv(raw: string): Record<string, string>[] {
  const lines = raw.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split("|").map((h) => h.trim()).filter(Boolean);
  return lines.slice(1).map((line) => {
    const values = line.split("|");
    return Object.fromEntries(
      headers.map((h, i) => [h, (values[i] ?? "").trim()])
    );
  });
}
```

**Imports pattern** -- Node.js script module, no Vite aliases:
```typescript
import { readFileSync } from "node:fs";
```

---

### `scripts/lib/parseXml.ts` (utility, transform)

**Analog:** `scripts/build-unit-db.ts` lines 113-199

**Extract these functions verbatim:**
- `extractTiers(el: Element): PointsTier[]` (lines 113-136)
- `parseCatXml(xml, factionId, catalogueName): BsdataUnitPoints[]` (lines 138-187)
- `extractModelCounts(doc, factionId): BsdataModelCount[]` (lines 199+)

**Imports pattern:**
```typescript
// DOMParser polyfill must be applied BEFORE importing this module
// (done in the entry-point scripts, not here)
import type { PointsTier, BsdataUnitPoints, BsdataModelCount } from "./types";
```

---

### `scripts/lib/factionMap.ts` (config, static)

**Analog:** `scripts/build-unit-db.ts` lines 57-96

**Core pattern** -- export the existing FACTION_MAP constant plus new SUB_FACTION_MAP:
```typescript
export const FACTION_MAP: Record<string, string> = {
  "Imperium - Space Marines": "SM",
  "Imperium - Black Templars": "SM",
  // ... existing entries from build-unit-db.ts lines 57-96
};

export const SUB_FACTION_MAP: Record<string, string> = {
  "Imperium - Black Templars": "Black Templars",
  "Imperium - Blood Angels": "Blood Angels",
  // ... per RESEARCH.md Pattern 2
};
```

---

### `scripts/lib/types.ts` (model, static)

**Analog:** `scripts/build-unit-db.ts` lines 101-111, 192-197

**Extract interfaces:**
```typescript
export interface PointsTier {
  modelCount: number;
  points: number;
}

export interface BsdataUnitPoints {
  datasheet_name: string;
  faction_id: string;
  points: string;
  tiers: PointsTier[];
}

export interface BsdataModelCount {
  unit_name: string;
  faction_id: string | null;
  min_models: number;
  max_models: number;
}
```

---

### `scripts/lib/normalize.ts` (utility, transform)

**No analog** -- new capability. Use RESEARCH.md Pattern 1 as reference:
```typescript
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['‘’`′]/g, "'")
    .replace(/[^a-z0-9' ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function loadAliases(filePath: string): Record<string, string> {
  // read and parse aliases.json
}
```

---

### `scripts/build-unit-db.ts` (utility, batch) -- MODIFY

**Analog:** self

**Determinism fix** -- add `files.sort()` before processing. Example insertion point after `readdirSync`:
```typescript
// Current pattern (line ~varies):
const catFiles = readdirSync(bsdataDir).filter(f => f.endsWith(".cat"));
// Add:
catFiles.sort();
```

**Import refactor** -- replace inlined functions with shared lib imports:
```typescript
import { parseWahapediaCsv } from "./lib/parseCsv";
import { parseCatXml, extractModelCounts } from "./lib/parseXml";
import { FACTION_MAP, SUB_FACTION_MAP } from "./lib/factionMap";
import { normalizeName, loadAliases } from "./lib/normalize";
import type { BsdataUnitPoints, BsdataModelCount } from "./lib/types";
```

**Coverage report output** -- new section at end of build:
```typescript
// Per RESEARCH.md Pattern 3
interface FactionCoverage {
  faction_id: string;
  faction_name: string;
  total_units: number;
  units_with_points: number;
  coverage_pct: number;
}
// Write to scripts/data/coverage-report.json
writeFileSync(coverageReportPath, JSON.stringify(report, null, 2));
```

---

### `scripts/update-unit-database.ts` (utility, batch) -- MODIFY

**Analog:** self + `scripts/build-unit-db.ts` refactor pattern

Same refactor: replace duplicated inline functions with `scripts/lib/` imports. Add `files.sort()` for determinism. This script has identical inlined copies of `parseWahapediaCsv`, `FACTION_MAP`, `parseCatXml`, `extractTiers`, `extractModelCounts` (lines 34-44, 49+).

---

### `src-tauri/migrations/041_udb_sub_faction_fr.sql` (migration, DDL)

**Analog:** `src-tauri/migrations/038_udb_schema.sql`

**Migration header pattern** (from 038):
```sql
-- Migration 038: Unit Database Schema
-- Creates 9 regular tables + 1 FTS5 virtual table for the canonical unit database (udb_*).
```

**New migration follows additive ALTER TABLE pattern:**
```sql
-- Migration 041: Add sub_faction and _fr locale columns to udb_* tables
-- Phase 108: Schema foundation for sub-faction filtering and French translation

ALTER TABLE udb_units ADD COLUMN sub_faction TEXT;

ALTER TABLE udb_factions ADD COLUMN name_fr TEXT;
ALTER TABLE udb_units ADD COLUMN name_fr TEXT;
ALTER TABLE udb_unit_abilities ADD COLUMN name_fr TEXT;
ALTER TABLE udb_unit_abilities ADD COLUMN description_fr TEXT;
ALTER TABLE udb_unit_weapons ADD COLUMN name_fr TEXT;
ALTER TABLE udb_unit_keywords ADD COLUMN keyword_fr TEXT;
```

---

### `src-tauri/src/lib.rs` -- MODIFY (Rust import)

**Analog:** self, lines 427-449 (UnitDatabasePayload) and lines 562-578 (INSERT units)

**Serde struct pattern** -- existing `#[serde(default)]` already used on Vec fields (line 434). No struct changes needed since `JsRow = HashMap<String, serde_json::Value>` -- missing keys simply absent from map.

**INSERT extension pattern** (lines 565-578):
```rust
// Current:
"INSERT INTO udb_units (id, faction_id, name, role, base_points, damaged_w, damaged_desc) VALUES (?, ?, ?, ?, ?, ?, ?)"
// Extended to:
"INSERT INTO udb_units (id, faction_id, name, role, base_points, damaged_w, damaged_desc, sub_faction, name_fr) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
// Add binds:
.bind(str_val(row, "sub_faction"))     // NULL if missing
.bind(str_val(row, "name_fr"))         // NULL until Phase 111
```

**Same pattern for other tables:**
- `udb_factions` INSERT: add `.bind(str_val(row, "name_fr"))` (line 549-558)
- `udb_unit_abilities` INSERT: add `.bind(str_val(row, "name_fr"))` + `.bind(str_val(row, "description_fr"))` (lines 630-645)
- `udb_unit_weapons` INSERT: add `.bind(str_val(row, "name_fr"))` (lines 605-626)
- `udb_unit_keywords` INSERT: add `.bind(str_val(row, "keyword_fr"))` (lines 648-662)

**FTS5 rebuild** -- optionally include `sub_faction` in searchable text (line 717-728):
```rust
"INSERT INTO udb_search(unit_id, name, faction_name, keywords) \
 SELECT u.id, u.name, f.name, \
        COALESCE(u.sub_faction || ' ', '') || COALESCE(GROUP_CONCAT(k.keyword, ' '), '') \
 FROM udb_units u \
 JOIN udb_factions f ON f.id = u.faction_id \
 LEFT JOIN udb_unit_keywords k ON k.unit_id = u.id \
 GROUP BY u.id"
```

---

### `src/features/data-health/PointsCoverageCard.tsx` (component, request-response)

**Analog:** `src/features/data-health/DiagnosticsCard.tsx`

**Imports pattern** (lines 8-11):
```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
```

**Card layout pattern** (lines 27-76):
```typescript
export function PointsCoverageCard() {
  const { data, isLoading } = usePointsCoverage();  // new hook

  return (
    <Card>
      <CardHeader>
        <CardTitle>Points Coverage</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-10" />
            ))}
          </div>
        ) : (
          // Grid of per-faction badges
        )}
      </CardContent>
    </Card>
  );
}
```

**Badge severity pattern** (line 58-60):
```typescript
<Badge
  variant={
    coverage >= 85 ? "default"        // green via className
    : coverage >= 50 ? "secondary"    // amber
    : "destructive"                   // red
  }
>
```

---

### `src/db/queries/diagnostics.ts` -- MODIFY (add coverage query)

**Analog:** self (lines 42-50)

**Query function pattern** -- add alongside existing functions:
```typescript
export interface FactionCoverage {
  faction_id: string;
  faction_name: string;
  total_units: number;
  units_with_points: number;
  coverage_pct: number;
}

export async function getPointsCoverage(): Promise<FactionCoverage[]> {
  const db = await getDb();
  return db.select<FactionCoverage[]>(`
    SELECT f.id AS faction_id, f.name AS faction_name,
           COUNT(u.id) AS total_units,
           COUNT(CASE WHEN u.base_points IS NOT NULL OR p.unit_id IS NOT NULL THEN 1 END) AS units_with_points,
           ROUND(100.0 * COUNT(CASE WHEN u.base_points IS NOT NULL OR p.unit_id IS NOT NULL THEN 1 END) / COUNT(u.id), 1) AS coverage_pct
    FROM udb_factions f
    JOIN udb_units u ON u.faction_id = f.id
    LEFT JOIN (SELECT DISTINCT unit_id FROM udb_unit_points) p ON p.unit_id = u.id
    GROUP BY f.id ORDER BY f.name
  `);
}
```

---

### `src/hooks/useDiagnostics.ts` -- MODIFY (add coverage hook)

**Analog:** self (lines 33-44)

**Hook pattern** -- follows existing useQuery hooks in same file:
```typescript
export const POINTS_COVERAGE_KEY = ["diagnostics", "points-coverage"] as const;

export function usePointsCoverage() {
  return useQuery({
    queryKey: POINTS_COVERAGE_KEY,
    queryFn: getPointsCoverage,
  });
}
```

---

### `src/components/common/DbHealthGate.tsx` -- MODIFY (bump version)

**Analog:** self (line 9)

**Version bump** -- single constant change:
```typescript
// Current:
export const EXPECTED_SCHEMA_VERSION = 40;
// After migration 041:
export const EXPECTED_SCHEMA_VERSION = 41;
```

---

### `src/features/data-health/DataHealthPage.tsx` -- MODIFY (add section)

**Analog:** self (lines 19-41)

**Section insertion pattern** -- follows existing section layout:
```typescript
import { PointsCoverageCard } from "./PointsCoverageCard";

// Insert after DiagnosticsCard, before BackupCard:
<PointsCoverageCard />
```

---

## Shared Patterns

### Node.js Script Imports
**Source:** `scripts/build-unit-db.ts` lines 24-31
**Apply to:** All `scripts/lib/*.ts` files
```typescript
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
```

### DOMParser Polyfill (entry-point only)
**Source:** `scripts/build-unit-db.ts` lines 25-27
**Apply to:** `scripts/build-unit-db.ts`, `scripts/update-unit-database.ts` (NOT lib modules)
```typescript
import { DOMParser } from "@xmldom/xmldom";
// @ts-ignore - globalThis.DOMParser polyfill for Node.js
globalThis.DOMParser = DOMParser as unknown as typeof globalThis.DOMParser;
```

### React Query Hook Pattern
**Source:** `src/hooks/useDiagnostics.ts` lines 33-44
**Apply to:** New `usePointsCoverage` hook
```typescript
export const QUERY_KEY = ["namespace", "sub-key"] as const;

export function useQueryHook() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: queryFunction,
  });
}
```

### Card Component Pattern
**Source:** `src/features/data-health/DiagnosticsCard.tsx`
**Apply to:** `PointsCoverageCard.tsx`
- Uses `Card`, `CardContent`, `CardHeader`, `CardTitle` from shadcn/ui
- Loading state: `Skeleton` placeholders
- Empty state: green dot + message
- Data state: list/grid with `Badge` for severity

### Rust str_val/i64_val Helpers
**Source:** `src-tauri/src/lib.rs` lines 413-425
**Apply to:** All new `.bind()` calls in Rust INSERT statements
```rust
fn str_val(row: &JsRow, key: &str) -> Option<String> {
    row.get(key).and_then(|v| v.as_str()).filter(|s| !s.is_empty()).map(|s| s.to_string())
}
```
Missing keys naturally return `None`, which SQLite binds as NULL.

### Test Pattern (query mocking)
**Source:** `tests/data-health/diagnosticFlags.test.ts` lines 1-28
**Apply to:** New test files for coverage queries and component
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSelect = vi.fn();
vi.mock("@/db/client", () => ({
  getDb: vi.fn(() => Promise.resolve({ select: mockSelect })),
}));

beforeEach(() => {
  mockSelect.mockReset();
});
```

### Test Pattern (component rendering)
**Source:** `tests/data-health/tableCountsGrid.test.tsx` lines 8-9
**Apply to:** `PointsCoverageCard` test
```typescript
import { render, screen } from "@testing-library/react";
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `scripts/lib/normalize.ts` | utility | transform | Name normalization is a new capability; no existing string normalization in scripts/ |
| `scripts/data/aliases.json` | config | static | Manual alias table is a new data file with no precedent |

Both use simple, well-understood patterns (pure function + JSON file) that do not require analog guidance.

## Metadata

**Analog search scope:** `scripts/`, `src/features/data-health/`, `src/hooks/`, `src/db/queries/`, `src-tauri/src/`, `src-tauri/migrations/`, `src/components/common/`, `tests/data-health/`
**Files scanned:** 12 existing files read
**Pattern extraction date:** 2026-06-01
