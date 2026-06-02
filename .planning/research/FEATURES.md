# Feature Research

**Domain:** Warhammer 40K unit database — data quality audit, pipeline validation, sub-faction hierarchy fix
**Researched:** 2026-06-02
**Confidence:** HIGH (based on direct codebase analysis of build-unit-db.ts, factionMap.ts, applyUdbFilters.ts, and unitDatabase.ts query layer)

---

## Context

This is a **subsequent milestone** for an existing v0.4.2 app. The canonical unit database
(1,711 units, 25 factions) is already shipped. Three feature areas are targeted:

1. **Data audit** — systematically compare priority faction data against official sources and find errors
2. **Pipeline improvement** — fix build-unit-db.ts so audit-found errors don't recur on next rebuild
3. **Sub-faction hierarchy** — sub-faction selection shows sub-faction units AND parent faction's generic units

---

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Sub-faction filter shows parent units | Selecting "Ultramarines" currently hides all Tactical Marines, Dreadnoughts, Aggressors — generic SM units with `sub_faction IS NULL`. Any sub-faction filter that hides half the army is broken. | LOW | One-line predicate fix in `applyUdbFilters.ts`: `null OR match` instead of strict equality. Same fix needed in `UnitPickerDialog` and collection filter. Confirmed in source: line 28 of applyUdbFilters.ts does a hard `!== selectedFilter`. |
| Points correctness for Space Marines, Necrons, Death Guard | These are the played factions. Wrong points directly break army list totals, army list validation, and Game Day readiness. | MEDIUM | Cross-ref unit_database.json values against Wahapedia Datasheets_points CSV. Flag any unit where the value differs. |
| Stats/weapons/keywords correctness for 3 priority factions | A wrong Save value or missing keyword makes PlaybookTab and Game Day actively misleading during a game. | MEDIUM | Cross-ref `udb_unit_models` and `udb_unit_weapons` against current Wahapedia CSV rows. |
| Pipeline fixes applied before final rebuild | Audit is wasted effort if the same errors reappear on the next `pnpm build:udb`. Fixes go into aliases.json, factionMap.ts, or parsing code. | MEDIUM | Targeted changes only — each discovered error class gets one pipeline fix. |
| Roles and keywords audit for 3 factions | Role classification (Infantry/Vehicle/Monster/etc.) drives filter presets in the DB browser and army list picker. Wrong role = unit disappears from valid filter results. | LOW | Keyword audit is fast because Datasheets_keywords.csv is ground truth. Compare against stored keywords. |

### Differentiators (Adds Real Value Beyond Table Stakes)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| French translation audit for 3 factions | The bilingual toggle and COALESCE query layer already exist (shipped in v0.4.2). Auditing which units have null or wrong `name_fr`/`description_fr` and filling gaps completes the feature for played factions. | MEDIUM | Cross-ref translations_fr.json against unit list for SM, NEC, DG. Manual additions for missing entries. |
| Match rate improvement beyond 96.9% | 51 unmatched units currently have null points. Those units show "no points" in army lists. Analysis of coverage-report.json reveals which ones fail and why. | MEDIUM | Most will need new aliases in aliases.json or a CROSS_FACTION_MAP entry. Some may need parsing fixes. |
| Audit script as persistent developer artifact | An audit script that can be re-run enables before/after comparison: run audit, apply fixes, rebuild, re-run audit, verify improvement. Without it, audit is one-time manual work that can't be verified. | LOW | New `scripts/audit-unit-db.ts` that reads unit_database.json + CSV + translations_fr.json; outputs structured discrepancy list per unit per faction. Pattern follows existing coverage-report.json. |
| Sub-faction UI label clarity | When "Ultramarines" is selected and generic SM units appear, the filter label or empty-state copy should confirm that parent faction units are included by design — not a missing filter. | LOW | Cosmetic change to dropdown label/tooltip. Optional. |

### Anti-Features (Avoid These)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full audit of all 25 factions | Seems thorough | 1,711 units is weeks of manual cross-referencing for factions the user never plays. Value is zero for non-played armies. | Audit only SM, NEC, DG. Treat other factions as best-effort until the user expands armies. |
| UI-level manual stat/weapon editing for found errors | Seems like a quick shortcut | Creates a second source of truth diverging from the build pipeline. Audit findings should fix the build pipeline, not be patched one-by-one via override UI. The existing override system is for user customizations, not data errors. | Fix the pipeline. Re-run `pnpm build:udb`. The canonical database is the source of truth. |
| Automated web scraping for fresher data | "Always up to date" | Breaks offline-first; fragile to Wahapedia DOM changes; the CSVs are already the correct input source. | Update CSVs when GW releases new data; run `pnpm build:udb`; ship a new app version. |
| Sub-faction stored as a relational parent_id hierarchy | "Proper data model" | The 17-entry SUB_FACTION_MAP is already correct and complete for the 40K data topology. Adding a foreign key parent relationship creates join complexity without providing any new capability. The fix needed is a predicate change, not a schema change. | Keep SUB_FACTION_MAP; fix the filter logic to OR-in null sub_faction rows. |
| Real-time points sync against Wahapedia during gameplay | "Always current points" | Breaks offline-first; breaks local-first; adds network dependency; incompatible with the privacy model. | Updates ship as new app releases. User controls when to update. |

---

## Feature Dependencies

```
[Sub-faction filter fix — applyUdbFilters.ts + UnitPickerDialog + collection]
    No prerequisites. Ship independently as first change.

[Audit script (scripts/audit-unit-db.ts)]
    └──requires──> Wahapedia CSVs present in scripts/data/
    └──requires──> unit_database.json already built
    └──requires──> translations_fr.json present (for FR audit)

[Points audit for SM / NEC / DG]
    └──requires──> Audit script OR manual CSV cross-ref
    └──produces──> List of units with wrong/missing points

[Stats/weapons/keywords audit for SM / NEC / DG]
    └──requires──> Audit script OR manual CSV cross-ref
    └──produces──> List of units with wrong stat lines or missing keywords

[French translation audit for SM / NEC / DG]
    └──requires──> translations_fr.json present
    └──produces──> List of units with null or incorrect _fr fields

[Pipeline fixes — aliases.json, factionMap.ts, parseCsv.ts / parseXml.ts]
    └──requires──> Audit findings identify which errors exist and why
    └──produces──> Corrected build pipeline

[Final rebuild — pnpm build:udb]
    └──requires──> All pipeline fixes committed
    └──requires──> All translations_fr.json additions committed
    └──produces──> Updated unit_database.json shipped in next app release
```

### Dependency Notes

- **Sub-faction filter fix is fully independent.** The predicate change in `applyUdbFilters.ts` requires zero audit or pipeline work. It should ship first.

- **Audit before pipeline fix.** The audit identifies exactly which units have wrong data and why. Running the pipeline fix speculatively (without audit findings) risks making changes that don't address the actual errors.

- **Pipeline fix before final rebuild.** All alias additions and parsing fixes must be committed before running `pnpm build:udb` to produce the corrected database that ships with the release.

- **French audit is parallel.** It does not depend on points/stats/keywords audit. Both can be worked in the same pass through the three factions.

---

## MVP Definition

### Ship in This Milestone (v0.4.5)

- [x] Sub-faction filter fix — include parent units when sub-faction selected — fixes a broken UX for all sub-faction usage
- [x] Data audit for Space Marines, Necrons, Death Guard (points, stats, weapons, keywords, roles, FR translations)
- [x] Fix all errors found during audit via targeted pipeline improvements (aliases, parsing, factionMap additions)
- [x] Rebuild unit_database.json with all fixes applied and ship with the release

### Add After Validation (future)

- [ ] Automated regression tests comparing unit_database.json values against CSV inputs — catch regressions when GW updates data
- [ ] Audit remaining 22 factions — only meaningful if user expands to more armies

### Future Consideration (v2+)

- [ ] UI-level audit dashboard powered by coverage-report.json — browse data quality per faction
- [ ] Community-sourced translation contributions for French ability text

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Sub-faction filter: include parent units | HIGH — broken UX for all sub-faction browsing | LOW — predicate change in 2-3 files | P1 |
| Points audit + fix (SM, NEC, DG) | HIGH — wrong points break army list totals and validation | MEDIUM — systematic cross-ref + alias additions | P1 |
| Stats/weapons audit + fix (SM, NEC, DG) | HIGH — wrong stats break PlaybookTab and Game Day reference | MEDIUM — similar cross-ref effort | P1 |
| Keywords/roles audit + fix (SM, NEC, DG) | HIGH — wrong role hides units from filter presets | LOW — fast CSV cross-ref | P1 |
| Pipeline fixes committed before rebuild | HIGH — prevents same errors recurring | MEDIUM — targeted changes per error class | P1 |
| French translation audit + fill (SM, NEC, DG) | MEDIUM — bilingual feature already shipped; null FR fields are gaps not crashes | MEDIUM — manual translations_fr.json additions | P2 |
| Match rate improvement beyond 96.9% | MEDIUM — 51 units missing points, most in non-played factions | MEDIUM — coverage-report analysis + targeted aliases | P2 |
| Audit script as reusable developer tool | LOW (developer utility only) | LOW — follows coverage-report.json pattern | P3 |

---

## Where Each Fix Lives in the Codebase

This is a data-quality milestone, not a UI feature milestone. Changes are concentrated in:

| Area | Files Affected | Nature of Change |
|------|---------------|-----------------|
| Sub-faction filter fix | `src/features/unit-database/applyUdbFilters.ts` | Predicate: `null OR match` instead of strict equality (line 28) |
| Sub-faction filter — army list picker | Wherever `sub_faction` filtering is applied in UnitPickerDialog or equivalent | Same predicate fix |
| Sub-faction filter — collection browser | Collection filter for sub_faction | Same predicate fix |
| Audit script | `scripts/audit-unit-db.ts` (new file) | Reads unit_database.json + CSV; outputs discrepancy list |
| Alias additions | `scripts/data/aliases.json` | New key-value pairs for unmatched/wrong-name units |
| French translations | `scripts/data/translations_fr.json` | New/corrected entries for SM, NEC, DG units |
| Parsing fixes | `scripts/build-unit-db.ts`, `scripts/lib/parseXml.ts`, `scripts/lib/parseCsv.ts` | Fix specific parsing bugs found during audit |
| Cross-faction mapping additions | `scripts/lib/factionMap.ts` | New CROSS_FACTION_MAP or FACTION_MAP entries for catalogue boundary cases |
| Rebuilt database | `src-tauri/data/unit_database.json` | Output of `pnpm build:udb` after all fixes; checked in and ships with release |

---

## Sources

- Direct codebase analysis: `scripts/build-unit-db.ts` (pipeline logic), `scripts/lib/factionMap.ts` (SUB_FACTION_MAP, 17 entries), `src/features/unit-database/applyUdbFilters.ts` (sub-faction predicate bug confirmed at line 28), `src/db/queries/unitDatabase.ts` (sub_faction field in UdbUnitSummary and SQL queries)
- `scripts/data/coverage-report.json` — build pipeline coverage output documenting current 96.9% match rate and 44 aliases
- PROJECT.md v0.4.5 milestone section (active requirements)
- Domain knowledge: Wahapedia CSV structure (Datasheets.csv, Datasheets_models.csv, Datasheets_keywords.csv, Datasheets_wargear.csv, Datasheets_abilities.csv), BSData wh40k-10e repository catalogue structure

---

*Feature research for: v0.4.5 Data Quality Audit, Pipeline Improvement & Sub-faction Hierarchy*
*Researched: 2026-06-02*
