# Stack Research

**Domain:** Data quality audit tooling + pipeline improvement for a dev-side build script
**Researched:** 2026-06-02
**Confidence:** HIGH

---

## Context: What Already Exists (Do Not Re-Research)

The app stack is fully validated: Tauri 2 + React 19 + TypeScript 5 + Vite 6 + TailwindCSS 4 + SQLite. This research covers only the NEW capabilities needed for v0.4.5.

The build pipeline already has:
- `@xmldom/xmldom` ^0.9.10 — XML/DOM parsing for BSData .cat files
- `better-sqlite3` ^12.10.0 — SQLite for data-layer tests
- Node `--experimental-strip-types` to run `.ts` scripts without compilation
- `scripts/lib/` shared library: `parseCsv.ts`, `parseXml.ts`, `normalize.ts`, `factionMap.ts`, `types.ts`
- `scripts/data/coverage-report.json` — per-faction points coverage output
- `scripts/data/aliases.json` — 44 manual name-mapping overrides
- `scripts/data/translations_fr.json` — French overlay keyed by unit/ability/weapon/keyword IDs

**Current points coverage: 60.1% overall** (SM: 58.1%, NEC: 79.7%, DG: 50.7%). The gap is largely Forge World / Legends units in Wahapedia CSVs that don't exist in BSData — not a parsing bug.

---

## Recommended Stack Additions

### Core Technologies

No new runtime dependencies are needed. All new tooling is dev-side scripts only, matching the established `scripts/` pattern.

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js built-ins (`node:fs`, `node:path`, `node:crypto`) | bundled | File I/O for audit scripts | Already used throughout `scripts/`; no new dep |
| `@xmldom/xmldom` | ^0.9.10 (already installed) | XML parsing for deeper BSData field extraction | Already declared in devDependencies; no version bump needed |
| `better-sqlite3` | ^12.10.0 (already installed) | Read `hobbyforge.db` to cross-check imported data | Already used for data-layer tests; no version bump needed |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None new | — | — | All needed capabilities exist in already-installed packages |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `node --experimental-strip-types` | Run `.ts` audit scripts directly | Same invocation pattern as `build:udb`; no `tsc` or separate tsconfig needed |
| `pnpm audit:udb` (new npm script) | Entry point for the audit runner | Add to `package.json` scripts, not a new package |

---

## Installation

No new packages needed. The v0.4.5 work adds only new `.ts` files under `scripts/`.

```bash
# Nothing to install — use existing devDependencies
```

---

## What the New Scripts Should Look Like

Based on the existing pipeline patterns, here is the recommended structure for new audit tooling:

**`scripts/audit-faction.ts`** — per-faction audit runner
- Accepts a faction ID argument (e.g., `SM`, `NEC`, `DG`)
- Reads `unit_database.json` (already built)
- Reads raw Wahapedia CSVs again for ground-truth comparison
- Reads BSData .cat files for points cross-check
- Outputs a human-readable report: missing points, stat mismatches, unmatched units, French coverage gaps
- Follows the `build-unit-db.ts` pattern: shared lib imports, graceful degrades, `process.exit(1)` on fatal errors

**`scripts/audit-subfaction.ts`** — sub-faction parent/child relationship audit
- Reads `unit_database.json`
- For each faction with sub-factions (SM chapters, DG, etc.), computes which units have `sub_faction = null` (generic/parent) vs a specific sub-faction label
- Reports units that are in a chapter catalogue but are missing `sub_faction = null` — these need to appear when the parent faction is selected
- Output feeds directly into `SUB_FACTION_MAP` corrections and the UI filter fix

**`scripts/audit-translations.ts`** — French translation coverage report
- Reads `unit_database.json`
- Reads `translations_fr.json`
- Reports per-faction EN/FR coverage: units, abilities, weapons, keywords
- Identifies which ability/weapon keys in the database don't match any key in the overlay (key format mismatch is the primary bug source: `${unit_id}:${name}` vs other patterns)
- Outputs a sorted list of untranslated entries for manual addition

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| New `.ts` scripts in `scripts/` | A separate audit package (e.g., `scripts/audit/package.json`) | Unnecessary complexity — `--experimental-strip-types` handles `.ts` directly, same as existing scripts |
| Reuse `@xmldom/xmldom` already installed | `fast-xml-parser` or `sax` | Would add a dep for zero benefit; `@xmldom/xmldom` already polyfills `DOMParser` correctly for the BSData XML structure |
| `better-sqlite3` for DB reads | `tauri-plugin-sql` | `tauri-plugin-sql` requires a Tauri runtime; `better-sqlite3` runs in plain Node for scripts |
| Manual `aliases.json` additions | Automated fuzzy matching with Levenshtein distance | Levenshtein produces too many false positives on unit names (e.g., "Terminator Squad" vs "Terminator Champion"); manual aliases are more precise and already have a working loader |
| Extend `scripts/lib/types.ts` with audit types | New file `scripts/lib/audit-types.ts` | Keep audit types co-located with audit scripts unless they become shared — premature abstraction at this stage |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `fast-xml-parser` | Redundant; `@xmldom/xmldom` already handles BSData XML correctly | `@xmldom/xmldom` (already installed) |
| `csv-parse` or `papaparse` | Wahapedia CSVs are pipe-delimited with non-standard trailing pipes; `parseWahapediaCsv()` in `scripts/lib/parseCsv.ts` already handles this correctly | Existing `parseWahapediaCsv()` |
| `diff` npm package | Not needed; audit scripts produce human-readable reports, not patch files; `update-unit-database.ts` already has a `computeDiff()` | Plain `Map`-based comparison in script |
| `chalk` or `kleur` for colorized output | Scripts run in PowerShell/bash; color support is environment-dependent; the existing pipeline uses plain `console.log` with `[OK]`/`[!]`/`[X]` text badges | Text badges (already established pattern) |
| `ts-node` | The project uses `node --experimental-strip-types` which is the modern equivalent with zero additional deps | `node --experimental-strip-types` |
| Any ORM for reading `hobbyforge.db` in scripts | `better-sqlite3` is already present and is the right tool for script-level DB reads | `better-sqlite3` directly |

---

## Sub-Faction Parent/Child Modeling

The current `sub_faction` column design is correct. The issue is purely in the UI query layer: when a sub-faction is selected, the query filters `WHERE sub_faction = $1` and misses units where `sub_faction IS NULL` (generic Space Marine units shared by all chapters).

**No schema change needed.** The fix is a SQL query change:

```sql
-- Current (broken): only returns chapter-specific units
WHERE faction_id = $1 AND sub_faction = $2

-- Fixed: returns chapter-specific units + generic parent units
WHERE faction_id = $1 AND (sub_faction = $2 OR sub_faction IS NULL)
```

This same fix applies to three call sites:
1. Database browser faction/sub-faction filter query
2. Army list unit picker query
3. Collection browser faction filter query

The audit script (`audit-subfaction.ts`) should verify for each sub-faction that the expected generic units (e.g., Intercessors, Primaris Librarian) have `sub_faction = null` in the built database, and the chapter-specific units (e.g., Blood Angels Death Company) have the correct sub-faction label.

---

## French Translation Key Format

The current overlay keys work as follows:
- `factions`: keyed by `faction_id` (string)
- `units`: keyed by `unit_id` (Wahapedia string ID)
- `abilities`: keyed by `${unit_id}:${ability_name}` (composite)
- `weapons`: keyed by `${unit_id}:${weapon_name}` (composite)
- `keywords`: keyed by `keyword` (plain string, shared across units)

The composite key format for abilities and weapons is fragile: if a unit's ability name changes in Wahapedia (e.g., capitalization, punctuation), the key no longer matches. The audit script should surface these mismatches by:
1. Building a set of all `${unit_id}:${name}` keys actually present in the database
2. Diffing against the keys in `translations_fr.json`
3. Reporting keys in the overlay that don't match any database entry (stale translations) and database entries with no overlay match (untranslated)

**No new library needed** — plain `Set` and `Map` operations.

---

## Coverage Gap Reality Check

The 60.1% overall points coverage is not a pipeline bug — it is expected. The unmatched units in `coverage-report.json` are overwhelmingly:

1. **Forge World / Legends units** — present in Wahapedia CSVs but not in BSData community files (Forgeworld content is separate from the main BSData wh40k-10e repo). These will never match BSData parsing because the data simply is not there. Examples: most of the 683 unmatched units across DG/TS/WE/CSM/SM are Forge World vehicles.

2. **Units with naming mismatches** — a smaller subset where BSData uses a different name than Wahapedia (e.g., "Chaos Lord On Juggernaut" vs "Lord On Juggernaut"). These are fixable via `aliases.json` additions.

The audit goal for the milestone is to fix the **fixable** mismatches for SM, NEC, and DG — not to reach 100% coverage (which would require sourcing Forge World points data separately).

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@xmldom/xmldom` ^0.9.10 | Node 18+ | No peer dep issues with current setup |
| `better-sqlite3` ^12.10.0 | Node 18+ | Requires native rebuild (already in `pnpm.onlyBuiltDependencies`) |
| `node --experimental-strip-types` | Node 22.6+ | Already used for `build:udb`; no change needed |

---

## Sources

- Direct code inspection of `scripts/build-unit-db.ts`, `scripts/update-unit-database.ts`, `scripts/lib/*.ts` — HIGH confidence
- Direct inspection of `scripts/data/coverage-report.json` — actual coverage numbers verified (60.1% overall, SM 58.1%, NEC 79.7%, DG 50.7%)
- Direct inspection of `package.json` — exact installed versions confirmed
- Project context in `.planning/PROJECT.md` — milestone goals confirmed

---
*Stack research for: v0.4.5 Data Quality Audit & Pipeline Improvement*
*Researched: 2026-06-02*
