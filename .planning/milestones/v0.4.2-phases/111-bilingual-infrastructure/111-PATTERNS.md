# Phase 111: Bilingual Infrastructure - Pattern Map

**Mapped:** 2026-06-01
**Files analyzed:** 7 new/modified files
**Analogs found:** 7 / 7

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `scripts/data/translations_fr.json` | config | file-I/O | `scripts/data/aliases.json` (inferred) | role-match |
| `scripts/build-unit-db.ts` (modify) | utility | file-I/O | `scripts/lib/normalize.ts` (loadAliases) | exact |
| `src/stores/localeStore.ts` | store | event-driven | `src/features/game-day/gameDayStore.ts` | exact |
| `src/hooks/useUnitDatabase.ts` (modify) | hook | request-response | `src/hooks/useUnitDatabase.ts` itself | self-extend |
| `src/db/queries/unitDatabase.ts` (modify) | service | CRUD | `src/db/queries/unitDatabase.ts` itself | self-extend |
| `src/components/common/LocaleToggle.tsx` | component | event-driven | `src/components/common/AppSidebar.tsx` (collapse button) | role-match |
| `src-tauri/src/lib.rs` (modify FTS5 INSERT) | utility | batch | `src-tauri/src/lib.rs` (existing FTS5 block) | self-extend |

---

## Pattern Assignments

### `scripts/data/translations_fr.json` (config, file-I/O)

**Analog:** `scripts/data/aliases.json` (inferred — same data directory, same graceful-degrade pattern)

**Structure to create** (D-01):
```json
{
  "factions": {
    "SM": "Space Marines",
    "NEC": "Nécrons"
  },
  "units": {
    "unit-wahapedia-id": "Nom de l'unité en français"
  },
  "abilities": {
    "${unit_id}:${abilityName}": {
      "name_fr": "Nom de la capacité",
      "description_fr": "Description en français"
    }
  },
  "weapons": {
    "${unit_id}:${weaponName}": "Nom de l'arme en français"
  },
  "keywords": {
    "INFANTRY": "INFANTERIE"
  }
}
```

**Key design:** Abilities and weapons use composite key `"${unit_id}:${entityName}"` (name-based, not line_order, per RESEARCH pitfall 3). Start with factions and units only for initial launch.

---

### `scripts/build-unit-db.ts` — Step 10.5 overlay loading (utility, file-I/O)

**Analog:** `scripts/lib/normalize.ts` — `loadAliases()` function

**Imports pattern** (lines 24–31 of build-unit-db.ts, extend with):
```typescript
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
// Already present — no new imports needed for overlay loading
```

**Path constant pattern** (lines 55–60 of build-unit-db.ts, add after ALIASES_PATH):
```typescript
const DATA_DIR = join(REPO_ROOT, "scripts", "data");
const ALIASES_PATH = join(DATA_DIR, "aliases.json");
// ADD:
const TRANSLATIONS_FR_PATH = join(DATA_DIR, "translations_fr.json");
```

**Core overlay loading pattern** (from `scripts/lib/normalize.ts` lines 33–47):
```typescript
// loadAliases — direct reference for graceful degrade pattern:
export function loadAliases(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) {
    return {};
  }
  try {
    const raw = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
    return {};
  } catch {
    return {};
  }
}

// Clone as (add to build-unit-db.ts, inline or in lib/):
interface TranslationsFrOverlay {
  factions?: Record<string, string>;
  units?: Record<string, string>;
  abilities?: Record<string, { name_fr?: string | null; description_fr?: string | null }>;
  weapons?: Record<string, string>;
  keywords?: Record<string, string>;
}

function loadTranslationsFr(): TranslationsFrOverlay | null {
  if (!existsSync(TRANSLATIONS_FR_PATH)) {
    console.warn("WARNING: translations_fr.json not found — _fr fields will be null");
    return null;
  }
  try {
    const raw = readFileSync(TRANSLATIONS_FR_PATH, "utf-8");
    return JSON.parse(raw) as TranslationsFrOverlay;
  } catch (e) {
    console.warn("WARNING: Failed to parse translations_fr.json:", e);
    return null;
  }
}
```

**Overlay application pattern** (apply AFTER all entity arrays are finalized — last step before writeFileSync):
```typescript
// Step 10.5 — Apply French overlay (after all mutations: points backfill,
// sub_faction assignment, empty faction pruning — before JSON output)
const overlay = loadTranslationsFr();
if (overlay) {
  for (const f of factions) {
    if (overlay.factions?.[f.id]) f.name_fr = overlay.factions[f.id];
  }
  for (const u of units) {
    if (overlay.units?.[u.id]) u.name_fr = overlay.units[u.id];
  }
  for (const a of abilities) {
    const key = `${a.unit_id}:${a.name}`;
    const t = overlay.abilities?.[key];
    if (t) {
      a.name_fr = t.name_fr ?? null;
      a.description_fr = t.description_fr ?? null;
    }
  }
  for (const w of weapons) {
    const key = `${w.unit_id}:${w.name}`;
    if (overlay.weapons?.[key]) w.name_fr = overlay.weapons[key];
  }
  for (const k of keywords) {
    if (overlay.keywords?.[k.keyword]) k.keyword_fr = overlay.keywords[k.keyword];
  }
}
```

**TypeScript fields already present** (from `scripts/lib/types.ts`):
- `UdbFactionRow.name_fr: string | null` (line 38)
- `UdbUnitRow.name_fr: string | null` (line 50)
- `UdbUnitWeaponRow.name_fr: string | null` (line 79)
- `UdbUnitAbilityRow.name_fr: string | null`, `.description_fr: string | null` (lines 88–89)
- `UdbUnitKeywordRow.keyword_fr: string | null` (line 96)

No type changes needed. All `_fr` fields already exist as nullable.

---

### `src/stores/localeStore.ts` (store, event-driven)

**Analog:** `src/features/game-day/gameDayStore.ts` — direct clone target

**Core pattern** (gameDayStore.ts lines 64–148, distill to minimal form):
```typescript
// FROM gameDayStore.ts:
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useGameDayStore = create<GameDayStore>()(
  persist(
    (set) => ({
      listStates: {},
      // actions...
    }),
    { name: "game-day-state" },   // <-- localStorage key
  ),
);
```

**New file pattern** (clone and simplify):
```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Locale = 'en' | 'fr';

interface LocaleStore {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleStore>()(
  persist(
    (set) => ({
      locale: 'en',
      setLocale: (locale) => set({ locale }),
    }),
    { name: "app:locale" },       // <-- localStorage key per D-05
  ),
);
```

**File location:** `src/stores/localeStore.ts` (new `stores/` directory, per RESEARCH architecture map). If the planner prefers to co-locate with sidebar utilities, `src/components/common/localeStore.ts` is also acceptable — use whichever is consistent.

**No SSR risk:** Tauri desktop; `window.localStorage` always available. Zustand `persist` handles hydration automatically.

---

### `src/hooks/useUnitDatabase.ts` — locale-keyed hooks (hook, request-response)

**Analog:** `src/hooks/useUnitDatabase.ts` itself — self-extend existing pattern

**Current key factory pattern** (lines 25–31):
```typescript
export const UDB_FACTIONS_KEY = ["udb-factions"] as const;
export const UDB_UNITS_KEY = (factionId: string) =>
  ["udb-units", factionId] as const;
export const UDB_UNIT_DETAIL_KEY = (unitId: string) =>
  ["udb-unit-detail", unitId] as const;
export const UDB_SEARCH_KEY = (query: string) =>
  ["udb-search", query] as const;
```

**Extended key factory pattern** (add locale as parameter):
```typescript
// Import locale type + store at top of file:
import { useLocaleStore } from "@/stores/localeStore";
import type { Locale } from "@/stores/localeStore";

// Key factories updated to include locale:
export const UDB_FACTIONS_KEY = (locale: Locale) =>
  ["udb-factions", locale] as const;
export const UDB_UNITS_KEY = (factionId: string, locale: Locale) =>
  ["udb-units", factionId, locale] as const;
export const UDB_UNIT_DETAIL_KEY = (unitId: string, locale: Locale) =>
  ["udb-unit-detail", unitId, locale] as const;
export const UDB_SEARCH_KEY = (query: string) =>
  ["udb-search", query] as const;  // search is FTS5 — bilingual by index, no locale key needed
```

**Current hook pattern** (lines 36–42):
```typescript
export function useUdbFactions() {
  return useQuery({
    queryKey: UDB_FACTIONS_KEY,
    queryFn: getUdbFactions,
    staleTime: Infinity,
  });
}
```

**Extended hook pattern** (add locale from store):
```typescript
export function useUdbFactions() {
  const locale = useLocaleStore((s) => s.locale);
  return useQuery({
    queryKey: UDB_FACTIONS_KEY(locale),
    queryFn: () => getUdbFactions(locale),
    staleTime: Infinity,
  });
}

export function useUdbUnits(factionId: string | null) {
  const locale = useLocaleStore((s) => s.locale);
  return useQuery({
    queryKey:
      factionId !== null
        ? UDB_UNITS_KEY(factionId, locale)
        : (["udb-units", "disabled"] as const),
    queryFn: () =>
      factionId !== null ? getUdbUnitsByFaction(factionId, locale) : Promise.resolve([]),
    enabled: !!factionId,
    staleTime: Infinity,
  });
}

export function useUdbUnitDetail(unitId: string | null) {
  const locale = useLocaleStore((s) => s.locale);
  return useQuery({
    queryKey:
      unitId !== null
        ? UDB_UNIT_DETAIL_KEY(unitId, locale)
        : (["udb-unit-detail", "disabled"] as const),
    queryFn: () =>
      unitId !== null ? getUdbUnitDetail(unitId, locale) : Promise.resolve(null),
    enabled: !!unitId,
    staleTime: Infinity,
  });
}
// useUdbSearch — no locale param (FTS5 bilingual by index; name result is English)
// useUdbKeywords — no locale param (filter logic, not display names)
// useUdbOwnership / useUdbUnitOwnership — no locale param (counts only)
```

**Do NOT add locale to:** `useUdbKeywords`, `useUdbOwnership`, `useUdbUnitOwnership` — per RESEARCH "Anti-Patterns" and D-03 scope.

---

### `src/db/queries/unitDatabase.ts` — locale-aware queries (service, CRUD)

**Analog:** `src/db/queries/unitDatabase.ts` itself — self-extend existing SELECT pattern

**Current pattern** (lines 135–139):
```typescript
export async function getUdbFactions(): Promise<UdbFaction[]> {
  const db = await getDb();
  return db.select<UdbFaction[]>(
    "SELECT id, name, short_name FROM udb_factions ORDER BY name ASC",
  );
}
```

**Extended pattern — getUdbFactions with locale:**
```typescript
export async function getUdbFactions(locale?: 'en' | 'fr'): Promise<UdbFaction[]> {
  const db = await getDb();
  const nameSql = locale === 'fr'
    ? 'COALESCE(name_fr, name) AS name'
    : 'name';
  return db.select<UdbFaction[]>(
    `SELECT id, ${nameSql}, short_name FROM udb_factions ORDER BY name ASC`,
  );
}
```

**Current pattern — getUdbUnitsByFaction** (lines 146–163):
```typescript
export async function getUdbUnitsByFaction(
  factionId: string,
): Promise<UdbUnitSummary[]> {
  const db = await getDb();
  return db.select<UdbUnitSummary[]>(
    `SELECT
       u.id,
       u.faction_id,
       u.name,
       ...
     FROM udb_units u
     WHERE u.faction_id = $1
     ORDER BY u.role, u.name ASC`,
    [factionId],
  );
}
```

**Extended pattern — locale-aware name SELECT:**
```typescript
export async function getUdbUnitsByFaction(
  factionId: string,
  locale?: 'en' | 'fr',
): Promise<UdbUnitSummary[]> {
  const db = await getDb();
  const nameSql = locale === 'fr' ? 'COALESCE(u.name_fr, u.name)' : 'u.name';
  return db.select<UdbUnitSummary[]>(
    `SELECT
       u.id,
       u.faction_id,
       ${nameSql} AS name,
       u.role,
       (SELECT MIN(p.points) FROM udb_unit_points p WHERE p.unit_id = u.id) AS base_points,
       (SELECT MIN(c.min_models) FROM udb_unit_composition c WHERE c.unit_id = u.id) AS min_models,
       (SELECT MAX(c.max_models) FROM udb_unit_composition c WHERE c.unit_id = u.id) AS max_models
     FROM udb_units u
     WHERE u.faction_id = $1
     ORDER BY u.role, u.name ASC`,
    [factionId],
  );
}
```

**Extended pattern — getUdbUnitDetail with locale** (lines 170–228):
For `getUdbUnitDetail`, three sub-queries need COALESCE:
1. Main unit name: `COALESCE(name_fr, name) AS name`
2. Abilities: `COALESCE(name_fr, name) AS name`, `COALESCE(description_fr, description) AS description`
3. Weapons: `COALESCE(name_fr, name) AS name`
Keywords and points queries: no COALESCE (not display text).

```typescript
export async function getUdbUnitDetail(
  unitId: string,
  locale?: 'en' | 'fr',
): Promise<UdbUnitDetail | null> {
  const db = await getDb();
  const fr = locale === 'fr';
  const unitNameSql = fr ? 'COALESCE(name_fr, name) AS name' : 'name';
  const abilityNameSql = fr ? 'COALESCE(name_fr, name) AS name, COALESCE(description_fr, description) AS description' : 'name, description';
  const weaponNameSql = fr ? 'COALESCE(name_fr, name) AS name' : 'name';

  const unitRows = await db.select<...>(
    `SELECT id, faction_id, ${unitNameSql}, role, base_points, damaged_w, damaged_desc FROM udb_units WHERE id = $1`,
    [unitId],
  );
  // ... abilities query: SELECT id, unit_id, line_order, ${abilityNameSql}, ability_type FROM udb_unit_abilities WHERE unit_id = $1 ORDER BY line_order
  // ... weapons query: SELECT id, unit_id, weapon_group, line_order, ${weaponNameSql}, category, range, ... FROM udb_unit_weapons WHERE unit_id = $1 ORDER BY weapon_group, line_order
  // models, keywords, points, composition: unchanged (no _fr fields used for display)
}
```

**COALESCE reference** (from lib.rs lines 732–733 — existing project pattern):
```sql
COALESCE(u.sub_faction || ' ', '') || COALESCE(GROUP_CONCAT(k.keyword, ' '), '')
```
Same COALESCE idiom, applied to display columns.

**TypeScript guard:** The `locale` parameter is `'en' | 'fr'` union — only two values possible. No user input reaches the SQL string. Conditional template literal `${nameSql}` is safe.

**Functions that do NOT get locale parameter:**
- `getUdbOwnershipForUnit` — count/status only (lines 230–243)
- `getUdbOwnershipByFaction` — count/status only (lines 255–269)
- `getUdbKeywordsByFaction` — filter logic keyword strings (lines 272–289)
- `searchUdbUnits` — FTS5 query, result `name` stays as English (lines 296–318)

---

### `src/components/common/LocaleToggle.tsx` (component, event-driven)

**Analog:** `src/components/common/AppSidebar.tsx` — collapse button pattern (lines 221–236)

**Collapse button reference** (lines 221–236 of AppSidebar.tsx):
```tsx
{/* Collapse toggle (above Settings, per UI-SPEC §4) */}
<div className="px-2 pb-1">
  <Button
    variant="ghost"
    size="icon"
    className={collapsed ? "mx-auto" : "w-full"}
    onClick={() => setCollapsed(!collapsed)}
    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
  >
    {collapsed ? (
      <ChevronsRight className="h-4 w-4" />
    ) : (
      <ChevronsLeft className="h-4 w-4" />
    )}
  </Button>
</div>
```

**Imports pattern** (from AppSidebar.tsx lines 1–3):
```tsx
import { Button } from "@/components/ui/button";
// Lucide icons as needed
import { useQueryClient } from "@tanstack/react-query";
import { useLocaleStore } from "@/stores/localeStore";
import type { Locale } from "@/stores/localeStore";
```

**Core component pattern** (EN/FR pill toggle, per D-05/D-07):
```tsx
export function LocaleToggle({ collapsed }: { collapsed: boolean }) {
  const { locale, setLocale } = useLocaleStore();
  const queryClient = useQueryClient();

  function handleLocaleSwitch(next: Locale) {
    setLocale(next);
    // staleTime: Infinity + locale in key: new locale key fetches fresh.
    // Invalidate old locale entries to prevent unbounded cache growth (D-06):
    queryClient.invalidateQueries({ queryKey: ["udb-factions"] });
    queryClient.invalidateQueries({ queryKey: ["udb-units"] });
    queryClient.invalidateQueries({ queryKey: ["udb-unit-detail"] });
  }

  if (collapsed) {
    // Icon-only mode — show current locale initials or globe icon
    return (
      <div className="px-2 pb-1 flex justify-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleLocaleSwitch(locale === 'en' ? 'fr' : 'en')}
          aria-label={`Switch to ${locale === 'en' ? 'French' : 'English'}`}
        >
          <span className="text-xs font-semibold">{locale.toUpperCase()}</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="px-2 pb-1">
      <div className="flex rounded-md border border-border overflow-hidden">
        <Button
          variant={locale === 'en' ? 'secondary' : 'ghost'}
          size="sm"
          className="flex-1 rounded-none h-7 text-xs"
          onClick={() => handleLocaleSwitch('en')}
        >
          EN
        </Button>
        <Button
          variant={locale === 'fr' ? 'secondary' : 'ghost'}
          size="sm"
          className="flex-1 rounded-none h-7 text-xs"
          onClick={() => handleLocaleSwitch('fr')}
        >
          FR
        </Button>
      </div>
    </div>
  );
}
```

**Insertion point in AppSidebar.tsx** (between lines 221 and 236 — as sibling div ABOVE collapse toggle):
```tsx
{/* Locale toggle (above collapse toggle, per UI-SPEC) */}
<LocaleToggle collapsed={collapsed} />

{/* Collapse toggle (above Settings, per UI-SPEC §4) */}
<div className="px-2 pb-1">
  ...
</div>
```

---

### `src-tauri/src/lib.rs` — FTS5 bilingual INSERT (utility, batch)

**Analog:** `src-tauri/src/lib.rs` itself — self-extend existing FTS5 block

**Current FTS5 INSERT** (lines 730–741):
```rust
sqlx::query(
    "INSERT INTO udb_search(unit_id, name, faction_name, keywords) \
     SELECT u.id, u.name, f.name, \
            COALESCE(u.sub_faction || ' ', '') || COALESCE(GROUP_CONCAT(k.keyword, ' '), '') \
     FROM udb_units u \
     JOIN udb_factions f ON f.id = u.faction_id \
     LEFT JOIN udb_unit_keywords k ON k.unit_id = u.id \
     GROUP BY u.id",
)
```

**Extended pattern** (per D-08, RESEARCH Pitfall 2 fix — French names go in `keywords` column, NOT `name`, to keep result display clean):
```rust
sqlx::query(
    "INSERT INTO udb_search(unit_id, name, faction_name, keywords) \
     SELECT u.id, u.name, f.name, \
            COALESCE(u.name_fr || ' ', '') || COALESCE(f.name_fr || ' ', '') || \
            COALESCE(u.sub_faction || ' ', '') || COALESCE(GROUP_CONCAT(k.keyword, ' '), '') \
     FROM udb_units u \
     JOIN udb_factions f ON f.id = u.faction_id \
     LEFT JOIN udb_unit_keywords k ON k.unit_id = u.id \
     GROUP BY u.id",
)
```

**Why `keywords` column, not `name`:** FTS5 `name` column is displayed in `UdbSearchResult.name`. Concatenating French names there produces "Ultramarines Space Marines" in the result list. French names in the `keywords` column are FTS5-indexed (searchable) but not displayed. Per RESEARCH pitfall 2 recommendation.

**FTS5 virtual table DDL** (from migration 038): `(unit_id UNINDEXED, name, faction_name, keywords)` — all three non-UNINDEXED columns are indexed by FTS5. French text in `keywords` is fully searchable.

**Cannot ALTER FTS5 tables** (confirmed by migration 041 comment) — content changes ONLY via the import transaction DROP + re-INSERT. No schema migration needed.

---

## Shared Patterns

### Zustand Persist Store
**Source:** `src/features/game-day/gameDayStore.ts` lines 64–148
**Apply to:** `src/stores/localeStore.ts`
```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useXxxStore = create<XxxStore>()(
  persist(
    (set) => ({ /* initial state + actions */ }),
    { name: "storage-key-name" },
  ),
);
```

### React Query Key Factory with Variable Parameter
**Source:** `src/hooks/useUnitDatabase.ts` lines 26–31
**Apply to:** Updated key factories in `useUnitDatabase.ts`
```typescript
export const UDB_UNITS_KEY = (factionId: string) =>
  ["udb-units", factionId] as const;
// Extend: add locale as second parameter
export const UDB_UNITS_KEY = (factionId: string, locale: Locale) =>
  ["udb-units", factionId, locale] as const;
```

### Graceful File Load with Degrade
**Source:** `scripts/lib/normalize.ts` lines 33–47
**Apply to:** `loadTranslationsFr()` in `build-unit-db.ts`
```typescript
if (!existsSync(path)) return {};
try {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
} catch {
  return {};
}
```

### COALESCE Bilingual Fallback in SQL
**Source:** `src-tauri/src/lib.rs` lines 732–733 (existing COALESCE in FTS5 INSERT)
**Apply to:** `getUdbFactions`, `getUdbUnitsByFaction`, `getUdbUnitDetail` in `unitDatabase.ts`
```sql
COALESCE(name_fr, name) AS name
COALESCE(description_fr, description) AS description
```

### Query Invalidation on State Change
**Source:** React Query standard — consistent with all mutation hooks in the codebase
**Apply to:** `LocaleToggle.tsx` `handleLocaleSwitch`
```typescript
queryClient.invalidateQueries({ queryKey: ["udb-factions"] });
queryClient.invalidateQueries({ queryKey: ["udb-units"] });
queryClient.invalidateQueries({ queryKey: ["udb-unit-detail"] });
```
Note: prefix-only invalidation (no locale in the key passed to `invalidateQueries`) clears ALL locale variants at once.

---

## No Analog Found

All files have codebase analogs. No entries in this section.

---

## Test Files (new — Wave 0 gaps per RESEARCH)

| New Test File | Analog | Tests |
|---------------|--------|-------|
| `tests/unit-database/localeStore.test.ts` | `tests/` any store test | FR-04: Zustand store init, persist, setLocale |
| `tests/unit-database/localeQueries.test.ts` | Any `tests/` query test with mocked DB | FR-03: SQL string construction per locale |
| `tests/unit-database/LocaleToggle.test.tsx` | Any `tests/` component test | FR-04: toggle renders, click calls setLocale + invalidateQueries |
| `tests/unit-database/translationsOverlay.test.ts` | Any `tests/` utility test | FR-02: loadTranslationsFr + apply logic with mock overlay |

**Test analog:** Check existing tests in `tests/` for mock patterns (Tauri APIs must be mocked; React Query hooks mocked with `vi.mock`).

---

## Metadata

**Analog search scope:** `src/`, `scripts/`, `src-tauri/src/`
**Files scanned:** 10 source files read directly
**Pattern extraction date:** 2026-06-01
