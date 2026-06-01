---
phase: 107-cleanup-pipeline
reviewed: 2026-06-01T12:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - src/hooks/useUdbMeta.ts
  - src/hooks/useDatasheet.ts
  - src/hooks/useUnitKeywords.ts
  - src/lib/syncFreshness.ts
  - src/lib/computeUnitWarnings.ts
  - src-tauri/src/lib.rs
  - src-tauri/tauri.conf.json
  - scripts/update-unit-database.ts
  - src/features/data-health/VersionInfoCard.tsx
  - tests/data-health/versionInfoCard.test.tsx
findings:
  critical: 2
  warning: 5
  info: 2
  total: 9
status: issues_found
---

# Phase 107: Code Review Report

**Reviewed:** 2026-06-01
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Phase 107 consolidates from dual-database to single-database architecture, replaces useRulesSyncMeta with useUdbMeta, adds a dev-side update script, and wires data version display into the UI. The code is generally well-structured. Key concerns: a race condition between the async UDB import and the plugin-sql connection on first launch, non-deterministic version hashing in the update script, and an arbitrary file write command exposed without path validation.

## Critical Issues

### CR-01: Race condition between async UDB import and plugin-sql on first launch

**File:** `src-tauri/src/lib.rs:1119-1128`
**Issue:** The setup hook spawns `import_unit_database_inner` as a fire-and-forget async task (`tauri::async_runtime::spawn`) while `tauri_plugin_sql` is initialized as a plugin with the same `sqlite:hobbyforge.db` database. On first launch (fresh install), the migration creates the udb_* tables via plugin-sql, but the spawned import task opens a *separate* sqlx connection to the same database. Both connections run concurrently. The import task may attempt to write to udb_* tables while plugin-sql is still running migrations, or the frontend may query udb_meta (via React Query) before the import task completes, seeing an empty table and caching `null` with `staleTime: Infinity`. Since the hook uses `staleTime: Infinity`, a null result is cached permanently for the session -- the user sees "Not imported" even after the import finishes.
**Fix:** Either (a) run the import synchronously *after* plugin-sql initialization by awaiting it in the setup hook, or (b) invalidate the `UDB_META_KEY` cache from the frontend after the import command completes, or (c) emit a Tauri event when import finishes and have the frontend invalidate the cache on receipt.

### CR-02: `write_bytes_to_path` allows arbitrary file writes without path validation

**File:** `src-tauri/src/lib.rs:1093-1094`
**Issue:** The `write_bytes_to_path` command accepts an arbitrary `destination` path from the frontend and writes bytes to it with no validation. With CSP disabled (`"csp": null` in tauri.conf.json), if any XSS vector is introduced (e.g., via injected data in unit names rendered with `dangerouslySetInnerHTML`, or a future webview exploit), an attacker could overwrite arbitrary files on the user's system. While this is a desktop app with current low attack surface, the command has zero guardrails -- no allowlist, no directory restriction, no extension check.
**Fix:** Validate that `destination` is within an expected directory (e.g., user-selected via save dialog yields paths under known folders), or restrict to specific extensions (`.pdf`), or use Tauri's fs scope to constrain writes.

## Warnings

### WR-01: Non-deterministic version hash includes current date

**File:** `scripts/update-unit-database.ts:624-626`
**Issue:** The version hash seed includes `new Date().toISOString().slice(0, 10)` (today's date). This means running the script twice on different days with identical source data produces different versions. The Rust import uses version comparison to skip re-import (`if ver == &payload.version { return Ok(...) }`), so a rebuild on a different day would trigger a full reimport even though the data is identical. This also makes the diff report show false-positive "version changed" when no actual data changed.
**Fix:** Remove the date from the content seed, or use a deterministic hash over the full serialized content:
```typescript
const contentSeed = JSON.stringify({ factions: filteredFactions, units, weapons, points, keywords, abilities, models, composition });
const hash = crypto.createHash("sha256").update(contentSeed).digest("hex").slice(0, 8);
```

### WR-02: `syncFreshness` always returns "fresh", making stale-data warnings unreachable

**File:** `src/lib/syncFreshness.ts:11-12` and `src/lib/computeUnitWarnings.ts:94-96`
**Issue:** `getSyncFreshness()` is hardcoded to always return `"fresh"`. The `computeListWarnings` function checks `context.freshness === "stale"` to emit a "Stale points data" warning, but this branch is now permanently unreachable dead code. If the bundled data becomes outdated (e.g., user running an old app version after a GW points update), there is no mechanism to warn them. The `SyncFreshness` type still exports `"aging"` and `"stale"` variants and the `FRESHNESS_DOT_CLASS` map includes styling for them, creating a false impression of functionality.
**Fix:** Either (a) add date-based staleness logic using `udb_meta.built_at` (e.g., data older than 90 days = "aging", 180 days = "stale"), or (b) remove the stale check from `computeListWarnings` and simplify `SyncFreshness` to just `"fresh"` to avoid misleading types.

### WR-03: `useUnitKeywords` returns mutable shared default object

**File:** `src/hooks/useUnitKeywords.ts:21`
**Issue:** `SAFE_DEFAULT` is a module-level constant object `{ isCharacter: false, isEpicHero: false }` returned directly from the queryFn when `unitName` is undefined. If any consumer mutates this object (e.g., `result.data.isCharacter = true`), it would affect all other consumers sharing the same reference. React Query typically protects against this via structural sharing, but the default is returned from within `queryFn` before React Query's caching layer processes it.
**Fix:** Return a fresh object instead of the shared reference:
```typescript
if (unitName === undefined) return { ...SAFE_DEFAULT };
```

### WR-04: `useDatasheet` queries `units` table by numeric `unitId` but lookups `udb_unit_id` as a string FK

**File:** `src/hooks/useDatasheet.ts:42-48`
**Issue:** The hook first queries `units.udb_unit_id` (a string FK) from the collection unit, then passes it to `getUdbUnitDetail(udbUnitId)`. The `udb_unit_id` column is typed as `string | null`, but the query `SELECT udb_unit_id FROM units WHERE id = $1` could return rows where `udb_unit_id` is an empty string `""` rather than null (depending on how units were created). The check `if (!udbUnitId) return null` would catch empty strings, but the function name `useDatasheet(unitId)` accepts a *collection* unit ID, not a udb unit ID -- this is confusing and the parameter name should reflect that it's a collection unit ID. More critically, if the collection unit doesn't exist (deleted between render and query), `rows[0]` is undefined and `rows[0]?.udb_unit_id` evaluates to `undefined`, which passes the `!udbUnitId` check. But `getUdbUnitDetail` receives `undefined` -- its parameter is typed as `string`, not `string | undefined`.
**Fix:** Add an explicit null check:
```typescript
const row = rows[0];
if (!row || !row.udb_unit_id) return null;
return getUdbUnitDetail(row.udb_unit_id);
```

### WR-05: DOMParser polyfill assigned with `@ts-ignore` hides type safety issues

**File:** `scripts/update-unit-database.ts:21`
**Issue:** The `@ts-ignore` suppresses type checking on the DOMParser polyfill assignment. The `@xmldom/xmldom` DOMParser has a different API surface than the browser's DOMParser (e.g., it does not throw on parse errors, it returns a document with `<parsererror>` elements instead). The `as unknown as Document` cast on line 133 (`parseCatXml`) compounds this -- if xmldom returns an error document, the code silently processes garbage data without detecting the parse failure.
**Fix:** Check for parse errors after `parseFromString`:
```typescript
const doc = parser.parseFromString(xml, "text/xml");
const errors = doc.getElementsByTagName("parsererror");
if (errors.length > 0) {
  console.error(`XML parse error in ${catalogueName}`);
  continue;
}
```

## Info

### IN-01: Massive code duplication between `update-unit-database.ts` and `build-unit-db.ts`

**File:** `scripts/update-unit-database.ts:34-643`
**Issue:** The update script explicitly comments that it "mirrors build-unit-db.ts" and inlines ~600 lines of duplicated logic (CSV parsing, faction map, BSData extraction, type definitions). Any bug fix or logic change in `build-unit-db.ts` must be manually replicated here. This is a maintenance risk.
**Fix:** Extract shared logic into a common module (e.g., `scripts/lib/pipeline.ts`) and import from both scripts.

### IN-02: `computeUnitWarnings` accepts unused `_context` parameter

**File:** `src/lib/computeUnitWarnings.ts:55`
**Issue:** The `_context: WarningContext` parameter is prefixed with underscore indicating it's unused, but it's still part of the public API and callers must construct and pass a `WarningContext` object. This was presumably used before the Phase 76 split moved list-level warnings to `computeListWarnings`. The parameter adds unnecessary coupling.
**Fix:** Remove the `_context` parameter from `computeUnitWarnings` and update the 3 call sites to pass only the unit.

---

_Reviewed: 2026-06-01_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
