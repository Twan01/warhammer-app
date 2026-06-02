# Pitfalls Research

**Domain:** Warhammer 40K unit database — data quality audit, pipeline improvement, sub-faction filtering (v0.4.5)
**Researched:** 2026-06-02
**Confidence:** HIGH — derived from direct codebase inspection of build pipeline, Rust import command, query layer, and known failure modes from previous milestones

---

## Critical Pitfalls

### Pitfall 1: FTS5 Index Becomes Stale After Pipeline Data Fixes

**What goes wrong:**
The `udb_search` FTS5 virtual table is populated only inside `import_unit_database_inner()` in `lib.rs`. Any time a pipeline fix changes the content of `udb_units`, `udb_unit_keywords`, `udb_unit_abilities`, or `udb_unit_weapons` — corrected stats, fixed French translations, updated names — the FTS5 index remains stale unless the import path explicitly runs the `INSERT INTO udb_search` rebuild query. If the version hash is unchanged (because the developer forgot to rebuild the JSON), the entire import is skipped via the early-exit check in `import_unit_database_inner`, leaving FTS5 pointing at old rows.

**Why it happens:**
The version is a content hash (`1.0.0+<sha256_of_data>`), so identical JSON always produces the same hash and the import is skipped. Developers testing partial fixes may manually patch rows in SQLite without rebuilding the JSON, causing FTS5 and the underlying tables to diverge silently.

**How to avoid:**
Always go through the full rebuild cycle: run `pnpm build:udb` → produce a new `unit_database.json` → trigger the app import. Never directly INSERT/UPDATE udb_* rows in SQLite outside the import transaction. Add a post-build assertion that verifies `SELECT COUNT(*) FROM udb_search` equals `SELECT COUNT(*) FROM udb_units` as a completion criterion for every data fix phase.

**Warning signs:**
- FTS5 search finds units that no longer exist after a name correction
- FTS5 search misses newly corrected unit names
- `SELECT COUNT(*) FROM udb_search` does not match `SELECT COUNT(*) FROM udb_units`

**Phase to address:**
Every pipeline fix phase — each phase that corrects records in `unit_database.json` must rebuild via `pnpm build:udb` and verify FTS5 count parity before marking complete.

---

### Pitfall 2: Sub-faction Filter Silently Drops Parent-Faction Generic Units

**What goes wrong:**
The current `getUdbUnitIdsBySubFaction` query uses `WHERE faction_id = $1 AND sub_faction = $2`. When the DB browser, army list picker, or collection browser filters to a sub-faction (e.g. "Blood Angels"), client-side code keeps only units whose `sub_faction` matches the selection. Units with `sub_faction = null` — parent-faction generics like Tactical Squad, Rhino, Repulsor — are dropped from the display. The user sees only chapter-exclusive units with no generic Space Marines.

**Why it happens:**
The filter predicate was written to isolate a sub-faction's exclusive units. The intended UX is different: a sub-faction selection should show the chapter's specific units PLUS the shared parent faction units. The null-vs-value distinction is easy to miss when writing a first-pass filter.

**How to avoid:**
The filter predicate must be: show unit if `sub_faction === selected OR sub_faction === null`. In SQL: `WHERE faction_id = $1 AND (sub_faction = $2 OR sub_faction IS NULL)`. Apply this consistently in all three surfaces (DB browser, army list UnitPickerDialog, collection Add-from-Database). Test by selecting "Blood Angels" in DB browser and confirming Tactical Squad (null sub_faction) remains visible.

**Warning signs:**
- Only 10-20 units visible when a Space Marines chapter is selected (chapter-exclusive only), when the full faction has 100+
- Generic transport units (Rhino, Repulsor) absent from any sub-faction-filtered view
- "No units" state shown for sub-factions with few chapter-exclusive datasheets

**Phase to address:**
Sub-faction filtering fix phase — first fix applied before any data audit work to establish a correct baseline.

---

### Pitfall 3: Audit Source Version Skew Produces False Positives

**What goes wrong:**
Wahapedia, the GW app, and BSData community sources update at different rates after GW releases an errata or Munitorum Field Manual update. An audit comparing points without pinning the exact source version produces contradictory findings: Wahapedia may reflect an errata that BSData hasn't merged yet, or vice versa. Mismatches that appear to be data errors are actually version lag.

**Why it happens:**
Warhammer 40K points change 2-4 times per year via Munitorum Field Manual updates. Community sources have variable lag (days to weeks). Multi-day audit sessions mean the source itself may update mid-audit.

**How to avoid:**
Before starting the audit, record and lock the exact version of each source:
- Wahapedia: note the "Last updated" date shown per datasheet
- GW app: note the app version and season
- BSData: note the git commit hash of the `wh40k-10e` repo used for `.cat` files

Any discrepancy found must be validated against the pinned version, not re-checked live against a potentially updated source.

**Warning signs:**
- Same unit shows different point values depending on which source you check at a given moment
- Points corrections applied during the audit are immediately contradicted by new source updates
- Coverage report shows regression after rebuild when BSData file dates have changed

**Phase to address:**
Pre-audit scoping — define and lock source versions before any comparison work begins.

---

### Pitfall 4: aliases.json Becomes a Crutch That Masks Real Pipeline Bugs

**What goes wrong:**
The 44 existing aliases were designed as a fallback for genuinely ambiguous naming differences between BSData and Wahapedia (singular vs. plural, variant suffixes, etc.). When a pipeline parsing bug causes systematic mismatches — a CSV column mis-mapped, a name normalization regex too aggressive — the temptation is to add more aliases rather than fix the root cause. This inflates aliases.json into a band-aid list that hides a structural parser defect.

**Why it happens:**
Adding an alias takes 30 seconds. Diagnosing whether a mismatch is structural takes much longer. Under time pressure, the alias path is taken every time a match fails without checking the pattern.

**How to avoid:**
Before adding any new alias, check whether the mismatch follows a pattern affecting multiple units. If 3+ units have the same structural mismatch (e.g., all BSData names have a trailing wargear variant in parentheses), fix `parseCatXml` or `normalizeName` instead. Reserve aliases for genuine one-off naming differences (a unit renamed by GW, a clear typo on one side). The build output already logs exact/normalized/alias match counts — if the alias count grows disproportionately, that is a signal.

**Warning signs:**
- aliases.json growing beyond 60-70 entries
- Multiple aliases that differ only by a suffix pattern (e.g., " (variant A)", " (variant B)" all pointing to the same target)
- The build log shows alias-match count above 10% of total matched units

**Phase to address:**
Pipeline improvement phase — check alias-match count in build output before adding any new aliases during audit.

---

### Pitfall 5: French Translation Key Rot After Weapon or Ability Name Corrections

**What goes wrong:**
The French overlay for weapons uses a composite key `${unit_id}:${weapon_name}` (for weapons) or `${unit_id}:${ability_name}` (for abilities) in `translations_fr.json`. If an audit finds that a weapon or ability name is wrong in Wahapedia CSV data and the pipeline corrects it (e.g. "Bolt pistol" → "Bolt Pistol" capitalization), the translation key stored under the old name becomes unresolvable. The correction silently falls back to `null` for that weapon's French name, and the build output's `frWeapons` count drops — which is easy to miss.

**Why it happens:**
Name corrections in the pipeline (CSV parse step) happen before the French overlay is applied (Step 10.5 in the build script). The overlay key must match the corrected name exactly, but the correction and the overlay update are done in separate files and can easily fall out of sync.

**How to avoid:**
After any weapon or ability name correction in the pipeline, search `translations_fr.json` for the old name and update the key to the new name in the same commit. Add a validation step in the build script that logs "X weapon keys in translations_fr.json had no match" — a nonzero count after a pipeline fix is a signal that key rot occurred. The build script already outputs `frWeapons` count; track it as a non-regression metric.

**Warning signs:**
- French weapon or ability count drops between two consecutive builds
- Weapons that previously displayed French names show English only after a pipeline fix
- `translations_fr.json` keys contain old or mismatched capitalization compared to corrected pipeline output

**Phase to address:**
Pipeline improvement phase — add a post-overlay validation pass before marking any translation-touching fix complete.

---

### Pitfall 6: Rust Import Column Mismatch After Pipeline Adds a New JSON Field

**What goes wrong:**
The Rust `import_unit_database_inner` has hardcoded INSERT statements for all udb_* tables. If the build pipeline is improved to output a new field (e.g., a corrected `damaged_desc` variant, or a new `description_short` on abilities), the corresponding Rust INSERT must also be updated. Without the update, `serde_json::Value` deserialization succeeds (the field is simply unused), but the column is silently written as NULL for every row. No error is thrown; the data is just wrong.

**Why it happens:**
The Rust INSERT strings are maintained independently of the TypeScript build pipeline types. There is no compile-time check that JSON field names in `unit_database.json` correspond to Rust `bind()` calls.

**How to avoid:**
Any change to the TypeScript types in `scripts/lib/types.ts` that adds or removes fields in the JSON output must be paired with a corresponding Rust INSERT change. Treat the Rust INSERT strings as a schema contract. After any such change, verify by checking that the new field is non-null for at least one known unit after re-import.

**Warning signs:**
- A newly added field is always NULL in the database despite being present in `unit_database.json`
- `scripts/lib/types.ts` was modified but `lib.rs` was not in the same change
- Rust import result counts look correct (row counts match) but data values are wrong

**Phase to address:**
Any pipeline improvement phase that adds or changes JSON output fields — check this explicitly before marking the phase complete.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Add alias to aliases.json instead of fixing parsing bug | 30-second fix, audit continues | Aliases grow unbounded; root cause stays hidden | Only for genuine one-off name differences with no structural pattern |
| Hardcode corrections in translations_fr.json | Fast for known errors | Key rot when source names change on next GW update | Acceptable for proper nouns unlikely to change; risky for common weapon names |
| Manual SQLite edits during development | Faster than full rebuild | FTS5 and source diverge; version hash not updated | Only during exploratory debugging; never shipped |
| Skip FTS5 rebuild count validation | Saves one query | Stale FTS5 silently breaks search for corrected unit names | Never acceptable in a completed phase |
| First-wins sub_faction assignment (current approach) | Simple logic | Units in multiple catalogues get sub_faction from whichever .cat file is processed first | Acceptable unless a unit genuinely needs multiple sub-factions |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Wahapedia CSV encoding | Assuming pure ASCII; names contain smart quotes, en-dashes, Unicode apostrophes | Read with `utf-8`; normalize to NFC before matching; treat `'` and `'` as equivalent |
| BSData .cat XML variant entries | Only parsing `<selectionEntry>` leaf nodes, missing nested entries with variant-specific points | `parseCatXml` must recurse; verify against a known multi-variant unit (e.g., Mek Gunz with different weapons) |
| BSData FACTION_MAP completeness | New BSData catalogue added for a new GW supplement not in FACTION_MAP | New `.cat` files are silently skipped; coverage report shows zero matched units from that file |
| French translations_fr.json | Keying ability translations as `unit_id:ability_name` for abilities shared across factions | For shared abilities, must add one entry per unit_id — or switch to ability-name-only keying for shared names |
| FTS5 MATCH query after name corrections | FTS5 search may fail on corrected names containing special characters not handled by sanitization regex | Verify the sanitization in `searchUdbUnits` handles all characters present in corrected unit names |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Sub-faction filter triggers full re-query on every toggle | UI pause when switching sub-factions | Sub-faction filtering done client-side on the faction-level cache — keep it that way; do not add sub_faction as a React Query key dimension | Not a scaling issue at current unit counts (~100/faction) |
| FTS5 search on large bilingual keyword content | Slower search after French keywords are added | FTS5 `keywords` column already concatenates EN + FR; monitor search latency after FR rollout | No issue expected at <3000 units |
| Full JSON parse of unit_database.json at every startup | Slow startup | Version check short-circuits import if already up to date — keep the fast path working | Would be an issue above ~50 MB JSON; current size is ~1-2 MB |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Sub-faction dropdown visible for factions without sub-factions | User confused by empty dropdown for Necrons, Orks, etc. | Only render sub-faction dropdown when `getDistinctSubFactions` returns >= 1 entry |
| Sub-faction filter clears when user switches faction and returns | Selection lost; user must reselect | Persist sub-faction selection per faction_id in Zustand filter store, not as a single global value |
| Audit corrections look inconsistent if some units are patched and others not | User notices two units in the same army list show points from different sources | Complete all corrections for a faction before shipping; never ship a partial faction audit |
| French locale toggle in DB browser not reflected in army list picker | User switches to FR, adds unit, army list shows EN name | Locale preference must come from a shared app-level context, not component-local state |

---

## "Looks Done But Isn't" Checklist

- [ ] **Sub-faction filtering (all three surfaces):** Select "Blood Angels" in DB browser, army list UnitPickerDialog, and collection Add-from-Database — confirm generic units (Tactical Squad, Rhino) appear alongside chapter-exclusive units
- [ ] **FTS5 count parity after rebuild:** `SELECT COUNT(*) FROM udb_search` equals `SELECT COUNT(*) FROM udb_units` — verify after every build that modifies data
- [ ] **French overlay non-regression:** `frWeapons` + `frAbilities` counts in build output are >= previous build counts — any drop signals key rot
- [ ] **Points coverage rate non-regression:** Overall coverage stays >= 96.9% after pipeline fixes — any regression must be explained before shipping
- [ ] **Rust INSERT alignment:** All columns in migration 041 (`sub_faction`, `name_fr`, `description_fr`, `keyword_fr`) are bound in the corresponding Rust INSERT statements — spot-check by verifying non-null values for known translated units after import
- [ ] **Alias count not growing from pipeline fixes:** aliases.json entry count is not higher than 44 as a result of pipeline improvement work — new entries must have documented justification
- [ ] **Source versions documented:** Audit notes contain exact Wahapedia date, BSData commit, and GW app version used for each faction before first comparison

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| FTS5 stale after manual SQLite edits | LOW | Run `pnpm build:udb` — even without data changes, the version hash will be the same, so bump any count by 1 in the JSON header to force re-import |
| Sub-faction filter drops generic units (shipped) | MEDIUM | Hotfix: update filter predicate in all three surfaces to include `sub_faction IS NULL`; rebuild; ship patch release |
| French key mismatch after name correction | LOW | Find old key in `translations_fr.json`, update to new name, rebuild — `frWeapons` count must match previous |
| Coverage regression after BSData update | MEDIUM | Check `coverage-report.json` unmatched_units list; add aliases or update FACTION_MAP for new catalogue names |
| Rust INSERT missing column after pipeline change | HIGH | No migration needed (udb_* tables are fully replaced on import); update the INSERT binding, rebuild JSON, ship new app version |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| FTS5 stale after pipeline fixes | Every pipeline fix phase | `SELECT COUNT(*) FROM udb_search` == `SELECT COUNT(*) FROM udb_units` after rebuild |
| Sub-faction drops parent-faction generics | Sub-faction filtering fix phase | Select Blood Angels in DB browser; confirm Tactical Squad visible |
| Audit source version skew | Pre-audit scoping phase | Source versions documented in audit notes before first comparison |
| aliases.json masking pipeline bugs | Pipeline improvement phase | Alias-match count in build output checked before adding any new entry |
| French key rot after name corrections | Pipeline improvement phase | `frWeapons` count in build output >= previous count after every fix |
| Rust INSERT column mismatch | Any phase that adds a JSON field | New field is non-null for a known translated unit after re-import |

---

## Sources

- Direct inspection: `scripts/build-unit-db.ts` — multi-pass matching, alias loading, French overlay application, version hash, coverage report
- Direct inspection: `src-tauri/src/lib.rs` — `import_unit_database_inner` DELETE-all + re-INSERT, FTS5 rebuild query, version check early-exit, Rust INSERT statements
- Direct inspection: `src/db/queries/unitDatabase.ts` — `getUdbUnitIdsBySubFaction`, `getUdbUnitsByFaction`, FTS5 `searchUdbUnits`, `getUdbOwnershipByFaction`
- Direct inspection: `src-tauri/migrations/038_udb_schema.sql` and `041_udb_sub_faction_fr.sql`
- Direct inspection: `scripts/data/aliases.json` — 44 existing entries; pattern analysis of alias types
- Direct inspection: `scripts/lib/factionMap.ts` — FACTION_MAP and SUB_FACTION_MAP (17 entries)
- PROJECT.md milestone history — boot-loop incident documented in migration 038 comment; decisions log patterns

---
*Pitfalls research for: HobbyForge v0.4.5 — data quality audit, pipeline improvement, sub-faction filtering*
*Researched: 2026-06-02*
