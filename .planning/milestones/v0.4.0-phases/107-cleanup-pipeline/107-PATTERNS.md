# Phase 107: Cleanup & Pipeline - Pattern Map

**Mapped:** 2026-05-30
**Files analyzed:** 45+ (deletions, modifications, and new files)
**Analogs found:** 6 / 8 (modification/creation targets with analogs)

## File Classification

This phase is primarily a deletion phase (~30 files deleted) with a smaller set of modifications (~15 files) and new files (2-3). Only modification and creation targets need pattern mapping -- deletion targets need no analog.

### Files to DELETE (no pattern needed)

These files are deleted entirely. Listed for planner reference only.

| File | Role | Notes |
|------|------|-------|
| `src/db/rules-client.ts` | db-client | Entire module removed |
| `src/db/queries/datasheets.ts` | query | Superseded by unitDatabase.ts |
| `src/db/queries/rulesExtended.ts` | query | Deferred (EXT-03) |
| `src/db/queries/syncErrors.ts` | query | Dead sync code |
| `src/db/queries/rulesSnapshot.ts` | query | Dead sync code |
| `src/db/queries/pointsImportHistory.ts` | query | Dead sync code |
| `src/db/queries/unitRulesMapping.ts` | query | Bridge no longer needed |
| `src/hooks/useRulesSync.ts` | hook | CSV sync pipeline |
| `src/hooks/useRulesExtended.ts` | hook | Stratagems/detachments |
| `src/hooks/useSyncErrors.ts` | hook | Sync error display |
| `src/hooks/useUnitRulesMapping.ts` | hook | Unit rules mapping |
| `src/lib/parseWahapediaCsv.ts` | utility | Sync utility |
| `src/lib/validateCsvHeaders.ts` | utility | Sync utility |
| `src/lib/computeSyncDiff.ts` | utility | Sync utility |
| `src/lib/syncFreshness.ts` | utility | Sync utility |
| `src/lib/normalizePointsNames.ts` | utility | Sync utility |
| `src/features/rules-hub/SyncStatusCard.tsx` | component | Sync UI |
| `src/features/rules-hub/PointsDeltaSection.tsx` | component | Sync UI |
| `src/features/units/PlaybookSyncDetails.tsx` | component | Sync UI |
| `src-tauri/migrations/rules_001_schema.sql` | migration | rules.db |
| `src-tauri/migrations/rules_002_wargear_abilities.sql` | migration | rules.db |
| `src-tauri/migrations/rules_003_sync_meta_counts.sql` | migration | rules.db |
| `src-tauri/migrations/rules_004_datasheet_points.sql` | migration | rules.db |
| `src/types/pointsDelta.ts` | type | Sync-only type |
| `src/types/unitRulesMapping.ts` | type | Bridge type |
| ~16 test files under `tests/datasheet/` and `tests/rules-sync/` | test | Dead tests |

### Files to MODIFY or CREATE

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/hooks/useDatasheet.ts` | hook | request-response | `src/hooks/useUnitDatabase.ts` | exact |
| `src/hooks/useUnitKeywords.ts` | hook | request-response | `src/hooks/useUnitDatabase.ts` | exact |
| `src/db/queries/diagnostics.ts` | query | CRUD | `src/db/queries/unitDatabase.ts` | role-match |
| `src/features/rules-hub/RulesHubPage.tsx` | component | request-response | `src/features/database-browser/DatabaseBrowserPage.tsx` | role-match |
| `src/features/units/PlaybookTab.tsx` | component | request-response | (self -- redirect imports) | partial |
| `src/features/army-lists/DetachmentPicker.tsx` | component | request-response | (no analog -- stub) | none |
| `src-tauri/src/lib.rs` | backend | config | (self -- surgical removal) | exact |
| `src-tauri/tauri.conf.json` | config | config | (self -- remove line) | exact |
| `scripts/update-unit-database.ts` | utility | batch | `scripts/build-unit-db.ts` | exact |
| `src/hooks/useUdbMeta.ts` (NEW) | hook | request-response | `src/hooks/useUnitDatabase.ts` | exact |
| ~11 component files | component | request-response | (each redirects useRulesSyncMeta to useUdbMeta) | role-match |

## Pattern Assignments

### `src/hooks/useDatasheet.ts` (hook, request-response) -- REDIRECT

**Analog:** `src/hooks/useUnitDatabase.ts`

**Imports pattern** (lines 1-6):
```typescript
import { useQuery } from "@tanstack/react-query";
import {
  getUdbUnitsByFaction,
  getUdbUnitDetail,
} from "@/db/queries/unitDatabase";
```

**Core hook pattern** (lines 34-56 of useUnitDatabase.ts):
```typescript
// Disabled-when-null pattern used by all udb hooks
export function useUdbUnits(factionId: string | null) {
  return useQuery({
    queryKey:
      factionId !== null
        ? UDB_UNITS_KEY(factionId)
        : (["udb-units", "disabled"] as const),
    queryFn: () =>
      factionId !== null ? getUdbUnitsByFaction(factionId) : Promise.resolve([]),
    enabled: !!factionId,
    staleTime: Infinity,
  });
}
```

**Key changes:** Replace all imports from `@/db/queries/datasheets` with equivalent functions from `@/db/queries/unitDatabase`. Replace `getRulesSyncMeta` with udb_meta query. Replace `getDatasheetsByFaction` with `getUdbUnitsByFaction`. Replace `getFullDatasheet` with `getUdbUnitDetail`. Replace `resolveWahapediaFactionIdByName` with `getUdbFactions` lookup (same IDs).

**Cache key pattern** (lines 23-29 of useUnitDatabase.ts):
```typescript
export const UDB_FACTIONS_KEY = ["udb-factions"] as const;
export const UDB_UNITS_KEY = (factionId: string) =>
  ["udb-units", factionId] as const;
export const UDB_UNIT_DETAIL_KEY = (unitId: string) =>
  ["udb-unit-detail", unitId] as const;
```

---

### `src/hooks/useUdbMeta.ts` (NEW hook, request-response)

**Analog:** `src/hooks/useUnitDatabase.ts` lines 34-56

**Imports pattern:**
```typescript
import { useQuery } from "@tanstack/react-query";
import { getDb } from "@/db/client";
```

**Core pattern** (from RESEARCH.md code example):
```typescript
export const UDB_META_KEY = ["udb-meta"] as const;

export function useUdbMeta() {
  return useQuery({
    queryKey: UDB_META_KEY,
    queryFn: async () => {
      const db = await getDb();
      const rows = await db.select<UdbMeta[]>(
        "SELECT version, built_at, game_system, unit_count, faction_count FROM udb_meta WHERE id = 1",
      );
      return rows[0] ?? null;
    },
    staleTime: Infinity,
  });
}
```

**Note:** This replaces `useRulesSyncMeta()` across 11 consumer components. The hook returns version/timestamp instead of sync metadata.

---

### `src/db/queries/diagnostics.ts` (query, CRUD) -- MODIFY

**Analog:** `src/db/queries/unitDatabase.ts` (for getDb-only pattern)

**Current imports to remove** (line 15):
```typescript
// DELETE this line:
import { getRulesDb } from "@/db/rules-client";
```

**getSchemaVersions pattern -- BEFORE** (lines 71-91):
```typescript
// Current: queries both getDb() and getRulesDb()
export async function getSchemaVersions(): Promise<SchemaVersions> {
  const [db, rulesDb] = await Promise.all([getDb(), getRulesDb()]);
  // ...
}
```

**getSchemaVersions pattern -- AFTER** (single-DB only):
```typescript
// Remove `rules` property from SchemaVersions interface
export interface SchemaVersions {
  hobbyforge: number;
}

export async function getSchemaVersions(): Promise<SchemaVersions> {
  const db = await getDb();
  const hfRows = await db.select<Record<string, number>[]>("PRAGMA user_version");
  const extractVersion = (row: Record<string, number> | undefined): number => {
    if (!row) return 0;
    if (typeof row.user_version === "number") return row.user_version;
    const values = Object.values(row);
    return typeof values[0] === "number" ? values[0] : 0;
  };
  return { hobbyforge: extractVersion(hfRows[0]) };
}
```

**getUnmatchedPointsCount -- DELETE entirely** (lines 141-162): queries rw_datasheet_points in rules.db, no replacement needed.

**getDiagnosticFlags -- MODIFY** (lines 190-198): remove `getUnmatchedPointsCount()` from the Promise.all array.

---

### `src-tauri/src/lib.rs` (backend, config) -- MODIFY

**Sections to remove:**

1. **get_rules_migrations function** (lines 245-272): Entire function deleted.

2. **preflight_migration_repair rules.db block** (lines 420-423, 429-431):
```rust
// DELETE these lines:
let rules_db = app_data_dir.join("rules.db");
let rules_migrations = get_rules_migrations();
// ...
if let Err(e) = repair_migration_checksums(&rules_db, &rules_migrations).await {
    eprintln!("[hobbyforge] rules db repair failed: {e}");
}
```

3. **bulk_sync_rules function + types** (lines ~495-564+): Delete `BulkSyncPayload`, `SyncResult` structs, and entire `bulk_sync_rules` async function.

4. **Plugin builder** (lines 1524-1525):
```rust
// DELETE this line:
.add_migrations("sqlite:rules.db", get_rules_migrations())
```

5. **Invoke handler** (line 1529):
```rust
// DELETE from generate_handler![]:
bulk_sync_rules,
```

6. **BackupManifest -- KEEP fields, change values** (lines 1267, 1347):
```rust
// BEFORE:
rules_schema_version: get_rules_migrations().len() as u32,
// AFTER:
rules_schema_version: 0,
```

---

### `src-tauri/tauri.conf.json` (config) -- MODIFY

**Line 52:** Remove `"sqlite:rules.db"` from preload array:
```json
// BEFORE:
"preload": [
  "sqlite:hobbyforge.db",
  "sqlite:rules.db"
]

// AFTER:
"preload": [
  "sqlite:hobbyforge.db"
]
```

---

### `scripts/update-unit-database.ts` (NEW utility, batch)

**Analog:** `scripts/build-unit-db.ts`

**Imports pattern** (lines 1-31 of build-unit-db.ts):
```typescript
import { DOMParser } from "@xmldom/xmldom";
globalThis.DOMParser = DOMParser as unknown as typeof globalThis.DOMParser;

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..");
```

**Inlined parser pattern** (lines 41-51 of build-unit-db.ts):
```typescript
// Reuse the same pipe-delimited CSV parser
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

**Script extends build-unit-db.ts with:** reading existing `unit_database.json`, running the full build pipeline to produce new data, then computing a diff report (new units, removed units, changed points, changed abilities, changed keywords) and printing it to stdout.

---

### `src/features/rules-hub/RulesHubPage.tsx` (component, request-response) -- SIMPLIFY

**Analog:** `src/features/database-browser/DatabaseBrowserPage.tsx` (redirect target)

**Current imports to remove** (lines 15-31):
```typescript
// DELETE these imports:
import { SyncStatusCard } from "./SyncStatusCard";
import { useRulesSyncMeta, useWahapediaFactions } from "@/hooks/useDatasheet";
import {
  useStratagemsByFaction,
  useDetachmentsByFaction,
  useSharedAbilitiesByFaction,
} from "@/hooks/useRulesExtended";
import type { SyncDiff } from "@/lib/computeSyncDiff";
import type { PointsDelta } from "@/types/pointsDelta";
```

**Approach:** Strip sync controls, sync state, and rules-extended tabs. Keep the page as a thin wrapper rendering `DatabaseBrowserPage` content or redirect the route entirely.

---

## Shared Patterns

### useRulesSyncMeta to useUdbMeta Migration
**Source:** `src/hooks/useUnitDatabase.ts` (hook pattern), `src/db/queries/unitDatabase.ts` (query pattern)
**Apply to:** 11 consumer components that import `useRulesSyncMeta`

All 11 components follow the same migration pattern:
```typescript
// BEFORE:
import { useRulesSyncMeta } from "@/hooks/useDatasheet";
const { data: syncMeta } = useRulesSyncMeta();
// Used as: syncMeta?.last_synced, syncMeta?.datasheet_count, etc.

// AFTER:
import { useUdbMeta } from "@/hooks/useUdbMeta";
const { data: udbMeta } = useUdbMeta();
// Used as: udbMeta?.version, udbMeta?.built_at, udbMeta?.unit_count, etc.
```

**Affected files:**
- `src/features/army-lists/ArmyListDetailPage.tsx`
- `src/features/army-lists/ArmyListDetailSheet.tsx`
- `src/features/army-lists/PointsFreshnessBadge.tsx`
- `src/features/units/PlaybookTab.tsx`
- `src/features/rules-hub/RulesHubPage.tsx`
- `src/features/dashboard/DataHealthSummaryCard.tsx`
- `src/features/dashboard/ReadyToPlayCard.tsx`
- `src/features/data-health/DiagnosticsCard.tsx`
- `src/features/data-health/VersionInfoCard.tsx`
- `src/features/game-day/GameDayPage.tsx`
- `src/db/queries/diagnostics.ts`

### getDb() Singleton Pattern
**Source:** `src/db/client.ts`
**Apply to:** All redirected query functions

```typescript
import { getDb } from "@/db/client";

// All queries use this pattern:
const db = await getDb();
const rows = await db.select<TypeName[]>("SELECT ... FROM udb_* WHERE ... = $1", [param]);
```

### Graceful Degradation for Missing Data (Stratagems/Detachments)
**Source:** No existing analog (new pattern for EXT-03 deferred features)
**Apply to:** `DetachmentPicker.tsx`, `StrategemsTab.tsx`, `DetachmentCard.tsx`, `PlaybookRules.tsx`

Pattern: Return empty arrays from stub hooks, hide UI sections conditionally.
```typescript
// Stub hook pattern for features losing data source:
export function useDetachmentsByFaction(_factionId: string | undefined) {
  return { data: [], isLoading: false };
}
```

### BackupManifest Backward Compatibility
**Source:** `src-tauri/src/lib.rs` lines 1137-1140
**Apply to:** BackupManifest struct modifications

```rust
// KEEP these fields with #[serde(default)] for backward compat:
#[serde(default)]
pub rules_schema_version: u32,
#[serde(default)]
pub includes_rules_db: bool,
// Set to 0 / false in new backups. Old backups deserialize correctly.
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/features/army-lists/DetachmentPicker.tsx` (stub) | component | request-response | No existing stub/placeholder pattern in codebase -- detachment data is not in udb_* (EXT-03 deferred) |
| `src/features/game-day/StrategemsTab.tsx` (stub) | component | request-response | Stratagems data source removed, no udb_* equivalent |

These components should degrade gracefully with empty state UI or "coming in future update" placeholder text.

## Metadata

**Analog search scope:** `src/db/`, `src/hooks/`, `src/features/`, `scripts/`, `src-tauri/src/`
**Files scanned:** 45+ across deletion/modification/creation targets
**Pattern extraction date:** 2026-05-30
