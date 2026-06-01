# Stack Research — v0.4.2 Unit Database 2.0

**Domain:** Tauri 2 desktop app — incremental feature additions to existing validated stack
**Researched:** 2026-06-01
**Confidence:** HIGH (i18n), MEDIUM (BSData XML improvements), HIGH (sub-faction schema)

---

## Scope

This research covers ONLY new capabilities needed for v0.4.2. The existing stack
(Tauri 2, React 19, TypeScript 5, Vite 6, TailwindCSS 4, shadcn/ui, SQLite via
tauri-plugin-sql, React Query, Zustand, FTS5, @xmldom/xmldom, better-sqlite3) is
validated and not re-researched here.

---

## 1. i18n Framework — Data-Level Translation with Locale Toggle

### Decision: i18next + react-i18next, no backend, in-memory resources

**Why:** The scope is data-level translation only — unit names, ability descriptions, and
faction names stored bilingually in the database, surfaced to the UI via locale-aware
React Query hooks. i18next handles the locale toggle state (`i18n.changeLanguage('fr')`)
and provides the `useTranslation` hook consumed by data-display components. No UI
string translation is planned (menus, labels stay English), so no backend plugin or
file-loading infrastructure is needed for v0.4.2. All translations come from the DB.

**Versions (current as of 2026-06-01):**
- `i18next` — v26.3.0
- `react-i18next` — v17.0.8

Both are actively maintained with weekly releases. v26 of i18next changed the minimum
peer dependency on several plugins; v17 of react-i18next aligns with that. React 19
compatibility is confirmed — the library explicitly targets React 18+ with hooks-based
API.

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `i18next` | ^26.3.0 | Locale state machine + `changeLanguage` | Industry standard; works offline with in-memory resources; no backend required for static/DB-sourced translations |
| `react-i18next` | ^17.0.8 | `useTranslation` hook + `I18nextProvider` | React 19 compatible; integrates cleanly with existing Zustand + React Query architecture |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `i18next-resources-to-backend` | ^1.2.1 | Lazy-load namespaces from dynamic imports | Only if translation JSON files grow large enough to warrant code-splitting. Not needed for v0.4.2 — data comes from DB, not JSON files |

**Do NOT install:** `i18next-http-backend`, `i18next-browser-languagedetector`. The
app is offline-first and locale is user-toggled in-app, not detected from browser/OS.

### Integration Pattern

The i18n instance is initialized once at app startup with an empty (or minimal)
resource bundle. The active locale is stored in a lightweight Zustand slice (one key:
`locale: 'en' | 'fr'`) that mirrors the i18next state. React Query hooks that serve
unit/ability data accept the locale as a query key segment — `['udb-units', factionId, locale]`
— so changing locale invalidates and refetches the bilingual data from SQLite without
touching any other cache.

```typescript
// src/lib/i18n.ts — initialize once, no backend
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {}, // translations come from DB, not static JSON
  interpolation: { escapeValue: false },
});

export default i18n;
```

```typescript
// Locale Zustand slice
interface LocaleState {
  locale: 'en' | 'fr';
  setLocale: (l: 'en' | 'fr') => void;
}
```

The React Query hook passes `locale` into the SQL query to select either the
`name` or `name_fr` column (dual-column schema — see section 3). This keeps the
i18n library as thin locale-state infrastructure; the actual translation is a
DB query concern.

### Installation

```bash
pnpm add i18next react-i18next
```

---

## 2. BSData XML Parsing — Points Match Rate Improvement

### Decision: Keep @xmldom/xmldom; improve matching algorithm, not the parser

**Why:** The current parser (`@xmldom/xmldom` v0.9.10) is the correct tool — the existing
build script uses DOM API methods (`getElementsByTagName`, `getAttribute`,
`childNodes`) that would require a full rewrite to switch to an object-based parser
like `fast-xml-parser`. The root cause of points matching failures is not parser
quality; it is the name-normalisation strategy and BSData XML structural patterns.

**Root causes of current match failures (from code analysis):**

1. **Exact lowercase name match** — `unit.name.toLowerCase() + ':' + faction_id`. BSData
   names sometimes include apostrophes, hyphens, or spacing variants not present in
   Wahapedia (e.g., "T'au" vs "T'au"). No normalisation beyond `.toLowerCase()`.

2. **Library .cat files excluded** — `!f.includes("Library")` filter drops
   "Imperium - Astra Militarum - Library.cat" which contains shared entries for units
   that appear only there, not in the main catalogue file. Points for units defined in
   library catalogues are silently missed.

3. **No sharedSelectionEntries cross-reference** — BSData uses `entryLink` elements
   pointing to `sharedSelectionEntries` defined in library catalogues. The current
   script only reads `selectionEntry` elements directly inside the parsed file; linked
   entries from other catalogues are ignored.

4. **Single-cost units only set `base_points`** — units that BSData defines with a
   flat `pts` cost (not tiered) set `unit.base_points` on the row. If BSData has a
   tiered structure and Wahapedia expects base_points = null (using the tiers table),
   the mismatch creates a unit with both base_points and points tiers, which may
   confuse the resolver.

### Improvements (no new libraries required)

| Improvement | What to Change | Expected Impact |
|-------------|---------------|-----------------|
| Name normalisation | Strip punctuation, collapse whitespace, normalise apostrophes before key lookup | Fixes cross-character-encoding mismatches |
| Include library catalogues in parsing pass | Remove `!f.includes("Library")` filter; parse all .cat files | Recovers shared entries that only appear in library files |
| Fuzzy fallback match | After exact match fails, try Levenshtein distance <= 2 on unit names within same faction | Recovers minor spelling variants |
| Coverage report | Print `unmatched BSData units` and `units with no points` counts at end of build | Surfaces remaining misses for manual review |
| Tiers-vs-base_points precedence | If a unit has tiers, set `base_points = null`; if flat cost only, set `base_points`; never both | Prevents resolver ambiguity |

**Levenshtein for fuzzy match** — no new library needed. A simple 20-line pure-JS
Levenshtein implementation is sufficient for the small string sizes involved (<60
chars). Do not add a fuzzy-search library as a prod dependency; this runs only in
the dev-side build script.

### @xmldom/xmldom stays at current version

`@xmldom/xmldom` v0.9.10 is already in devDependencies. No version change needed.

---

## 3. Sub-Faction Data Modeling — SQLite Schema

### Decision: Dual-table sub-faction schema (udb_subfactions + udb_unit_subfactions)

**Why:** Sub-factions (Space Marine chapters, Chaos Space Marine warbands, Aeldari
sub-factions) are a many-to-many relationship: a unit can belong to multiple
sub-factions (e.g., Tactical Squad is valid for all SM chapters), and a sub-faction
contains many units. A join table is the correct normalised model. This avoids
column proliferation on `udb_units` and allows filter queries to use a simple
`WHERE us.subfaction_id = ?` without parsing JSON or splitting delimited strings.

**Source:** BSData `.cat` files already encode sub-faction membership via catalogue
file identity (one `.cat` per sub-faction). The build script currently maps catalogue
name to `faction_id` via `FACTION_MAP`. The same mapping can be extended to derive
`subfaction_id` from the catalogue name.

### Schema (new migration)

```sql
-- udb_subfactions: Space Marine chapters, CSM warbands, Aeldari paths, etc.
CREATE TABLE IF NOT EXISTS udb_subfactions (
  id         TEXT PRIMARY KEY,          -- e.g. "SM_BloodAngels", "AE_Craftworlds"
  faction_id TEXT NOT NULL REFERENCES udb_factions(id),
  name       TEXT NOT NULL,
  name_fr    TEXT,                      -- bilingual (see section 4)
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- udb_unit_subfactions: many-to-many join
CREATE TABLE IF NOT EXISTS udb_unit_subfactions (
  unit_id       TEXT NOT NULL REFERENCES udb_units(id) ON DELETE CASCADE,
  subfaction_id TEXT NOT NULL REFERENCES udb_subfactions(id) ON DELETE CASCADE,
  PRIMARY KEY (unit_id, subfaction_id)
);

CREATE INDEX IF NOT EXISTS idx_udb_subfactions_faction_id
  ON udb_subfactions(faction_id);

CREATE INDEX IF NOT EXISTS idx_udb_unit_subfactions_subfaction_id
  ON udb_unit_subfactions(subfaction_id);

CREATE INDEX IF NOT EXISTS idx_udb_unit_subfactions_unit_id
  ON udb_unit_subfactions(unit_id);
```

**Filter query pattern:**

```sql
SELECT u.*
FROM udb_units u
JOIN udb_unit_subfactions us ON us.unit_id = u.id
WHERE u.faction_id = $1
  AND us.subfaction_id = $2
ORDER BY u.role, u.name;
```

**Build script extension:** `FACTION_MAP` in `build-unit-db.ts` maps catalogue name
to `faction_id`. Add a parallel `SUBFACTION_MAP` that maps catalogue name to subfaction
id. Units parsed from a sub-faction catalogue get a row in `udb_unit_subfactions`.
Units parsed from a generic catalogue (e.g. "Imperium - Space Marines") get no
sub-faction row (they appear for all chapters).

---

## 4. Bilingual Data Storage — Schema Pattern

### Decision: Dual-column (not translation table) for two fixed locales

**Why:** The project supports exactly two locales (EN + FR). A translation table
(separate rows per locale) adds JOIN complexity to every read query with no
compensating benefit at two locales. The dual-column approach (`name TEXT, name_fr TEXT`)
keeps queries simple: selecting the French column with COALESCE fallback to English
is a single expression with no JOIN. All bilingual columns are nullable on the FR
side — a missing French translation falls back to English at query time, not
application time.

If a third locale were ever needed, the translation table approach becomes preferable.
At two locales, dual-column wins on simplicity and query performance.

### Columns to add (via new migration)

| Table | New column | Notes |
|-------|-----------|-------|
| `udb_units` | `name_fr TEXT` | Datasheet name in French |
| `udb_unit_abilities` | `name_fr TEXT`, `description_fr TEXT` | Ability title + body text |
| `udb_unit_weapons` | `name_fr TEXT` | Weapon profile name |
| `udb_factions` | `name_fr TEXT` | Faction name |
| `udb_subfactions` | `name_fr TEXT` | Sub-faction name (already in schema above) |

**Columns NOT bilingualized** in v0.4.2:
- Stat values (M, T, Sv, W, etc.) — numbers, language-neutral
- Keywords — canonical 40k keywords, not translated
- Points — numeric
- `base_points`, `model_count` — numeric

### French data source

Wahapedia (wahapedia.ru) publishes EN-only CSV exports. There is no official French
CSV from Wahapedia. French translation data must come from one of:

1. **Manual curation** — translate high-priority unit/ability names by hand, stored
   in a separate `scripts/data/translations_fr.json` override file loaded by the build
   script. Most practical for v0.4.2 given scope (personal tool, single user).

2. **Community BSData French repo** — BSData hosts a French translation project
   (github.com/BSData/catalogue-development/issues/123) but coverage is incomplete
   and the format does not map cleanly to the Wahapedia CSV structure.

3. **Games Workshop FR downloads** — warhammer-community.com/fr provides official FR
   PDFs but no machine-readable CSV. Not usable directly without manual extraction.

**Recommendation for v0.4.2:** Start with approach 1 (manual JSON override file in
`scripts/data/`). The build script merges EN data from Wahapedia CSVs with FR
overrides from the JSON file. This is the only approach that gives controlled quality
for a personal tool with a single curator.

Schema is bilingual from day 1 (columns present), but FR data is populated
incrementally as translations are entered. `COALESCE(name_fr, name)` fallback
ensures EN always renders when FR is absent.

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| i18next + react-i18next | `react-intl` (FormatJS) | FormatJS is primarily message-format translation; i18next is simpler for a locale-state toggle with DB-sourced data |
| i18next + react-i18next | Custom Zustand locale context | Re-inventing locale switching, plural forms, and React context integration; i18next is battle-tested and 8 KB |
| Dual-column bilingual schema | Separate translation table | Translation table adds JOIN to every read; two fixed locales don't justify it |
| Dual-column bilingual schema | JSON column for translations | No type safety, no index-friendly COALESCE fallback |
| Keep @xmldom/xmldom + better algorithm | Switch to fast-xml-parser | fast-xml-parser returns objects, not DOM; entire build script uses DOM API; a parser switch would require a full rewrite with no quality benefit |
| Manual FR JSON override file | Wahapedia FR CSV (doesn't exist) | No machine-readable FR CSV source exists from Wahapedia |
| many-to-many sub-faction join table | `subfaction_ids` TEXT column on units | Delimited strings break index-based filtering and FK integrity |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `i18next-http-backend` | Fetches translations from HTTP; app is offline-first | In-memory resources + DB data |
| `i18next-browser-languagedetector` | Detects locale from browser/OS; locale is user-toggled, not auto-detected | Zustand `locale` slice persisted to localStorage |
| `next-i18next` | Next.js-specific SSR wrapper | Not applicable to Tauri/React |
| Full-app UI string translation in v0.4.2 | Doubles translation surface; UI strings are English only | Data-level translation only (names, abilities, weapons) |
| BSData French translation catalogue | Incomplete coverage, format mismatch with Wahapedia CSV | Manual `translations_fr.json` override file |
| ORM for new migrations | Prisma confirmed dead-end in Tauri; Drizzle adds proxy complexity | Continue raw SQL migrations in `src-tauri/migrations/` |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `i18next@^26.3.0` | `react@^19.0.0`, `react-i18next@^17.x` | i18next v26 requires react-i18next v15+ for type compatibility; v17 exceeds that |
| `react-i18next@^17.0.8` | `i18next@^26.x`, `react@^19.0.0` | v17 removes legacy class component APIs; hooks-only, matches project conventions |
| `@xmldom/xmldom@^0.9.10` | Node.js 18+, no browser runtime | Already in devDependencies; stays at current version |

---

## Installation

```bash
# New prod dependencies for i18n locale toggle
pnpm add i18next react-i18next

# No new devDependencies needed
# @xmldom/xmldom already in devDependencies
# better-sqlite3 already in devDependencies
```

New migration files (in `src-tauri/migrations/`):
- `041_udb_subfactions.sql` — sub-faction tables + indexes
- `042_udb_bilingual.sql` — `name_fr` columns on udb_* tables

New source files:
- `src/lib/i18n.ts` — i18next initialization
- `src/store/localeStore.ts` — Zustand locale slice
- `scripts/data/translations_fr.json` — manual FR overrides fed to build script

---

## Sources

- [react-i18next npm](https://www.npmjs.com/package/react-i18next) — version 17.0.8 confirmed, React 19 compatible
- [i18next npm](https://www.npmjs.com/package/i18next) — version 26.3.0 confirmed
- [react-i18next GitHub Releases](https://github.com/i18next/react-i18next/releases) — changelog verified for v15+ through v17
- [i18next: Add or Load Translations](https://www.i18next.com/how-to/add-or-load-translations) — in-memory resources pattern confirmed
- [@xmldom/xmldom npm](https://www.npmjs.com/package/@xmldom/xmldom) — v0.9.10 current, DOM API maintained
- [fast-xml-parser vs xmldom comparison](https://npm-compare.com/fast-xml-parser,xml-js,xml2js,xmldom) — xmldom chosen for DOM API compatibility
- [SQLite bilingual schema patterns](https://colinchsql.github.io/2023-10-13/10-17-39-132717-sqlite-database-internationalization-and-localization/) — dual-column vs translation table tradeoffs
- [BSData wh40k-10e](https://github.com/BSData/wh40k-10e) — XML structure reference for sub-faction catalogues
- [BSData catalogue development wiki](https://github.com/BSData/catalogue-development/wiki/Data-structure-overview) — sharedSelectionEntries and entryLinks structure
- [Wahapedia Data Export](https://wahapedia.ru/wh40k10ed/the-rules/data-export/) — EN-only CSV confirmed; no FR variant exists
- [BSData French translation issue](https://github.com/BSData/catalogue-development/issues/123) — community FR project incomplete, not usable as data source

---
*Stack research for: v0.4.2 Unit Database 2.0 — i18n, BSData XML improvements, sub-faction schema*
*Researched: 2026-06-01*
