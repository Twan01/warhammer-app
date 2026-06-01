---
phase: 111-bilingual-infrastructure
reviewed: 2026-06-01T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - scripts/build-unit-db.ts
  - scripts/data/translations_fr.json
  - scripts/lib/types.ts
  - src-tauri/src/lib.rs
  - src/components/common/AppSidebar.tsx
  - src/components/common/LocaleToggle.tsx
  - src/db/queries/unitDatabase.ts
  - src/hooks/useDatasheet.ts
  - src/hooks/useUnitDatabase.ts
  - src/stores/localeStore.ts
  - tests/build-pipeline/translations-overlay.test.ts
  - tests/unit-database/locale-queries.test.ts
  - tests/unit-database/locale-store.test.ts
  - tests/unit-database/locale-toggle.test.ts
findings:
  critical: 3
  warning: 5
  info: 4
  total: 12
status: issues_found
---

# Phase 111: Code Review Report

**Reviewed:** 2026-06-01T00:00:00Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

This phase adds bilingual (EN/FR) infrastructure: a French translation overlay in the build pipeline, locale-aware SQL queries in the query layer, a Zustand locale store, and a `LocaleToggle` component wired into the sidebar. The architecture is sound and the core wiring is correct, but three blockers were found: a FK-safety gap in `lib.rs` (FK enforcement is never restored when the transaction errors), a sort-order bug in the locale-aware faction query (always sorts on the raw `name` column, breaking French-locale alphabetical order), and a `require()` call inside an ES-module test file that will fail at runtime. Five warnings round out quality and robustness concerns.

---

## Critical Issues

### CR-01: `PRAGMA foreign_keys = ON` is never executed after a transaction error in `import_unit_database_inner`

**File:** `src-tauri/src/lib.rs:521-750`

**Issue:** `PRAGMA foreign_keys = OFF` is executed on `conn` at line 521 before the transaction begins. The `PRAGMA foreign_keys = ON` at line 747 runs only on the happy path, after `tx.commit()`. If any `INSERT` or the `tx.commit()` call returns an `Err`, the function propagates the error immediately without ever restoring FK enforcement on that connection. Because `conn` is dropped when the function returns and sqlx uses connection pooling (or at minimum reuses the underlying file-level state), FK enforcement can remain silently disabled for the life of the process on that DB file.

**Fix:** Restore FK enforcement unconditionally before returning, using a `defer`-like guard or an explicit restore at every early-return site. The safest pattern in async Rust is to restore in a `finally`-equivalent:

```rust
// After the transaction (commit or error) — before returning
let fk_res = sqlx::query("PRAGMA foreign_keys = ON")
    .execute(&mut conn)
    .await;
if let Err(e) = fk_res {
    eprintln!("[hobbyforge] warning: could not restore FK enforcement: {e}");
}
// Then propagate the original error, if any
result?;
```

---

### CR-02: Faction list sorts by the raw `name` column in French locale — localized names are not sorted alphabetically

**File:** `src/db/queries/unitDatabase.ts:141`

**Issue:** `getUdbFactions` constructs `nameSql` as `COALESCE(name_fr, name) AS name` when `locale='fr'`, but the `ORDER BY` clause is hardcoded to `ORDER BY name ASC`. In SQLite, `ORDER BY name` refers to the base `name` column (the English original), not the computed alias. French factions will be returned in English alphabetical order. This makes the faction picker appear unsorted to French users.

```sql
-- Current (broken for FR): always sorts by English name
SELECT id, COALESCE(name_fr, name) AS name, short_name
FROM udb_factions
ORDER BY name ASC   -- 'name' resolves to the column, not the alias
```

**Fix:** Reference the alias name explicitly, or repeat the expression in the ORDER BY:

```ts
const orderSql = locale === "fr"
  ? "ORDER BY COALESCE(name_fr, name) ASC"
  : "ORDER BY name ASC";
return db.select<UdbFaction[]>(
  `SELECT id, ${nameSql}, short_name FROM udb_factions ${orderSql}`,
);
```

---

### CR-03: `require()` inside an ES-module test file causes a hard runtime failure

**File:** `tests/build-pipeline/translations-overlay.test.ts:31`

**Issue:** The file is an ES module (it uses top-level `import` statements and the `// @vitest-environment node` directive). Inside `loadTranslationsFrFromPath`, `readFileSync` is fetched with a synchronous CommonJS `require("node:fs")` call:

```ts
const { readFileSync } = require("node:fs");
```

`require` is not defined in an ES module context. Vitest running this file under the `node` environment will throw `ReferenceError: require is not defined`. The function receives `existsSync` via the outer scope (imported at the top of the file), so it should do the same for `readFileSync`.

**Fix:** Remove the `require` call. `readFileSync` is already imported at the top of the test file (`import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs"`). Add `readFileSync` to that import and use it directly:

```ts
// Line 13 — add readFileSync
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";

// Line 31 — remove require; function body becomes:
function loadTranslationsFrFromPath(filePath: string): TranslationsFrOverlay | null {
  if (!existsSync(filePath)) { ... return null; }
  try {
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as TranslationsFrOverlay;
  } catch (e) { ... return null; }
}
```

---

## Warnings

### WR-01: `useDatasheet` / `useDatasheetsByFaction` hooks ignore the locale store — always return English names

**File:** `src/hooks/useDatasheet.ts:33-124`

**Issue:** All four hooks in this file (`useDatasheet`, `useDatasheetsByFaction`, `useDatasheetsByFactionWithPoints`, `useWahapediaFactions`) call the locale-aware query functions (`getUdbUnitDetail`, `getUdbUnitsByFaction`, `getUdbFactions`) without passing a `locale` argument. These hooks are used in collection-side surfaces (unit detail sheets, the faction picker in collection page). When the user switches to French in the sidebar, the `useUnitDatabase.ts` hooks will correctly re-fetch translated names, but `useDatasheet.ts` hooks will continue to return English names. The cache keys also do not include locale, so these queries will never re-run on a locale switch.

**Fix:** Read `locale` from the store and include it in the query key and function call, mirroring the pattern in `useUnitDatabase.ts`:

```ts
import { useLocaleStore } from "@/stores/localeStore";

export function useDatasheet(unitId: number | undefined) {
  const locale = useLocaleStore((s) => s.locale);
  return useQuery({
    queryKey: unitId !== undefined
      ? [...DATASHEET_KEY(unitId), locale] as const
      : ["datasheet", "disabled"] as const,
    queryFn: async () => {
      // ...existing logic...
      return getUdbUnitDetail(row.udb_unit_id, locale);
    },
    enabled: unitId !== undefined,
    staleTime: Infinity,
  });
}
```

---

### WR-02: `LocaleToggle` invalidates only three query key prefixes — `useDatasheet` cache is not invalidated on locale switch

**File:** `src/components/common/LocaleToggle.tsx:16-18`

**Issue:** `handleLocaleSwitch` invalidates `["udb-factions"]`, `["udb-units"]`, and `["udb-unit-detail"]`. This covers `useUnitDatabase.ts` hooks. However, the backward-compatible hooks in `useDatasheet.ts` use different cache key prefixes: `WAHAPEDIA_FACTIONS_KEY = ["wahapedia-factions"]`, `DATASHEETS_BY_FACTION_KEY = ["datasheets-by-faction", ...]`, and `["datasheets-with-points", ...]`. Even once WR-01 is fixed and those hooks respect locale, they will never be invalidated when the user switches language.

**Fix:** Add invalidation calls for the other key families, or (better) unify the hooks so that `useDatasheet.ts` re-exports `useUnitDatabase.ts` hooks under the old names, eliminating the divergence.

```ts
function handleLocaleSwitch(next: Locale) {
  setLocale(next);
  queryClient.invalidateQueries({ queryKey: ["udb-factions"] });
  queryClient.invalidateQueries({ queryKey: ["udb-units"] });
  queryClient.invalidateQueries({ queryKey: ["udb-unit-detail"] });
  // Add missing keys:
  queryClient.invalidateQueries({ queryKey: ["wahapedia-factions"] });
  queryClient.invalidateQueries({ queryKey: ["datasheets-by-faction"] });
  queryClient.invalidateQueries({ queryKey: ["datasheets-with-points"] });
  queryClient.invalidateQueries({ queryKey: ["datasheet"] });
}
```

---

### WR-03: `getUdbUnitsByFaction` `ORDER BY` has the same column-vs-alias ambiguity as `getUdbFactions`

**File:** `src/db/queries/unitDatabase.ts:168`

**Issue:** Like CR-02, `getUdbUnitsByFaction` hardcodes `ORDER BY u.role, u.name ASC`. When `locale='fr'`, the alias `name` resolves to the French-translated name, but `u.name` in the ORDER BY resolves to the English base column. French-locale unit lists will be sorted in English order.

**Fix:**

```ts
const orderSql = locale === "fr"
  ? `ORDER BY u.role, COALESCE(u.name_fr, u.name) ASC`
  : `ORDER BY u.role, u.name ASC`;
// ...
     ${orderSql}`,
```

---

### WR-04: Weapon key collision — same unit can have multiple weapons with the same `name`, causing translation mismatches

**File:** `scripts/build-unit-db.ts:654-656` / `scripts/data/translations_fr.json:38`

**Issue:** The overlay key for weapons is `${unit_id}:${weapon_name}` (e.g., `"000000882:Guardian spear"`). A unit can have the same weapon listed multiple times in different `weapon_group` entries (e.g., profile variants for different modes). In that case, all rows with the same name get the same French translation, which is usually correct. However, two different weapons on the same unit with the same display name but different stats — a known edge case in Wahapedia data — would both receive the translation intended for one of them. There is no warning in the build output and no test for this. The current `translations_fr.json` has only three weapons entries, so the risk is low today, but it will surface at scale.

**Fix:** At minimum, document the known limitation in a comment in `build-unit-db.ts` near the weapon overlay loop. For robustness, key weapons by `${unit_id}:${weapon_group}:${name}` in both the overlay file and the build loop. This is a data model decision that is cheaper to fix before the overlay file grows.

---

### WR-05: `vi` is used but never imported in `locale-store.test.ts`

**File:** `tests/unit-database/locale-store.test.ts:13`

**Issue:** `vi.mock("zustand/middleware", ...)` is called at line 13, but `vi` is not imported from `vitest`. The other test files in this phase import `vi` explicitly (e.g., `import { describe, it, expect, vi, beforeEach } from "vitest"`). `vi` works in Vitest because it is auto-injected as a global, but CLAUDE.md notes the project uses strict TypeScript (`noUnusedLocals`, `noUnusedParameters`), and this pattern can break under `isolatedModules` or if globals are not configured.

**Fix:** Add `vi` to the import:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
```

---

## Info

### IN-01: `getUdbFactions` sorts French names alphabetically by the alias — but `name_fr` is null for most factions

**File:** `scripts/data/translations_fr.json:2-24` / `src/db/queries/unitDatabase.ts:139`

**Issue:** The current `translations_fr.json` contains only 22 faction translations out of however many factions are in the full Wahapedia dataset. `COALESCE(name_fr, name)` will fall back to English for unmatched factions. This means even after CR-02 is fixed, a French-locale faction list will have a mix of French-translated names (sorted in their French positions) and English fallback names (sorted in their English positions), with no visual distinction. This is a content gap, not a code bug, but callers should be aware.

---

### IN-02: `useWahapediaFactionId` does not pass locale to `getUdbFactions` — name matching can fail in French locale

**File:** `src/hooks/useDatasheet.ts:114-119`

**Issue:** `useWahapediaFactionId` fetches all factions with `getUdbFactions()` (no locale), then case-insensitively matches `localFactionName` against `f.name`. This works in English. If `getUdbFactions` were ever called with `locale='fr'`, the returned `name` field would be the French name, and the English `localFactionName` stored in HobbyForge (e.g., "Space Marines") would fail to match against "Space Marines" (which happens to be the same) or "Nécrons" (which does not match "Necrons"). The current code passes no locale, so this is safe — but it is fragile if WR-01 is ever addressed carelessly.

---

### IN-03: Version hash in `build-unit-db.ts` uses only row counts — content changes that preserve counts are undetected

**File:** `scripts/build-unit-db.ts:690-691`

**Issue:** The `buildVersion` hash seed is `${factions.length}-${units.length}-${weapons.length}-${points.length}-${abilities.length}-${keywords.length}`. If data content changes (e.g., a translation is updated, a unit's `damaged_desc` changes) but no rows are added or removed, the version hash is identical and the import skips re-importing the data. This is a known trade-off (documented with comment `// CR-04 fix`) but is especially relevant now that translations are embedded in the JSON — updating a translation entry will not trigger a re-import.

---

### IN-04: `UdbWeapon` and `UdbAbility` interfaces in `unitDatabase.ts` do not include `_fr` columns — TypeScript consumers get no translated fields

**File:** `src/db/queries/unitDatabase.ts:44-67`

**Issue:** `UdbWeapon` has no `name_fr` field; `UdbAbility` has no `name_fr` or `description_fr`. When `getUdbUnitDetail` is called with `locale='fr'`, the SQL aliases the translated columns as `name` and `description` (via `COALESCE`), so the value is correct at runtime. However, the TypeScript interface still names these `name: string` and `description: string | null`, so no consumer can distinguish "this is the English name" from "this is the French-translated name". If a consumer ever needs the original English name alongside the translated one (e.g., for an edit form), the interface provides no path to it. This is a future-proofing gap, not an immediate bug.

---

_Reviewed: 2026-06-01T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
