# Phase 111: Bilingual Infrastructure — Research

**Researched:** 2026-06-01
**Domain:** Build-script overlay loading, Zustand persist store, React Query locale-keyed caching, FTS5 bilingual indexing
**Confidence:** HIGH — all findings verified against project source code; no external library research required

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `scripts/data/translations_fr.json` structured as `{ factions: { id: name_fr }, units: { id: name_fr }, abilities: { id: { name_fr, description_fr } }, weapons: { id: name_fr }, keywords: { keyword: keyword_fr } }`.
- **D-02:** Build script loads `translations_fr.json` after parsing all English data and populates `_fr` fields per entity; missing translations stay null.
- **D-03:** Explicit `locale?: 'en' | 'fr'` parameter on query functions returning canonical data; when `'fr'`, SELECT uses `COALESCE(col_fr, col) AS col`; when `'en'` or omitted, plain English column.
- **D-04:** React Query hooks pass locale from a Zustand store; locale is part of the query key so React Query auto-refetches on locale change.
- **D-05:** Small EN/FR toggle in the sidebar footer area (near the collapse toggle). Zustand `persist` store with localStorage backend.
- **D-06:** Switching locale invalidates all `udb_*` React Query keys.
- **D-07:** Locale type is `'en' | 'fr'` — simple union, not an extensible i18n system.
- **D-08:** Single FTS5 `udb_search` table with French names concatenated into searchable content. One index covers both languages.
- **D-09:** FTS5 rebuild happens inside existing import transaction (DELETE + INSERT populate), extended to include `_fr` fields. No new migration needed.

### Claude's Discretion

- Build script internal structure for loading and applying the overlay
- Exact Zustand store implementation (naming, file location)
- Which query functions need locale parameter vs. which can skip it
- React Query key structure for locale-aware caching
- Toggle component styling (button group vs. pill vs. ghost buttons)
- Error handling when translations_fr.json is missing or malformed

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FR-02 | Build script loads French translations from `scripts/data/translations_fr.json` overlay and populates `_fr` columns | Build script structure fully understood; overlay loading is a new Step 10.5 after CSVs are parsed and before JSON output is written |
| FR-03 | Query layer accepts optional `locale` parameter, uses `COALESCE(col_fr, col)` for bilingual fallback | `unitDatabase.ts` has 10+ query functions; 4 return displayable text (factions, units-by-faction, unit-detail, search); points/ownership/keywords-map queries need no change |
| FR-04 | App shows EN/FR locale toggle (persisted to localStorage), switching all canonical data display language | `AppSidebar.tsx` footer area identified; Zustand persist pattern from `gameDayStore.ts` is the direct clone target; UI-SPEC has full interaction contract |
| FR-05 | FTS5 search index includes French names for bilingual search | FTS5 `udb_search` rebuild is in `import_unit_database_inner()` in `lib.rs` at line 725–741; must extend the INSERT SELECT to concatenate `name_fr` into the `name` or `keywords` column |
</phase_requirements>

---

## Summary

Phase 111 is a pure infrastructure threading phase. The schema foundation (FR-01, FR-06) shipped in Phase 108: all `_fr` columns exist in SQLite, and the Rust import already passes them through `#[serde(default)]`. This phase populates those null fields from a manually curated overlay file, adds locale awareness to the query layer and React Query hooks, adds a sidebar toggle, and extends the FTS5 rebuild to cover French names.

No new migrations are needed — the `_fr` columns are in place via migration 041. No new Rust code is needed beyond the FTS5 rebuild SQL change. The heaviest work is the build script overlay loader (TypeScript) and the query layer locale threading (SQL + TypeScript).

The COALESCE pattern, Zustand persist stores, React Query key parameterization, and FTS5 concatenation patterns are all already present in the codebase. This phase applies them to a new axis (locale) rather than inventing new techniques.

**Primary recommendation:** Build in three logical waves: (1) build script overlay + translations_fr.json stub, (2) query layer + hook locale threading + Zustand store, (3) sidebar toggle + FTS5 rebuild extension + integration smoke test.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| translations_fr.json overlay loading | Build pipeline (dev-side script) | — | Runs at `pnpm build:udb`; outputs unit_database.json with `_fr` fields populated |
| `_fr` field storage in SQLite | Database / Storage | — | Already exists via migration 041; Rust import already writes them |
| COALESCE locale resolution | Database / Storage | API (query layer) | SQL handles the COALESCE; TypeScript query functions pass locale param |
| Locale state persistence | Frontend (localStorage) | Zustand store | Same pattern as sidebar collapse and Game Day store |
| React Query cache keying | API (hook layer) | — | Locale must be part of query key arrays so RQ re-fetches on change |
| FTS5 bilingual indexing | Database / Storage | Rust import transaction | FTS5 rebuild INSERT SELECT extended in `import_unit_database_inner()` |
| Locale toggle UI | Browser / Client | Sidebar component | LocaleToggle in AppSidebar footer area; collapses to icon in narrow mode |

---

## Standard Stack

No new packages required. Everything in this phase uses existing dependencies.

### Core (existing)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | Already installed | Locale persist store | Matches `gameDayStore.ts` and project conventions |
| @tanstack/react-query | Already installed | Locale-keyed query caching | React Query key arrays already parameterized per entity |
| shadcn/ui Button + Tooltip | Already installed | Toggle segments + collapsed tooltip | Already imported in `AppSidebar.tsx` |
| node:fs (readFileSync) | Node built-in | Load translations_fr.json in build script | Same pattern as `loadAliases()` for aliases.json |

### Package Legitimacy Audit

No new packages are installed in this phase. All work uses existing project dependencies.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| *(no new packages)* | — | — | — | — | — | N/A |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
[translations_fr.json]  ←— manual curation
        ↓
[build-unit-db.ts] — Step 10.5: load overlay, populate _fr fields
        ↓
[unit_database.json] — _fr fields populated or null
        ↓
[Rust import_unit_database_inner()] — passes _fr through to udb_* tables
        ↓                                ↓
[udb_factions.name_fr]          [udb_search] — FTS5 rebuilt with name_fr concat
[udb_units.name_fr]
[udb_unit_abilities.name_fr / description_fr]
[udb_unit_weapons.name_fr]
[udb_unit_keywords.keyword_fr]
        ↓
[unitDatabase.ts queries] — COALESCE(name_fr, name) AS name when locale='fr'
        ↓
[useLocaleStore] — Zustand persist, localStorage key "app:locale"
        ↓
[useUnitDatabase.ts hooks] — locale in query key → RQ auto-refetches on switch
        ↓
[AppSidebar / LocaleToggle] — setLocale() + invalidateQueries(["udb-*"])
        ↓
[DatabaseBrowser / PlaybookTab / Game Day] — pick up French names automatically
```

### Recommended Project Structure (additions only)

```
scripts/
  data/
    translations_fr.json       # NEW — manually curated FR overlay
src/
  stores/
    localeStore.ts             # NEW — Zustand persist store for locale
  components/
    common/
      LocaleToggle.tsx         # NEW — EN/FR pill toggle for sidebar
```

### Pattern 1: Overlay Loading in Build Script

The `aliases.json` pattern (`loadAliases()` in `scripts/lib/normalize.ts`) is the direct reference.

**What:** After all English data is parsed and assembled (Step 10 currently), add Step 10.5 that reads `translations_fr.json` and mutates `_fr` fields on the already-assembled arrays.

**When to use:** Any entity array where `_fr` fields are currently null (factions, units, weapons, abilities, keywords).

```typescript
// Source: scripts/lib/normalize.ts loadAliases() — same graceful-degrade pattern
// Path constant (add near ALIASES_PATH at top of build-unit-db.ts):
const TRANSLATIONS_FR_PATH = join(DATA_DIR, "translations_fr.json");

// Step 10.5 — Load French overlay (graceful degrade if missing)
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

// Apply overlay after all entity arrays are built:
const overlay = loadTranslationsFr();
if (overlay) {
  for (const f of factions) {
    if (overlay.factions?.[f.id]) f.name_fr = overlay.factions[f.id];
  }
  for (const u of units) {
    if (overlay.units?.[u.id]) u.name_fr = overlay.units[u.id];
  }
  for (const a of abilities) {
    const t = overlay.abilities?.[a.unit_id + ":" + a.name];  // OR by line_order key
    if (t) { a.name_fr = t.name_fr ?? null; a.description_fr = t.description_fr ?? null; }
  }
  for (const w of weapons) {
    if (overlay.weapons?.[w.unit_id + ":" + w.name]) w.name_fr = overlay.weapons[...];
  }
  for (const k of keywords) {
    if (overlay.keywords?.[k.keyword]) k.keyword_fr = overlay.keywords[k.keyword];
  }
}
```

**Key design note on ability/weapon keys:** Since abilities and weapons don't have standalone string IDs (they're identified by `unit_id + line_order`), the overlay structure per D-01 uses `id` — which for abilities means the `unit_id` as the top-level key and `name` as the inner key (since `line_order` is fragile). The planner should confirm the exact key structure for abilities/weapons. Faction names and unit names are simpler: the overlay uses Wahapedia string IDs directly.

### Pattern 2: COALESCE Query Layer

**What:** Add `locale?: 'en' | 'fr'` parameter to query functions that return displayable text. Use conditional SQL string construction.

**When to use:** Only on functions that return columns with `_fr` counterparts. Points, ownership, keywords-map do NOT need locale.

```typescript
// Source: confirmed from unitDatabase.ts — existing SELECT pattern
// getUdbFactions with locale:
export async function getUdbFactions(locale?: 'en' | 'fr'): Promise<UdbFaction[]> {
  const db = await getDb();
  const nameSql = locale === 'fr'
    ? 'COALESCE(name_fr, name) AS name'
    : 'name';
  return db.select<UdbFaction[]>(
    `SELECT id, ${nameSql}, short_name FROM udb_factions ORDER BY name ASC`,
  );
}

// getUdbUnitsByFaction with locale:
export async function getUdbUnitsByFaction(
  factionId: string,
  locale?: 'en' | 'fr',
): Promise<UdbUnitSummary[]> {
  const db = await getDb();
  const nameSql = locale === 'fr' ? 'COALESCE(u.name_fr, u.name)' : 'u.name';
  return db.select<UdbUnitSummary[]>(
    `SELECT u.id, u.faction_id, ${nameSql} AS name, u.role, ... FROM udb_units u ...`,
    [factionId],
  );
}
```

**Functions that need locale parameter** (verified from `unitDatabase.ts`):
1. `getUdbFactions` — `name` on factions
2. `getUdbUnitsByFaction` — `name` on units
3. `getUdbUnitDetail` — `name` on unit; `name_fr`/`description_fr` on abilities; `name_fr` on weapons; `keyword_fr` on keywords
4. `searchUdbUnits` — search already bilingual (FTS5); result `name` column should also COALESCE

**Functions that do NOT need locale** (verified):
- `getUdbOwnershipForUnit` / `getUdbOwnershipByFaction` — returns counts/statuses only
- `getUdbKeywordsByFaction` — returns keyword strings for filter logic (not display names)
- All points queries — numeric data only

**TypeScript interfaces** that need `_fr` fields added (for locale='fr' return path):
- `UdbFaction` — no change needed; `name` field is already `string` and COALESCE returns string
- `UdbUnitDetail.abilities` — `description` already `string | null`; COALESCE returns string, so safe
- No interface changes required — COALESCE produces the same shape, just different content

### Pattern 3: Zustand Persist Locale Store

**What:** A minimal persist store following `gameDayStore.ts` exactly.

**File:** `src/stores/localeStore.ts`

```typescript
// Source: src/features/game-day/gameDayStore.ts + src/components/common/useSidebarCollapsed.ts
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
    { name: "app:locale" },
  ),
);
```

**No SSR risk:** Tauri runs in a desktop Electron-like environment; `window.localStorage` is always available. The `persist` middleware handles hydration automatically.

### Pattern 4: React Query Locale-Keyed Hooks

**What:** Add locale from `useLocaleStore` to query key arrays and pass it to query functions.

```typescript
// Source: useUnitDatabase.ts — existing key factory pattern
export const UDB_FACTIONS_KEY = (locale: Locale) =>
  ["udb-factions", locale] as const;

export function useUdbFactions() {
  const locale = useLocaleStore((s) => s.locale);
  return useQuery({
    queryKey: UDB_FACTIONS_KEY(locale),
    queryFn: () => getUdbFactions(locale),
    staleTime: Infinity,
  });
}
```

**Key invalidation on locale switch** (in `LocaleToggle`):
```typescript
// Source: React Query docs pattern — consistent with existing invalidation patterns
const queryClient = useQueryClient();
const { setLocale } = useLocaleStore();

function handleLocaleSwitch(next: Locale) {
  setLocale(next);
  // Keys change automatically — RQ will refetch because key differs.
  // Explicit invalidation is NOT needed since locale IS in the key.
  // BUT the staleTime is Infinity, so invalidation IS needed to force refetch:
  queryClient.invalidateQueries({ queryKey: ["udb-factions"] });
  queryClient.invalidateQueries({ queryKey: ["udb-units"] });
  queryClient.invalidateQueries({ queryKey: ["udb-unit-detail"] });
  queryClient.invalidateQueries({ queryKey: ["udb-search"] });
  queryClient.invalidateQueries({ queryKey: ["udb-keywords"] });
}
```

**Critical insight on staleTime: Infinity + locale keys:** When staleTime is Infinity, React Query will serve the cached value for the OLD locale key even if the new locale key is freshly created (because the old key is still "fresh"). Changing the key to include locale means the new locale hits an empty cache — it WILL fetch. However, invalidating the old locale entries too ensures they don't accumulate indefinitely. The simplest approach: include locale in the key (forces fresh fetch for new locale) AND invalidate old `udb_*` keys on switch (per D-06). Both together means the switch is clean.

### Pattern 5: FTS5 Rebuild Extension

**What:** Extend the `INSERT INTO udb_search` statement in `lib.rs` to include French names in the concatenated content.

**Current code** (lib.rs lines 730–741):
```sql
INSERT INTO udb_search(unit_id, name, faction_name, keywords)
SELECT u.id, u.name, f.name,
       COALESCE(u.sub_faction || ' ', '') || COALESCE(GROUP_CONCAT(k.keyword, ' '), '')
FROM udb_units u
JOIN udb_factions f ON f.id = u.faction_id
LEFT JOIN udb_unit_keywords k ON k.unit_id = u.id
GROUP BY u.id
```

**Extended version** (per D-08):
```sql
INSERT INTO udb_search(unit_id, name, faction_name, keywords)
SELECT u.id,
       COALESCE(u.name_fr || ' ', '') || u.name,
       COALESCE(f.name_fr || ' ', '') || f.name,
       COALESCE(u.sub_faction || ' ', '') || COALESCE(GROUP_CONCAT(k.keyword, ' '), '')
FROM udb_units u
JOIN udb_factions f ON f.id = u.faction_id
LEFT JOIN udb_unit_keywords k ON k.unit_id = u.id
GROUP BY u.id
```

**Why this approach:**
- `udb_search` schema is `(unit_id UNINDEXED, name, faction_name, keywords)` — per migration 038
- The `name` column is FTS5-indexed; prepending `name_fr` there means both French and English unit names are searchable
- `faction_name` is also indexed; prepending French faction name means faction-filtered searches work bilingually
- Keyword translations are lower-priority and not in the overlay for the initial launch — `keywords` column unchanged for now (can add `keyword_fr` concatenation later)
- No schema change to FTS5 table needed — content change only

**Search result `name` field:** The `UdbSearchResult.name` field currently returns the FTS5 stored `name` value. After this change, `name` will contain both French and English names concatenated. This is fine for search matching but may look odd in result display. Consider whether the display layer should query the canonical table for the display name, or accept the concatenated value. **This is a planner decision** — the simplest option is to accept the raw value (search is infrastructure, display correctness is secondary to matching).

**Alternative (simpler):** Store only the English name in `name` and only the French name in `keywords` column alongside English keywords. This keeps result display clean. Recommended.

### Anti-Patterns to Avoid

- **Don't add locale to ownership/points hooks:** Points and ownership data are not translated. Adding locale would create spurious cache splits.
- **Don't use a React Context for locale:** Zustand persist is the correct choice per D-05; React Context doesn't persist across sessions.
- **Don't skip the staleTime: Infinity + key change interaction:** With Infinity staleTime, the new locale key fetches fresh data. Old locale key data stays in cache (harmless but wastes memory). Explicit `invalidateQueries` on the old locale prefix keeps cache clean.
- **Don't change the FTS5 virtual table DDL in a migration:** FTS5 tables cannot be ALTERed. Content changes go through the import transaction (DROP content + re-INSERT). Confirmed by migration 041 comment: "NOTE: udb_search (FTS5) cannot be ALTERed".
- **Don't use ability `line_order` as the overlay key:** `line_order` values are fragile (Wahapedia CSV order). The overlay should key abilities by `unit_id` + `name` (ability name is stable). Edge case: duplicate ability names on same unit — unlikely but note for planner.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Locale persistence across sessions | Custom localStorage serializer | Zustand `persist` middleware | Already used in `gameDayStore.ts`; handles hydration, SSR guards, serialization |
| Query cache invalidation on locale switch | Manual cache clearing | `queryClient.invalidateQueries` with prefix key | Standard RQ invalidation; prefix matching clears all `udb-*` keys at once |
| Bilingual text fallback at display time | Conditional rendering in components | COALESCE in SQL | DB handles null fallback; components receive the resolved string; no per-component FR/EN branching |
| FTS5 bilingual indexing | Separate French FTS5 table | Concatenate `name_fr` into existing columns | Single table covers both languages; simpler query |
| i18n framework | `react-intl`, `i18next`, etc. | None — `'en' | 'fr'` Zustand store | Two locales only; full i18n framework is over-engineering per D-07 and REQUIREMENTS.md out-of-scope |

**Key insight:** The COALESCE strategy means zero bilingual logic leaks into UI components. A component reads `unit.name` and renders it — whether that's English or French is resolved entirely at the SQL layer. This is the correct tier assignment and keeps components language-agnostic.

---

## Common Pitfalls

### Pitfall 1: React Query Infinity + locale in key (stale data on switch)

**What goes wrong:** If you include locale in the query key but forget to invalidate the old locale's cached results, the cache grows with two sets of UDB data (one per locale). More critically, if the locale is NOT in the key, RQ serves stale English data when the user switches to French.

**Why it happens:** staleTime: Infinity means RQ never re-fetches on its own. Locale must be in the key to trigger re-fetch for the new locale.

**How to avoid:** Include locale in all UDB query key arrays. On locale switch, call `invalidateQueries` with the base prefix (not locale-specific) to clean up old entries.

**Warning signs:** Switching to FR shows English names; switching back to EN shows French names (keys not updating).

### Pitfall 2: FTS5 search result `name` column content

**What goes wrong:** After extending the FTS5 INSERT to concatenate `name_fr`, the `name` column in `udb_search` contains "Ultramarines Space Marines" (French + English). The `UdbSearchResult.name` field then displays this concatenated string in the search results UI.

**Why it happens:** FTS5 `name` column serves double duty: FTS indexing AND result display.

**How to avoid:** Put French names in the `keywords` column (which is already a bag-of-words, not displayed). Keep `name` as the English name only. FTS5 matches across all columns regardless — the column a term appears in doesn't matter for matching.

**Recommended FTS5 INSERT approach:**
```sql
INSERT INTO udb_search(unit_id, name, faction_name, keywords)
SELECT u.id, u.name, f.name,
       COALESCE(u.name_fr || ' ', '') || COALESCE(f.name_fr || ' ', '') ||
       COALESCE(u.sub_faction || ' ', '') || COALESCE(GROUP_CONCAT(k.keyword, ' '), '')
FROM udb_units u
JOIN udb_factions f ON f.id = u.faction_id
LEFT JOIN udb_unit_keywords k ON k.unit_id = u.id
GROUP BY u.id
```
This keeps `name` as the English display name, puts French names in `keywords` (indexed but not displayed).

### Pitfall 3: translations_fr.json key format for abilities/weapons

**What goes wrong:** Abilities and weapons have no standalone string IDs. The build script arrays contain `(unit_id, name)` pairs. If the overlay uses an opaque key format (e.g., `"000000123:Bolt Rifle"`), the lookup logic must construct the same key from the array entry.

**Why it happens:** D-01 specifies `abilities: { id: { name_fr, description_fr } }` — the `id` here is not defined precisely for sub-entities.

**How to avoid:** Define the ability key as `"${unit_id}:${abilityName}"` (all lowercase, exact match). Use the same key format in the build script lookup loop. Document this in the translation overlay's README or header comment.

**Warning signs:** `_fr` fields stay null for abilities/weapons even after translations_fr.json has entries.

### Pitfall 4: TypeScript `noUnusedParameters` — locale param on query functions

**What goes wrong:** TypeScript strict mode (`noUnusedLocals`, `noUnusedParameters`) flags unused function parameters. If a query function adds `locale?: 'en' | 'fr'` but the build accidentally strips the conditional SQL (e.g., during refactor), TS won't catch the logical error — but it WILL catch an actually unused param.

**Why it happens:** TypeScript only checks parameter usage, not SQL string construction correctness.

**How to avoid:** Always use the `locale` parameter in the SQL string (even if only in a comment during development). Include tests that call the function with `locale='fr'` and verify the COALESCE output.

### Pitfall 5: Build script overlay applied before entity arrays are finalized

**What goes wrong:** If the overlay is applied before all `units` are pushed (e.g., before BSData sub_faction matching), some units might have their `_fr` fields set but then the unit is replaced or reordered by later steps.

**Why it happens:** Build script is imperative and mutates shared arrays.

**How to avoid:** Apply the overlay as the last step before writing the output JSON — after all mutations (points backfill, sub_faction assignment, empty faction pruning). The overlay is a final decoration step, not a parsing step.

---

## Code Examples

Verified from project source files:

### Zustand persist store (from `gameDayStore.ts`)
```typescript
// Source: src/features/game-day/gameDayStore.ts lines 64–148
export const useGameDayStore = create<GameDayStore>()(
  persist(
    (set) => ({ listStates: {}, /* ... actions */ }),
    { name: "game-day-state" },
  ),
);
```
Clone this pattern for `useLocaleStore` with `{ name: "app:locale" }`.

### React Query key with variable (from `useUnitDatabase.ts`)
```typescript
// Source: src/hooks/useUnitDatabase.ts lines 26–28
export const UDB_UNITS_KEY = (factionId: string) =>
  ["udb-units", factionId] as const;
```
Add locale as second parameter: `(factionId: string, locale: Locale) => ["udb-units", factionId, locale] as const`.

### COALESCE pattern in SQLite (from lib.rs FTS5 rebuild)
```sql
-- Source: src-tauri/src/lib.rs lines 730–741
COALESCE(u.sub_faction || ' ', '') || COALESCE(GROUP_CONCAT(k.keyword, ' '), '')
```
Same pattern for French name concatenation: `COALESCE(u.name_fr || ' ', '')`.

### Graceful overlay loading (from `scripts/lib/normalize.ts` loadAliases)
```typescript
// Source: scripts/lib/normalize.ts — loadAliases() pattern
export function loadAliases(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as Record<string, string>;
  } catch {
    return {};
  }
}
```
Apply same graceful degrade to `loadTranslationsFr()`.

### AppSidebar footer placement (from `AppSidebar.tsx`)
```tsx
// Source: src/components/common/AppSidebar.tsx lines 222–236
{/* Collapse toggle (above Settings, per UI-SPEC §4) */}
<div className="px-2 pb-1">
  <Button variant="ghost" size="icon" ...>
    {collapsed ? <ChevronsRight /> : <ChevronsLeft />}
  </Button>
</div>
{/* Settings (pinned bottom) */}
<div className="border-t border-border px-2 py-2">...</div>
```
`LocaleToggle` inserts as a sibling row between the collapse button div and the Settings border-top div.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `_fr: null` in unit_database.json | `_fr` fields populated from overlay | Phase 111 (this phase) | French names travel in JSON and survive re-import |
| FTS5 indexes English names only | FTS5 content includes French names | Phase 111 (this phase) | Typing French faction/unit name returns results |
| UDB hooks always return English | UDB hooks accept locale from Zustand store | Phase 111 (this phase) | All UDB-displaying surfaces go bilingual via hook change alone |

**Nothing deprecated by this phase.** The English-only query functions are extended, not replaced. The `locale` parameter defaults to `'en'`, maintaining backwards compatibility for any code that calls the query functions directly without locale.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Ability/weapon overlay key format is `"${unit_id}:${entityName}"` (name-based) | Code Examples | Build script overlay lookup silently fails; `_fr` stays null for abilities/weapons |
| A2 | French names in FTS5 `keywords` column (not `name`) is correct for clean display | Common Pitfalls / Pattern 5 | Concatenated EN+FR name shows in search result UI — cosmetic issue only, search still works |

---

## Open Questions

1. **Ability/weapon overlay key format**
   - What we know: D-01 specifies `abilities: { id: { name_fr, description_fr } }` but "id" is ambiguous for sub-entities without standalone PKs
   - What's unclear: Is the key `unit_id` alone (object of abilities per unit) or `unit_id:ability_name` (flat map)?
   - Recommendation: Planner should define the overlay schema precisely in the Wave 0 `translations_fr.json` stub. Simplest: `{ "abilities": { "${unit_id}:${abilityName}": { name_fr, description_fr } } }`.

2. **LocaleToggle placement in sidebar: same div as collapse button or separate div?**
   - What we know: UI-SPEC says "between collapse toggle row and Settings border-top, in existing `px-2 pb-1` div OR as a separate row immediately above it"
   - What's unclear: Putting two elements in the same `px-2 pb-1` div requires a flex-row layout change vs. adding a sibling div
   - Recommendation: Separate sibling div (`<div className="px-2 pb-1">`) above the collapse toggle div — zero disruption to existing collapse button layout.

---

## Environment Availability

Step 2.6: SKIPPED (no external tool dependencies — this phase uses only existing Node.js, pnpm, and Tauri/Rust toolchain already proven working in Phase 108).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` (inferred from `pnpm test`) |
| Quick run command | `pnpm test -- tests/unit-database/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FR-02 | Build script applies overlay: faction with known ID gets `name_fr` set; missing ID stays null | unit | Test `loadTranslationsFr` and apply logic with mock overlay | ❌ Wave 0 |
| FR-03 | `getUdbFactions('fr')` returns COALESCE SQL (verify SQL string, not DB) | unit | `pnpm test -- tests/unit-database/localeQueries.test.ts` | ❌ Wave 0 |
| FR-04 | `useLocaleStore` initializes to `'en'`, persists to localStorage, `setLocale('fr')` updates state | unit | `pnpm test -- tests/unit-database/localeStore.test.ts` | ❌ Wave 0 |
| FR-04 | `LocaleToggle` renders EN/FR labels; clicking FR calls `setLocale('fr')` and invalidates queries | component | `pnpm test -- tests/unit-database/LocaleToggle.test.tsx` | ❌ Wave 0 |
| FR-05 | FTS5 rebuild SQL change: French name in `keywords` column (verify via string match on SQL, not DB exec) | unit | `pnpm test -- tests/unit-database/fts5Rebuild.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm test -- tests/unit-database/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/unit-database/localeStore.test.ts` — covers FR-04 (Zustand store behavior)
- [ ] `tests/unit-database/localeQueries.test.ts` — covers FR-03 (SQL string construction per locale)
- [ ] `tests/unit-database/LocaleToggle.test.tsx` — covers FR-04 (toggle interaction, query invalidation)
- [ ] `tests/unit-database/translationsOverlay.test.ts` — covers FR-02 (overlay load + apply logic)

---

## Security Domain

ASVS enforcement applies. This phase has minimal security surface — no user authentication, no sensitive data, no new API endpoints.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | partial | `translations_fr.json` is a dev-side file, not user input; build script uses try/catch + existsSync |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed `translations_fr.json` crashes build | Tampering (dev tooling only) | try/catch + graceful degrade to null overlay — already specified in Pattern 1 |
| Locale parameter SQL injection | Tampering | Locale is a TypeScript union `'en' | 'fr'` — only two values possible; no user input reaches SQL |

---

## Sources

### Primary (HIGH confidence — verified from project source files)

- `scripts/build-unit-db.ts` — full build pipeline structure, steps 1-10, entity array shapes
- `scripts/lib/types.ts` — confirms all `_fr` fields already in TypeScript interfaces
- `src-tauri/migrations/038_udb_schema.sql` — FTS5 table DDL: `(unit_id UNINDEXED, name, faction_name, keywords)`
- `src-tauri/migrations/041_udb_sub_faction_fr.sql` — confirms `_fr` columns added via ALTER TABLE
- `src-tauri/src/lib.rs` lines 724–742 — exact FTS5 rebuild SQL in `import_unit_database_inner()`
- `src/db/queries/unitDatabase.ts` — all 10+ query functions; confirmed which ones need locale
- `src/hooks/useUnitDatabase.ts` — query key factories and hook implementations
- `src/components/common/useSidebarCollapsed.ts` — localStorage persist pattern
- `src/features/game-day/gameDayStore.ts` — Zustand persist clone target
- `src/components/common/AppSidebar.tsx` — sidebar DOM structure; LocaleToggle placement point
- `.planning/phases/111-bilingual-infrastructure/111-UI-SPEC.md` — toggle interaction contract, component names

### Secondary (MEDIUM confidence)

None required — all research was internal to the codebase.

---

## Metadata

**Confidence breakdown:**

- Build script overlay: HIGH — pattern is identical to `loadAliases()`; overlay key format for abilities is the only open question
- Query layer locale threading: HIGH — SQL COALESCE pattern confirmed; exact functions to update confirmed by reading source
- Zustand store: HIGH — direct clone of `gameDayStore.ts` pattern
- React Query key + invalidation: HIGH — key factories already parameterized; staleTime Infinity + key change interaction is a known pattern
- FTS5 rebuild extension: HIGH — exact SQL location confirmed; recommended column (keywords) chosen to avoid display artifact
- Sidebar toggle placement: HIGH — AppSidebar DOM structure fully read; exact insertion point identified

**Research date:** 2026-06-01
**Valid until:** 2026-07-01 (stable internal codebase; no external dependencies to go stale)
