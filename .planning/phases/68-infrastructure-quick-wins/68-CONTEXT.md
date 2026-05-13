# Phase 68: Infrastructure Quick Wins - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase fixes four concrete infrastructure issues: (1) verify all migrations 001-021 are registered in lib.rs and produce correct schema on fresh install, (2) fix the COALESCE null-clearing bug on recipe section workflow metadata fields, (3) make recipe-level step queries section-aware so steps never interleave across sections, and (4) align package.json and tauri.conf.json version numbers to the current release. No new features, no UI changes, no new tables.

</domain>

<decisions>
## Implementation Decisions

### COALESCE Null-Clearing Fix (REC-03)
- **D-01:** The 4 workflow metadata fields (`section_type`, `technique`, `execution_mode`, `applies_to`) in `updateRecipeSection` must switch from `COALESCE($N, column)` to direct assignment (`column = $N`), matching the existing pattern used by `surface` and `notes` in the same function. This allows null to flow through and clear the value.
- **D-02:** The TypeScript caller must explicitly pass `null` (not `undefined`) for cleared fields. The existing `?? null` coercion in the parameter array already handles this — no caller changes needed.

### Section-Aware Step Ordering (REC-05)
- **D-03:** All recipe-level step queries (`getRecipeSteps` in `recipePaints.ts`, `getRecipeSectionsWithSteps` in `recipes.ts`) must JOIN on `recipe_sections` and ORDER BY `section.order_index ASC, step.order_index ASC` to guarantee section grouping. Steps without a section_id (legacy unsectioned recipes) sort last via `COALESCE(section.order_index, 999999)`.
- **D-04:** `duplicateRecipe` in `recipes.ts` line 167 has the same bug — step fetch uses `ORDER BY order_index ASC` without section awareness. Fix identically: JOIN + section-first ordering. The section copy pass (step 3-4) already handles section_id remapping correctly.
- **D-05:** The `getStepsWithPaints` query in `recipePaints.ts` (line 78) also needs section-aware ordering for the multi-recipe batch fetch path.

### Version Alignment (VER-01)
- **D-06:** Both `package.json` and `tauri.conf.json` currently show `0.2.7`. Update both to the version that reflects the current shipping state. The exact target version depends on whether v0.2.10 has shipped by the time this phase executes — researcher should check STATE.md/ROADMAP.md at planning time.

### Migration Registration (MIG-01, MIG-02)
- **D-07:** All 21 hobbyforge migrations and 3 rules migrations are already registered in `lib.rs` `get_migrations()` and `get_rules_migrations()`. Verification should confirm the file list matches the registration list — no gaps.
- **D-08:** Fresh install validation is a manual smoke test: delete the app data directory, launch the app, verify all tables exist with correct columns. No automated test in this phase (that's Phase 72's scope).
- **D-09:** `duplicateRecipe` section copy (line 159) does not copy the 4 workflow metadata columns (`section_type`, `technique`, `execution_mode`, `applies_to`). This should be fixed alongside the ordering fix since we're already touching that function.

### Claude's Discretion
- Whether to extract the section-aware ORDER BY clause into a shared SQL fragment or keep it inline in each query
- Whether to add a comment explaining the COALESCE-vs-direct-assignment distinction in recipeSections.ts
- Exact ordering of the 4 fixes within the plan (migration check first vs. COALESCE first)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Recipe Section Queries (COALESCE bug + ordering fix targets)
- `src/db/queries/recipeSections.ts` — updateRecipeSection lines 50-77: COALESCE null-clearing bug on 4 metadata fields
- `src/db/queries/recipePaints.ts` — getRecipeSteps (line 7) and getStepsWithPaints (line 78): step ordering without section awareness
- `src/db/queries/recipes.ts` — getRecipeSectionsForRecipe (line 151), getRecipeStepsForRecipe (line 168), duplicateRecipe (line 117): ordering bug + missing metadata columns in section copy

### Version Files
- `package.json` — version field (currently "0.2.7")
- `src-tauri/tauri.conf.json` — version field (currently "0.2.7")

### Migration Registration
- `src-tauri/src/lib.rs` — get_migrations() (versions 1-21) and get_rules_migrations() (versions 1-3)
- `src-tauri/migrations/` — 21 hobbyforge + 3 rules migration SQL files

### Requirements
- `.planning/REQUIREMENTS.md` — MIG-01, MIG-02, VER-01, REC-03, REC-05 definitions

### Prior Context
- `.planning/STATE.md` — Accumulated context section documents the COALESCE bug and duplicateRecipe ordering bug

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `updateRecipeSection` already uses direct assignment for `surface` and `notes` — same pattern extends to the 4 metadata fields
- `armyLists.ts` has a separate `clearPointsOverride` function that bypasses COALESCE — alternative pattern exists but direct assignment is simpler here

### Established Patterns
- SQL parameter binding uses `$1, $2` positional syntax (Tauri plugin-sql)
- COALESCE for "don't change if null" vs direct assignment for "null means clear" — well-established distinction in the codebase
- Migration registration: one `Migration { version, description, sql, kind }` struct per file in lib.rs

### Integration Points
- No UI changes — all fixes are in query modules and config files
- Step ordering fix affects any component that fetches steps at the recipe level (RecipeDetailSheet, RecipeFormSheet, SectionedTimeline)
- Version bump is a metadata-only change

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond the roadmap success criteria. Auto-mode selected recommended defaults for all gray areas based on existing codebase patterns and known bug documentation in STATE.md.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 68-Infrastructure Quick Wins*
*Context gathered: 2026-05-13*
