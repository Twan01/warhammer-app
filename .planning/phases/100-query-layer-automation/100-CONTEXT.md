# Phase 100: Query-Layer Automation - Context

**Gathered:** 2026-05-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Recipe completion automatically derives painting statuses and activates project tracking. When recipe sections complete, the query layer updates `status_assembly`, `status_basing`, and `status_varnished` on the unit without manual intervention. Assigning a recipe auto-sets `is_active_project`. No UI changes beyond wiring StatusPopover to set override flags — this is pure query-layer logic.

</domain>

<decisions>
## Implementation Decisions

### Manual-Override Guard (SAD-04)
- **D-01:** Add 3 boolean override columns to the units table via new migration: `status_assembly_override INTEGER DEFAULT 0`, `status_basing_override INTEGER DEFAULT 0`, `status_varnished_override INTEGER DEFAULT 0`. When `syncDerivedStatuses()` runs, it checks each override flag before writing the corresponding status. If override = 1, the auto-derived value is skipped for that status.
- **D-02:** StatusPopover (and any UI surface that lets the user manually set `status_assembly`, `status_basing`, or `status_varnished`) must set the corresponding `_override` column to 1 at the same time. This marks the status as user-controlled.
- **D-03:** Override flags are NOT auto-cleared. Once the user manually sets a status, auto-derivation is permanently disabled for that field on that unit unless the user explicitly resets it. This prevents surprising overwrites.

### SECTION_TYPES Vocabulary (SAD-03)
- **D-04:** Extend the `SECTION_TYPES` const array in `src/types/recipeSection.ts` with `'assembly'`, `'basing'`, and `'varnish'` — 10 total values. This gives recipe authors explicit dropdown options for tagging sections that drive auto-derivation.
- **D-05:** The existing `'finishing'` type remains as-is (not repurposed as varnish). `'varnish'` is the explicit trigger for `status_varnished` derivation.

### Assembly Auto-Derivation (SAD-01)
- **D-06:** `syncDerivedStatuses()` gains an assembly check that mirrors the existing basing/varnish pattern: query recipe sections with `section_type = 'assembly'` (or name-LIKE fallback for NULL section_type), check if all steps in those sections are complete, and set `status_assembly = 1` on the unit.

### Basing/Varnish Migration to section_type (SAD-02)
- **D-07:** `syncDerivedStatuses()` switches from `LOWER(sec.name) LIKE '%basing%'` to `sec.section_type = 'basing'` with a fallback: `OR (sec.section_type IS NULL AND LOWER(sec.name) LIKE '%basing%')`. Same dual-path for varnish: `sec.section_type = 'varnish' OR (sec.section_type IS NULL AND LOWER(sec.name) LIKE '%varnish%')`. This preserves backward compatibility for pre-v0.2.9 recipes while preferring the typed field.

### Active Project Lifecycle (APL-01, APL-02, APL-03)
- **D-08:** `createAssignment()` and `bulkCreateAssignments()` in `recipeAssignments.ts` set `is_active_project = 1` on the target unit immediately after the INSERT. No separate function needed — it's a one-liner UPDATE in the same call path.
- **D-09:** Auto-clear: when `syncDerivedStatuses()` detects `painting_percentage = 100` (all recipe steps complete), it sets `is_active_project = 0`. This satisfies APL-02. The race condition concern (Pitfall 3 from research) only applies to mid-workflow toggling — at 100% the recipe is done.
- **D-10:** APL-03 session guard: if the user manually toggled `is_active_project` via the collection page checkbox within the current sync call, do NOT overwrite. Implementation: compare the current DB value before writing — if it was manually set to 0 by the user but auto-derive wants 1 (or vice versa), respect the manual value. The override column pattern from D-01 could optionally extend to `is_active_project_override`, but the simpler approach is: auto-set on recipe assign (always), auto-clear on 100% (always), manual toggle wins within the same session. The key insight: auto-set happens at a discrete event (recipe assign), not on every sync. Auto-clear happens at completion. Between those events, the user's manual toggle stands.

### Claude's Discretion
- Query consolidation: whether to combine the assembly/basing/varnish checks into a single SQL query or keep them as separate queries in `syncDerivedStatuses()` — optimize for clarity first, performance if needed
- Error handling: whether derivation failures should silently log or surface a toast — recommended: silent log since this is background automation
- Test strategy: unit tests for `syncDerivedStatuses()` covering each derivation path and override guard

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — SAD-01 through SAD-04, APL-01 through APL-03 requirement definitions
- `.planning/ROADMAP.md` §Phase 100 — Success criteria (5 acceptance checks)

### Key Source Files
- `src/db/queries/recipeAssignments.ts` — Contains `syncDerivedStatuses()`, `syncPaintingPercentageByUnitId()`, `createAssignment()`, `bulkCreateAssignments()` — the primary modification target
- `src/types/recipeSection.ts` — `SECTION_TYPES` const array to extend
- `src/types/unit.ts` — Unit interface (add override columns to type after migration)
- `src/features/units/StatusPopover.tsx` — Must wire override flag on manual status changes
- `src/hooks/useUnits.ts` — Unit mutation hooks (updateUnit already exists)

### Prior Decisions (STATE.md)
- Manual-override guard is Pitfall 1 — must ship before any auto-derive
- `is_active_project` auto-set ONLY on recipe assign; never auto-clear race condition is Pitfall 3
- `SECTION_TYPES`: add 'assembly', treat 'finishing' as varnish trigger (overridden by D-05: explicit 'varnish' type instead), name-LIKE fallback for pre-v0.2.9

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `syncDerivedStatuses()` in `recipeAssignments.ts:211` — existing function already handles basing/varnish derivation; extend it with assembly + override guards
- `percentageToStatus()` in `recipeAssignments.ts:198` — maps painting_percentage to PaintingStatus string; already called by syncDerivedStatuses
- `SECTION_TYPES` in `recipeSection.ts:6` — 7-element const array; add 3 more values
- `StatusPopover` in `StatusPopover.tsx` — currently handles `status_painting` only; needs to handle boolean status overrides too (or delegate to existing toggle UI)

### Established Patterns
- Boolean columns stored as `0 | 1` integers with SQLite — cast on read, pass ternary on write
- Migrations auto-run at app start in filename order; new migration adds override columns
- `syncDerivedStatuses()` is called after every step progress upsert via `syncPaintingPercentageFromAssignment()` → `syncPaintingPercentageByUnitId()` — the derivation chain is already wired
- Parameterized queries use `$1, $2` positional syntax

### Integration Points
- `createAssignment()` and `bulkCreateAssignments()` — add `is_active_project = 1` write after INSERT
- `syncDerivedStatuses()` — add assembly check, switch basing/varnish to section_type, add override guards, add auto-clear at 100%
- Unit type in `src/types/unit.ts` — add 3 override boolean fields to interface
- StatusPopover or unit update hooks — set override flags on manual changes

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. All behavior is defined by the success criteria and decisions above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 100-Query-Layer Automation*
*Context gathered: 2026-05-28*
