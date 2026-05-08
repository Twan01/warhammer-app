# Phase 47: v0.2.6 Gap Closure - Research

**Researched:** 2026-05-08
**Domain:** TypeScript diff algorithm extension, snapshot data enrichment, React UI extension, documentation debt
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Snapshot data shape:**
- Extend `SNAPSHOT_TABLES` queries for composite-PK tables to store actual row data as JSON (not just COUNT(*))
- `rw_datasheet_models`: store full stats rows `[{datasheet_id, line, name, M, T, Sv, inv_sv, W, Ld, OC}]` as JSON
- `rw_datasheet_keywords`: store `[{datasheet_id, keyword, is_faction_keyword}]` as JSON
- `rw_datasheet_abilities`: store `[{datasheet_id, line, ability_id, name, description, type}]` as JSON
- `rw_datasheets_wargear`: keep COUNT(*) only (wargear detail diff is out of OVRD-06 scope)
- `rw_datasheets` snapshot query already stores `{id, name}` — no change needed

**Per-field diff granularity:**
- Extend `SyncDiff` interface with `modified` array: `{id, name, changes: [{field, oldValue, newValue}]}`
- Stats comparison: compare M/T/Sv/W/Ld/OC per model line; report "T: 5 → 6"
- Keywords comparison: report added/removed keywords by diffing sets per datasheet
- Abilities comparison: report added/removed ability names per datasheet
- `total_changed` includes modified datasheets in addition to existing added/removed/renamed

**Diff UI presentation:**
- Add "Modified" section to existing diff collapsible in PlaybookTab (lines 737-772)
- Per-datasheet expandable entries with field-level change details
- text-xs, text-muted-foreground styling matching existing sections
- Arrow notation: "T: 5 → 6", "OC: 1 → 2"
- Keyword/ability changes: "+Added Keyword" / "-Removed Keyword" format
- No new components — extend existing CollapsibleContent in PlaybookTab

**JSDoc correction:**
- armyLists.ts line 20: `COALESCE(alu.points_override, u.points, 0)` → `COALESCE(alu.points_override, uo.points, u.points, 0)`
- armyLists.ts line 159: `COALESCE(points_override, u.points, 0)` → `COALESCE(alu.points_override, uo.points, u.points, 0)`

**SUMMARY frontmatter:**
- Add `requirements_completed` entries to SUMMARY frontmatter in phases 43-01, 43-02, 44-01, 44-02, 45-01, 45-02, 46-01, 46-02

### Claude's Discretion
- Exact diff comparison algorithm for composite-PK table data (sort order, deep equality strategy)
- Whether to show model line names alongside stat changes
- Formatting details for long keyword/ability change lists (truncation threshold)
- How to handle first-sync case in extended diff (no baseline — empty diff as before)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| OVRD-06 | User can see what changed after a re-sync (points, stats, abilities, keywords changes) | Extend snapshot queries + SyncDiff interface + computeSyncDiff logic + PlaybookTab Modified section |
</phase_requirements>

## Summary

Phase 47 closes the remaining OVRD-06 gap with three coordinated changes to the existing snapshot/diff pipeline built in Phases 45-46. The current pipeline stores only `{id, name}` for datasheets and `COUNT(*)` for all composite-PK tables; it can detect added/removed/renamed datasheets but cannot detect field-level changes within a datasheet that persists across a sync. The fix requires enriching snapshot storage for three tables (`rw_datasheet_models`, `rw_datasheet_keywords`, `rw_datasheet_abilities`) and extending `computeSyncDiff` to compare these richer payloads.

The data model is already perfect for this: `rules_snapshot.snapshot_data` is a nullable `TEXT` column that already stores arbitrary JSON. The only changes needed are (1) swap the `null` query entries for three tables with real SELECT queries, (2) extend the `SyncDiff` interface with a `modified` array, (3) add comparison logic for stats/keywords/abilities in `computeSyncDiff`, and (4) render the new `modified` section in PlaybookTab's existing collapsible. No migrations, no new files for the diff infrastructure.

The tech-debt tasks (JSDoc correction and SUMMARY frontmatter) are purely textual edits to documentation. The SUMMARY frontmatter pattern is established: `requirements_completed: [REQ-01, REQ-02]` as a YAML array at the top-level frontmatter. Two SUMMARYs already use this field correctly (`36-01-SUMMARY.md` and `46-02-SUMMARY.md`); the eight target SUMMARYs are missing it.

**Primary recommendation:** Extend the existing snapshot/diff/UI pipeline in-place. No new files, no new DB schema, no new dependencies. The pure-function architecture of `computeSyncDiff` makes the extension straightforward and fully unit-testable without mocks.

## Standard Stack

### Core (already in project — no new installs)
| Component | Location | Current State | What Needs to Change |
|-----------|----------|--------------|---------------------|
| `rulesSnapshot.ts` | `src/db/queries/rulesSnapshot.ts` | 3 of 4 composite-PK tables have `query: null` | Replace null with rich SELECT for models, keywords, abilities |
| `computeSyncDiff.ts` | `src/lib/computeSyncDiff.ts` | Handles `rw_datasheets` add/remove/rename only | Add `modified` computation from extended snapshot data |
| `SyncDiff` interface | `src/lib/computeSyncDiff.ts` | `{added, removed, renamed, total_changed}` | Add `modified: ModifiedDatasheet[]` |
| `useRulesSync.ts` | `src/hooks/useRulesSync.ts` | Passes only `rw_datasheets` snapshot to diff | Pass models/keywords/abilities snapshot rows too |
| `PlaybookTab.tsx` | `src/features/units/PlaybookTab.tsx` (lines 737-776) | Shows removed/renamed/added sections | Add "Modified" section after renamed |

### No New Dependencies
No npm packages, no migrations, no new files needed. This phase operates entirely within existing infrastructure.

## Architecture Patterns

### Recommended Project Structure
No structural changes. All edits are in-place to existing files:
```
src/
  db/queries/rulesSnapshot.ts    — extend SNAPSHOT_TABLES queries
  lib/computeSyncDiff.ts         — extend SyncDiff interface + algorithm
  hooks/useRulesSync.ts          — pass extended snapshot data to computeSyncDiff
  features/units/PlaybookTab.tsx — add Modified section to diff collapsible
```

### Pattern 1: Extended SNAPSHOT_TABLES Query
**What:** Replace `null` with a full SELECT returning all relevant columns as JSON.
**When to use:** Composite-PK tables where field-level diff is needed.
**Current code (rulesSnapshot.ts lines 26-38):**
```typescript
// BEFORE (Phase 45 original):
{ table: "rw_datasheet_models",    query: null },
{ table: "rw_datasheet_abilities", query: null },
{ table: "rw_datasheet_keywords",  query: null },

// AFTER (Phase 47):
{ table: "rw_datasheet_models",
  query: "SELECT datasheet_id, line, name, M, T, Sv, inv_sv, W, Ld, OC FROM rw_datasheet_models ORDER BY datasheet_id, line" },
{ table: "rw_datasheet_abilities",
  query: "SELECT datasheet_id, line, ability_id, name, description, type FROM rw_datasheet_abilities ORDER BY datasheet_id, line" },
{ table: "rw_datasheet_keywords",
  query: "SELECT datasheet_id, keyword, is_faction_keyword FROM rw_datasheet_keywords ORDER BY datasheet_id, keyword" },
```

The `capturePreSyncSnapshot` function already handles this branch: when `query` is non-null, it runs the query and stores `JSON.stringify(rows)` in `snapshot_data`. No logic change needed in `capturePreSyncSnapshot`.

### Pattern 2: Extended SyncDiff Interface
**What:** Add `modified` array to the existing interface.
**Key insight:** Each modified entry is per-datasheet. Changes within a datasheet are heterogeneous (stat field, keyword add/remove, ability add/remove) — a generic `{field, oldValue, newValue}` tuple covers all cases.

```typescript
// New types to add to computeSyncDiff.ts:
export interface FieldChange {
  field: string;       // e.g., "T", "W", "+keyword:INFANTRY", "-keyword:CORE"
  oldValue: string;    // e.g., "5", "", "INFANTRY"
  newValue: string;    // e.g., "6", "INFANTRY", ""
}

export interface ModifiedDatasheet {
  id: string;
  name: string;
  changes: FieldChange[];
}

export interface SyncDiff {
  added: { id: string; name: string }[];
  removed: { id: string; name: string }[];
  renamed: { id: string; oldName: string; newName: string }[];
  modified: ModifiedDatasheet[];   // NEW
  total_changed: number;
}
```

### Pattern 3: Per-field Diff Algorithm
**What:** Map-based comparison for composite-PK table data from snapshot.
**Sort order discipline:** Always sort by `(datasheet_id, line)` for models/abilities, by `(datasheet_id, keyword)` for keywords before comparison. This ensures deterministic JSON — identical data produces identical JSON regardless of insertion order.

**Stats comparison approach:**
- Group snapshot rows by `datasheet_id` → Map<string, ModelRow[]>
- Group current rows by `datasheet_id` → Map<string, ModelRow[]>
- For each datasheet that exists in both snapshots (not added/removed/renamed):
  - Match lines by `line` field within the datasheet
  - For each matched line pair, compare M/T/Sv/W/Ld/OC individually
  - Report changed fields as `{field: "T", oldValue: "5", newValue: "6"}`

**Keywords comparison approach:**
- Group by datasheet_id → Set<string> of keywords
- Set difference: `before - after` = removed, `after - before` = added
- Report as `{field: "+INFANTRY", oldValue: "", newValue: "INFANTRY"}` or use a cleaner encoding

**Abilities comparison approach:**
- Group by datasheet_id → Set<string> of ability names
- Same set-difference approach as keywords
- Report added/removed ability names

**computeSyncDiff signature extension:**
```typescript
export function computeSyncDiff(
  datasheetSnapshotData: string | null,
  currentDatasheets: { id: string; name: string }[],
  modelsSnapshotData?: string | null,
  keywordsSnapshotData?: string | null,
  abilitiesSnapshotData?: string | null,
): SyncDiff
```
All three new parameters are optional — when absent, `modified` is empty. This maintains backward compatibility with existing tests.

### Pattern 4: useRulesSync Extension
**What:** Extract models/keywords/abilities snapshot rows alongside the existing datasheets row.
**Where to change:** The existing try/catch block that reads `preSyncSnapshotData` (useRulesSync.ts lines 143-151).

```typescript
// BEFORE:
let preSyncSnapshotData: string | null = null;
try {
  const existingSnapshot = await getLatestSnapshot();
  const dsRow = existingSnapshot.find((r) => r.table_name === "rw_datasheets");
  preSyncSnapshotData = dsRow?.snapshot_data ?? null;
} catch { /* first sync */ }

// AFTER:
let preSyncDsData: string | null = null;
let preSyncModelsData: string | null = null;
let preSyncKeywordsData: string | null = null;
let preSyncAbilitiesData: string | null = null;
try {
  const existingSnapshot = await getLatestSnapshot();
  preSyncDsData = existingSnapshot.find((r) => r.table_name === "rw_datasheets")?.snapshot_data ?? null;
  preSyncModelsData = existingSnapshot.find((r) => r.table_name === "rw_datasheet_models")?.snapshot_data ?? null;
  preSyncKeywordsData = existingSnapshot.find((r) => r.table_name === "rw_datasheet_keywords")?.snapshot_data ?? null;
  preSyncAbilitiesData = existingSnapshot.find((r) => r.table_name === "rw_datasheet_abilities")?.snapshot_data ?? null;
} catch { /* first sync */ }

// Then pass all four to computeSyncDiff:
diff = computeSyncDiff(preSyncDsData, currentDatasheets, preSyncModelsData, preSyncKeywordsData, preSyncAbilitiesData);
```

Note: `getLatestSnapshot()` already returns all 11 rows — no DB round-trip change needed.

### Pattern 5: PlaybookTab "Modified" Section
**What:** Add a "Modified" collapsible section to the existing diff collapsible.
**Where:** After the `{lastSyncDiff.renamed.length > 0 && ...}` block (line ~756), before `{lastSyncDiff.added.length > 0 && ...}`.
**Pattern:** Mirrors the existing renamed section structure — same text-xs + text-muted-foreground styling.

```tsx
{lastSyncDiff.modified.length > 0 && (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs font-semibold text-muted-foreground">
      Modified ({lastSyncDiff.modified.length})
    </span>
    {lastSyncDiff.modified.map((d) => (
      <div key={d.id} className="flex flex-col gap-0.5 pl-4">
        <span className="text-xs text-muted-foreground font-medium">{d.name}</span>
        {d.changes.map((c, i) => (
          <span key={i} className="text-xs text-muted-foreground pl-2">
            {c.oldValue && c.newValue
              ? `${c.field}: ${c.oldValue} → ${c.newValue}`
              : c.newValue
                ? `+${c.field}: ${c.newValue}`
                : `-${c.field}: ${c.oldValue}`}
          </span>
        ))}
      </div>
    ))}
  </div>
)}
```

The `total_changed` guard on the outer Collapsible (`lastSyncDiff.total_changed > 0`) already ensures the section only shows when something changed, including modified datasheets once `total_changed` includes `modified.length`.

### Pattern 6: Toast Extension
**What:** Extend the toast summary to mention modified count.
**Where:** PlaybookTab lines 545-553 — the diffParts array.
```typescript
// Add after the renamed push:
if (data.diff.modified.length > 0) diffParts.push(`${data.diff.modified.length} modified`);
```

### Anti-Patterns to Avoid
- **Sorting after extraction:** Sort snapshot rows at query time (ORDER BY in SQL) — do NOT sort in JavaScript after `JSON.parse`. Deterministic SQL ordering is the source of truth.
- **Comparing full JSON strings:** Do not use `JSON.stringify(before) === JSON.stringify(after)` at the datasheet level — compare field by field so the change list is meaningful.
- **Blocking sync on diff failure:** Existing `try/catch` around diff computation must remain. Extended diff is still best-effort.
- **Empty `modified` entries:** Only include a datasheet in `modified` if `changes.length > 0`. A datasheet with matching data must not appear in the modified array even if it technically touched all three sub-tables.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Snapshot storage | New table or new DB | Existing `rules_snapshot.snapshot_data` TEXT column | Already built in Phase 45; stores arbitrary JSON |
| Set difference for keywords | Custom tree or sort-merge | JavaScript `Set` + spread comparison | O(n) is sufficient; keyword sets per datasheet are small (<20 items) |
| UI change display | New component | Extend CollapsibleContent in PlaybookTab | No new Radix portals needed; existing structure fits |
| Requirements mapping | Re-reading all REQUIREMENTS.md | Traceability table below | Already established in REQUIREMENTS.md |

**Key insight:** The snapshot pipeline was intentionally designed to be extensible. Phase 45 made composite-PK table queries null as a placeholder — Phase 47 is the planned extension point.

## Common Pitfalls

### Pitfall 1: snapshot_data is null for composite-PK tables UNTIL Phase 47 ships
**What goes wrong:** If the user runs a sync before Phase 47 is deployed, the composite-PK table rows in `rules_snapshot` will have `snapshot_data = null`. On the NEXT sync after Phase 47 ships, the pre-sync snapshot will be the Phase-47-enriched one, but the baseline read at the start of `mutationFn` will still be the old null snapshot. The diff will correctly return `modified: []` (since null → no baseline for composite-PK tables) — this is the correct behavior per Phase 46 decisions.
**How to avoid:** The null-safe check (`if (!snapshotData) return emptyDiff`) already handles this. Extend it to also skip per-table diffs when their snapshot is null.
**Warning signs:** Tests should verify that null models/keywords/abilities snapshot data produces empty `modified` array.

### Pitfall 2: Composite-PK table rows are unordered in SQLite
**What goes wrong:** Two snapshots of the same data may produce different JSON if row order differs, causing false-positive changes.
**How to avoid:** All three new SELECT queries MUST include ORDER BY clauses: `ORDER BY datasheet_id, line` for models/abilities; `ORDER BY datasheet_id, keyword` for keywords.
**Warning signs:** Flaky tests where no-change syncs produce non-empty modified lists.

### Pitfall 3: rw_datasheet_keywords has no primary key — duplicates are theoretically possible
**What goes wrong:** Phase 44 confirmed `INSERT OR IGNORE` for keywords. But `rw_datasheet_keywords` has no single-column PK and no UNIQUE constraint per the schema (rules_001_schema.sql line 48-52). The same keyword could appear multiple times for a datasheet.
**How to avoid:** When building the "before" and "after" keyword sets, use `Set<string>` which deduplicates automatically. The keyword value itself is the identity key.
**Warning signs:** A keyword appearing twice in the snapshot causing it to not show as "removed" when it's actually removed once.

### Pitfall 4: JSDoc lines may have shifted from the stated line numbers
**What goes wrong:** CONTEXT.md cites lines 20 and 159 in armyLists.ts. Subsequent edits may have shifted these.
**How to avoid:** Verify actual line numbers in armyLists.ts before fixing. Confirmed during research: line 20 contains the JSDoc block comment with the stale COALESCE text; line 159 has the same issue in the readiness query JSDoc.
**Warning signs:** TypeScript build passes either way (JSDoc is not compiled); the fix is documentation-only.

### Pitfall 5: SUMMARY frontmatter inconsistency — `requirements` vs `requirements_completed`
**What goes wrong:** Phase 44-01 SUMMARY uses `requirements: [SYNC-01, SYNC-03, SYNC-04]` (bare array, not consistent with the established field name). Phase 36-01 and 46-02 use `requirements_completed: [...]`. The correct field name is `requirements_completed`.
**How to avoid:** When adding the field to the eight target SUMMARYs, use `requirements_completed`. Also correct phase 44-01 from `requirements:` to `requirements_completed:` if it's in scope (it is — 44-01 is listed in the tech debt targets).

## Code Examples

Verified from source code reads:

### Current capturePreSyncSnapshot branch logic (rulesSnapshot.ts lines 56-67)
```typescript
// This branch is already correct — just needs non-null queries:
if (query) {
  const rows = await rulesDb.select<{ id: string; name: string }[]>(query, []);
  rowCount = rows.length;
  snapshotData = JSON.stringify(rows);
} else {
  const countRows = await rulesDb.select<{ cnt: number }[]>(`SELECT COUNT(*) as cnt FROM ${table}`, []);
  rowCount = countRows[0]?.cnt ?? 0;
  snapshotData = null;
}
```
The `select<T>()` generic can be changed to the richer type. The rest of the function is unchanged.

### Current computeSyncDiff signature (computeSyncDiff.ts lines 31-34)
```typescript
export function computeSyncDiff(
  snapshotData: string | null,
  currentDatasheets: { id: string; name: string }[],
): SyncDiff
```
Extension adds three optional parameters after `currentDatasheets`.

### Current SyncDiff interface (computeSyncDiff.ts lines 16-21)
```typescript
export interface SyncDiff {
  added: { id: string; name: string }[];
  removed: { id: string; name: string }[];
  renamed: { id: string; oldName: string; newName: string }[];
  total_changed: number;
}
```
Add `modified: ModifiedDatasheet[]` before `total_changed`.

### Current test helper pattern (computeSyncDiff.test.ts lines 12-16)
```typescript
function ds(id: string, name: string) { return { id, name }; }
function snap(items: { id: string; name: string }[]): string { return JSON.stringify(items); }
```
New tests should add equivalent helpers for snapshot data: `modelSnap(rows)`, `keywordSnap(rows)`, `abilitySnap(rows)`.

### Actual armyLists.ts JSDoc text to correct (confirmed from source read):
- **Line 20:** Comment block at lines 11-22: "effective_points = COALESCE(alu.points_override, u.points, 0)" — should read "COALESCE(alu.points_override, uo.points, u.points, 0)"
- **Line 159:** JSDoc at lines 152-161: "Effective points = COALESCE(points_override, u.points, 0)" — should read "COALESCE(alu.points_override, uo.points, u.points, 0)"

### requirements_completed frontmatter format (confirmed from 36-01-SUMMARY.md):
```yaml
requirements_completed: [DATA-06]
```
For multiple requirements:
```yaml
requirements_completed: [SYNC-01, SYNC-03, SYNC-04]
```

## Requirements Mapping for SUMMARY Frontmatter

Based on REQUIREMENTS.md traceability table and SUMMARY content:

| SUMMARY File | requirements_completed |
|---|---|
| 43-01-SUMMARY.md | SCHEMA-05 (TypeScript types, queries, hooks for extended rules data) |
| 43-02-SUMMARY.md | SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04 (PlaybookTab UI sections — already in `provides` field) |
| 44-01-SUMMARY.md | SYNC-01, SYNC-03, SYNC-04 (already has `requirements:` — rename field + SYNC-02 belongs to 44-02) |
| 44-02-SUMMARY.md | SYNC-02, SYNC-05 (per-table counts toast + cache invalidation) |
| 45-01-SUMMARY.md | META-01, META-02, META-03, META-04, META-06 (snapshot + freshness + error persistence) |
| 45-02-SUMMARY.md | META-05 (freshness indicator on rules-dependent pages) |
| 46-01-SUMMARY.md | OVRD-02, OVRD-03, OVRD-04 (stats/keywords/abilities override data layer; OVRD-01 wired in 46-02) |
| 46-02-SUMMARY.md | OVRD-01, OVRD-05, OVRD-06, OVRD-07 (already present as `requirements-completed:` — standardize field name to `requirements_completed:`) |

Note: These mappings require verification against actual SUMMARY content during implementation. The planner should cross-reference each SUMMARY's "What Was Built" section against the requirement definitions.

## State of the Art

| Old Approach | Current Approach | Notes |
|---|---|---|
| COUNT(*) for composite-PK tables in snapshot | Full row JSON for models/keywords/abilities | Phase 47 change |
| `SyncDiff` shows add/remove/rename only | `SyncDiff` also shows per-field modifications | Phase 47 extension |
| Toast shows "N added/removed/renamed" | Toast also shows "N modified" | Phase 47 extension |

## Open Questions

1. **Model line name in stat changes**
   - What we know: `rw_datasheet_models` has a `name` column (e.g., "Intercessor Sergeant") and a `line` integer
   - What's unclear: Should stat change entries say "T (line 1: Sergeant): 5 → 6" or just "T: 5 → 6"?
   - Recommendation (Claude's discretion): Include model name when non-null and when there are multiple model lines per datasheet; omit when a datasheet has only one model line. Keeps output concise for single-line datasheets while informative for multi-profile ones.

2. **Long keyword/ability change lists**
   - What we know: Some datasheets have 10-20 keywords
   - What's unclear: Truncation threshold for display
   - Recommendation (Claude's discretion): Show up to 5 changes inline, then "…and N more" label. Matches the existing sync error list that uses `slice(0, 10)` for truncation.

3. **44-01 `requirements:` field vs `requirements_completed:`**
   - What we know: Phase 44-01 already has `requirements: [SYNC-01, SYNC-03, SYNC-04]` — this is the correct data but wrong field name
   - Recommendation: Rename the field to `requirements_completed:` and verify SYNC-02/SYNC-05 go in 44-02, not 44-01.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test -- tests/datasheet/computeSyncDiff.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| OVRD-06 | computeSyncDiff detects field-level stat changes in modified datasheets | unit | `pnpm test -- tests/datasheet/computeSyncDiff.test.ts` | ✅ (extend existing) |
| OVRD-06 | computeSyncDiff detects added/removed keywords per datasheet | unit | `pnpm test -- tests/datasheet/computeSyncDiff.test.ts` | ✅ (extend existing) |
| OVRD-06 | computeSyncDiff detects added/removed abilities per datasheet | unit | `pnpm test -- tests/datasheet/computeSyncDiff.test.ts` | ✅ (extend existing) |
| OVRD-06 | computeSyncDiff returns empty modified when models/keywords/abilities snapshots are null | unit | `pnpm test -- tests/datasheet/computeSyncDiff.test.ts` | ✅ (extend existing) |
| OVRD-06 | total_changed includes modified.length | unit | `pnpm test -- tests/datasheet/computeSyncDiff.test.ts` | ✅ (extend existing) |

All new test cases extend `tests/datasheet/computeSyncDiff.test.ts` — a pure-function test file with no mocks.

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/datasheet/computeSyncDiff.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements. `computeSyncDiff.test.ts` exists (7 passing tests) and accepts in-process extension.

## Sources

### Primary (HIGH confidence)
- Direct source code reads of `rulesSnapshot.ts`, `computeSyncDiff.ts`, `useRulesSync.ts`, `PlaybookTab.tsx`, `armyLists.ts`, `rules_001_schema.sql`, `016_rules_snapshot.sql` — all canonical refs from CONTEXT.md verified
- Phase 43-46 SUMMARY files — confirmed actual requirements completed per phase
- REQUIREMENTS.md — verified OVRD-06 is the only pending requirement

### Secondary (MEDIUM confidence)
- Pattern inference from existing `snap()` helper and `Map`-based diff algorithm in `computeSyncDiff.ts` — extension approach matches existing style

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all implementation files read directly; no new libraries
- Architecture: HIGH — extension points are explicit (null queries in SNAPSHOT_TABLES, optional params in computeSyncDiff)
- Pitfalls: HIGH — derived from source code examination (schema, sort order, null handling)

**Research date:** 2026-05-08
**Valid until:** 2026-06-08 (stable codebase; no external dependencies changing)
