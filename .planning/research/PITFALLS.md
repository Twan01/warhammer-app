# Pitfalls Research

**Domain:** Parameterized live-linked reusable template structures in a local-first SQLite desktop app (HobbyForge v0.7.0 Technique Library)
**Researched:** 2026-06-19
**Confidence:** HIGH — derived from the actual codebase, prior bug history (v0.2.13 DI-01/DI-02), and established Key Decisions

---

## Critical Pitfalls

### Pitfall 1 (TOP RISK): Step-Identity / Progress Corruption via Live Link

**What goes wrong:**
A technique edit adds, removes, or reorders `technique_steps`. If progress is still keyed by `recipe_step_id` (the materialized row that was copied at technique-apply time), those rows become stale references to deleted or reordered steps. The user sees completed steps become un-checked, or incompletable steps that no longer exist. This is the exact class of bug that drove v0.2.13 DI-01/DI-02 — where progress was originally keyed by `order_index`, causing reordering to silently move completion markers.

**Why it happens:**
The v0.2.13 fix stabilized identity by keying progress to `recipe_step_id` (migration 028). But the Technique Library changes the ground truth: if technique steps are materialized as `recipe_steps` rows at apply-time, a technique edit that rewrites those rows destroys the identity anchor. If technique steps are NOT materialized (preferred: steps remain as `technique_steps` and are resolved at read-time), then `unit_recipe_step_progress.recipe_step_id` no longer points to a real row at all.

**How to avoid:**
Do not materialize technique steps as `recipe_steps` rows. Keep them in `technique_steps` and resolve them to a virtual step list at query time via JOIN. Progress must key to `technique_step_id` (a stable integer on the technique), never to a materialized copy row. The `unit_recipe_step_progress` table must gain a `technique_step_id` column (nullable) alongside `recipe_step_id` (also nullable), with a CHECK constraint that exactly one is non-NULL. Propagation of a technique edit must never change existing `technique_step_id` values — only INSERT new rows for added steps and DELETE progress rows whose `technique_step_id` is no longer in the technique (soft-signal: mark them orphaned in the UI rather than CASCADE-delete, so the user sees "this step was removed from the technique"). The `unit_recipe_step_progress` table rebuild must follow the migration 028 pattern exactly (PRAGMA foreign_keys = OFF; CREATE new; INSERT INTO new SELECT; DROP old; RENAME).

**Warning signs:**
- Any query that JOINs `unit_recipe_step_progress` directly to `recipe_steps` without accounting for technique-sourced steps
- Any save path that deletes and re-inserts `technique_steps` rows (regenerating new IDs)
- Tests that reorder technique steps and do not assert that progress is unchanged

**Phase to address:**
Schema foundation phase (first phase of v0.7.0). This constraint must be encoded in the migration itself, not discovered later. The `unit_recipe_step_progress` schema change and the decision to keep technique steps non-materialized must be locked before any UI is written.

---

### Pitfall 2: Live-Link Propagation Silently Mutates Many Recipes

**What goes wrong:**
Editing a technique's structure (add/remove/rename a section, add/remove/reorder a step, change a step's phase/tool/dilution/time) propagates to every recipe that uses that technique without any per-recipe confirmation. With no "from technique X" provenance visible, the user cannot tell why their recipe changed. Worse, propagation runs implicitly on the next read (lazy re-join) rather than as an explicit transaction, so partial propagation is possible if the app crashes mid-sync.

**Why it happens:**
Developers assume "live link = JOIN at read time = free propagation." That's true for display, but it hides two sub-traps: (1) step-level data like `painting_phase`, `tool`, `technique_text`, `dilution`, `time` all come from the technique row — any change is immediately reflected in all recipe timelines, Painting Mode, and session logging, with no audit trail; (2) slot-fill colour maps are per-recipe but step structure is per-technique — a structural change to a technique section (e.g. renaming a section) hits every recipe simultaneously and cannot be per-recipe overridden without a detach.

**How to avoid:**
Treat structural propagation as an explicit operation with a change summary. When a technique is saved with structural changes (steps added/removed, sections reordered), surface a one-time "N recipes will be affected" confirmation. For the lazy-JOIN approach this is a read-side concern: the read query must produce a stable, ordered step list that Painting Mode and progress resolution can walk deterministically. Never delete-and-reinsert `technique_steps` rows on save — use the established five-phase diff pattern from `saveRecipeGraph` (DI-04) to preserve step IDs.

**Warning signs:**
- No "from technique X" badge visible on recipe sections/steps that came from a technique
- No detach option on technique-sourced recipe sections
- Technique save using DELETE-all + re-INSERT for technique_steps (destroys step ID stability)

**Phase to address:**
UX safety-rails phase. The "from technique X" badge and detach/override escape hatch are not cosmetic — they are the user's only signal that a recipe section is live-linked. Must ship before technique-linked recipes are used in Painting Mode.

---

### Pitfall 3: Unfilled Colour Slots After Slot Addition / Orphaned Fills After Slot Removal

**What goes wrong:**
A technique defines slots (e.g. "Glow Core", "Glow Mid", "Glow Edge"). Each recipe that uses the technique has its own `technique_slot_fills` map (slot → real paint). When a new slot is added to the technique, every existing recipe's slot map has a gap for that slot — it resolves to NULL paint. When a slot is removed from the technique, every recipe's fill for that slot is now orphaned (the slot no longer exists, but the fill row still references it). Neither condition is caught at save time or at recipe-display time without explicit validation.

**Why it happens:**
Slot-fill maps are stored as (recipe_id, technique_id, slot_id → paint_id) rows. Schema can enforce that a slot_id must exist in `technique_slots` (FK), so orphaned fills throw on INSERT — but they do NOT throw on DELETE of the slot (fills become orphaned unless CASCADE is used). Unfilled slots are a read-time gap, invisible until the recipe is opened or paint availability is calculated.

**How to avoid:**
For slot removal: use ON DELETE CASCADE on `technique_slot_fills.slot_id` referencing `technique_slots.id`. This atomically removes fills when a slot is deleted. For slot addition: on every recipe-open that uses the technique, run a gap-check query (LEFT JOIN technique_slots ON slot_fills.slot_id IS NULL WHERE technique_id = ?) and surface unfilled slots as warnings (not blockers — paintless steps already work per REC-01). The paint availability calculation must treat unfilled slots as "paint unknown" (not "paint missing") to avoid false warnings.

**Warning signs:**
- `technique_slot_fills` has no FK ON DELETE CASCADE for the slot_id column
- Paint availability query does not account for NULL slot fills
- Painting Mode shows "missing paint" for a technique step whose slot is simply unfilled (different from an unknown paint)

**Phase to address:**
Schema foundation phase (CASCADE must be in the migration) and paint-availability integration phase (NULL slot-fill handling must be in the resolver, not patched in later).

---

### Pitfall 4: Paint-Availability and Apply-To-Units Break on Technique-Sourced Steps

**What goes wrong:**
The existing paint-availability calculation uses JOIN (not LEFT JOIN — Key Decision confirmed in v0.3.0) and counts only steps that have a non-NULL `paint_id`. Technique-sourced steps do not have a `paint_id` directly; they have a `slot_id` that maps via `technique_slot_fills` to a `paint_id`. If the availability query is not updated to resolve slots → paint_id, technique steps are excluded from the count entirely — making the recipe appear to have zero paints needed, or causing the "N of M paints owned" badge to undercount.

The same applies to: `apply-to-units` bulk flow, Painting Mode paint readiness warnings (PR-01/PR-03), and the `NextPaintingActionCard` on the dashboard.

**Why it happens:**
All four of those surfaces call the same paint-availability query path. The query was built assuming `recipe_steps.paint_id` is the source of truth. Adding technique steps as a new step "type" with an indirect paint resolution path breaks that assumption silently — the query still runs, it just silently excludes technique steps.

**How to avoid:**
Centralize paint resolution via a single SQL view or CTE that produces `(step_id, effective_paint_id)` for every step regardless of whether it is a plain step or a technique-sourced step. All four surfaces use this view. Existing test coverage for PR-01/PR-03 (paintless step handling) must be extended with technique-step variants that assert correct owned/missing counts.

**Warning signs:**
- Paint availability badge shows lower count after a technique is applied to a recipe
- Painting Mode says "0 paints needed" for a technique section
- `apply-to-units` does not show technique steps in the step checklist

**Phase to address:**
Integration phase (after schema and technique-step resolver are in place). Paint availability is touched last after the core data layer is stable.

---

### Pitfall 5: tauri-plugin-sql Cannot Nest Transactions — Propagation Across Many Recipes Fails

**What goes wrong:**
When a technique edit propagates to many recipes (e.g. running gap-checks for unfilled slots across all recipes, or batch-inserting new progress rows for a newly added technique step), the naive implementation wraps each recipe update in its own BEGIN/COMMIT. If the developer tries to wrap all of them in a single outer transaction via a helper function that itself issues BEGIN, the inner helper crashes — tauri-plugin-sql does not support nested transactions (Key Decision: "Flat inline SQL for transactions (no nested BEGIN) — tauri-plugin-sql cannot nest transactions; helper delegation with own BEGIN crashes"). The same applies to saveRecipeGraph variants extended for technique saves.

**Why it happens:**
The established pattern (saveRecipeGraph, completeStepWithSession) uses flat inline SQL for all multi-statement operations. When propagation logic is extracted into a reusable helper to share between the technique save path and the recipe sync path, the helper is tempting to wrap in its own BEGIN. The crash is not caught at compile time — it fails silently or throws a runtime error only when the outer transaction is active.

**How to avoid:**
Propagation logic must be expressed as SQL (FK CASCADE, ON DELETE CASCADE, a single UPDATE WHERE technique_id = ?) not as N sequential mutateAsync calls wrapped in a transaction. For operations that genuinely need a procedural loop (e.g. inserting gap-fill rows for unfilled slots across all recipe assignments), use INSERT INTO ... SELECT ... pattern in a single SQL statement. All multi-step operations remain flat inline SQL in the query function, following the saveRecipeGraph pattern exactly.

**Warning signs:**
- Any propagation helper that accepts a `db` connection and calls `db.execute("BEGIN")`
- Any loop that calls `mutateAsync` inside a try/finally with manual rollback logic
- Test for technique edit that uses multiple recipes but only asserts one recipe updated

**Phase to address:**
Schema foundation phase — the constraint "no helper-owned transactions" must be documented in the technique query module comment before any propagation logic is written.

---

### Pitfall 6: Migration / Data-Integrity Failures for New Technique Tables

**What goes wrong:**
Four failure modes cluster here:

1. **Editing an existing migration.** The migration parity check (`check:version` via prebuild hook, REL-04) compares migration file count against the Rust Migration{} array count and scans for CR bytes. If a developer fixes a bug by editing `051_technique_library.sql` instead of adding `052_fix.sql`, the CR-byte check catches it on dev but a user who already ran migration 051 will not re-run it — their DB stays broken.

2. **Missing FK CASCADE on orphan-prevention.** If `technique_sections` and `technique_steps` do not CASCADE on `technique_id` delete, and a recipe's slot fills do not CASCADE on slot delete, deleting a technique leaves orphan rows. The existing `PRAGMA foreign_keys = ON` in `client.ts` catches INSERT violations but not orphaned reads — the orphans sit silently.

3. **Backup/restore schema mismatch UX.** The backup restore pipeline validates schema version by counting migrations (Key Decision: "Schema version = migration count"). A backup created before v0.7.0 (50 migrations) restored into v0.7.0 (e.g. 55 migrations) shows "schema mismatch" and refuses. This is correct behavior, but the error message must explain "this backup is from an older app version" — not a generic "schema error."

4. **unit_recipe_step_progress table rebuild.** Adding a `technique_step_id` column (nullable) with a CHECK constraint (exactly one of recipe_step_id / technique_step_id is non-NULL) cannot be done with ALTER TABLE ADD COLUMN in SQLite — CHECK constraints require a table rebuild. Must follow the migration 028 pattern (PRAGMA foreign_keys = OFF; CREATE new table; INSERT INTO new SELECT; DROP old; RENAME).

**How to avoid:**
1. Never edit migrations after they ship. New fix = new migration file.
2. Use ON DELETE CASCADE throughout the technique table hierarchy (technique → technique_sections → technique_steps → technique_slot_fills; technique_slots → technique_slot_fills).
3. Ensure the restore pipeline error message is human-readable for version mismatch.
4. Use the migration 028 table-rebuild pattern for the unit_recipe_step_progress change.

**Warning signs:**
- Any migration that uses ALTER TABLE ADD COLUMN with a CHECK constraint
- technique_sections or technique_steps missing ON DELETE CASCADE
- Migration file count not incrementing after each new schema change

**Phase to address:**
Schema foundation phase. The table rebuild pattern (item 4) must be decided before the migration is written, not after.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Materialize technique steps as recipe_steps rows at apply-time | Simpler queries — no JOIN to technique tables | Technique edits require re-materializing all linked recipes; new IDs destroy progress | Never — keep technique steps in technique_steps, resolve via JOIN |
| Store slot fills as JSON blob on the recipe_technique_links row | No join table needed | Cannot query "which recipes use paint X via slot Y"; cannot CASCADE-delete on slot removal | Never — separate table with FK |
| Copy-on-apply (snapshot technique at apply time, no live link) | Simpler UI — no propagation risk | Violates the core v0.7.0 requirement (live link); user must manually re-apply every technique edit | Acceptable only as a per-recipe "detach" escape hatch, not the default |
| DELETE-all + re-INSERT for technique_steps on save | Simpler save code — no diff algorithm | Destroys technique_step_id stability; all progress keyed to technique_step_id is orphaned | Never — use the five-phase diff (saveRecipeGraph pattern) |
| Single fat migration for all technique tables | Fewer migration files | Hard to bisect if something breaks during the v0.7.0 schema phase; impossible to roll back partially | Acceptable — but split into logical units: (1) core technique tables, (2) progress table rebuild |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Painting Mode step navigation | Assumes recipe_steps is the source of all steps; technique steps not in that table are skipped | Step navigator queries the resolved step list (VIEW or CTE joining technique_steps through the slot fill) |
| Paint availability badge (RecipeCard, RecipeDetailPage) | Uses direct JOIN on recipe_steps.paint_id; technique steps have no paint_id, so technique sections count as zero | Resolve effective_paint_id via slot fill in a CTE before counting owned/missing |
| Log Session cascading selectors (recipe → section → step) | Section list hard-codes recipe_sections table; technique-sourced sections are not in that table | Section and step lists must query the resolved view that includes technique-sourced rows |
| Apply-to-units bulk flow | Copies recipe_step_id list at apply time; technique-derived steps have no recipe_step_id | Assignment uses resolved step list; progress rows created with technique_step_id when step is technique-sourced |
| Backup / restore | Worry about manually specifying which tables to include | SQLite VACUUM INTO copies all tables automatically — no action needed; just verify the schema version count increments correctly |
| saveRecipeGraph five-phase diff | Technique-linked sections look like ordinary sections to the diff; it may delete-and-recreate them on save | Technique-linked sections carry a technique_id marker; the diff must treat them as "update metadata only, never delete the link" |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| N+1 slot-fill resolution per step | Recipe with 20 technique steps fires 20 slot-fill queries | Resolve all slot fills for a recipe in one batch query (JOIN) before rendering | Any recipe with more than 5 technique steps |
| Per-recipe propagation loop on technique save | Saving a technique fires one UPDATE per recipe that uses it | Technique step metadata lives in technique_steps; the JOIN at read-time propagates it automatically — no per-recipe loop | Any technique used by more than 3 recipes |
| Full technique_steps table scan for step ordering | Steps rendered in insertion order (no order_index) | Always include ORDER BY section_order_index, step_order_index in the resolved step list query | Any technique with more than 1 section |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No "from technique X" provenance badge | User edits recipe structure, does not realize it is live-linked, is surprised when their technique changes affect other recipes | Show a labelled badge ("OSL Technique") on technique-sourced sections with a link to the technique and a "Detach" action |
| "Apply technique" name implies copy | User thinks "apply" = makes a copy; is surprised when editing the technique changes the recipe | Name the action "Use technique" not "Apply technique"; on the modal, prominently state "This section stays linked — editing the technique updates this recipe" |
| Deleting a technique that recipes depend on | Recipes silently lose all technique-sourced steps; progress rows CASCADE-delete; work lost | Block delete via RESTRICT FK (recipe_technique_links.technique_id → techniques.id), or show "N recipes use this — detach all before deleting?" |
| No detach / override escape hatch | User wants to customize one step in a technique section for one recipe; cannot without breaking the live link | Ship a per-section "Detach from technique" action that copies the technique section into a plain recipe section (one-way, irreversible, with confirmation) |
| Painting Mode shows slot name instead of paint | User is at step "Apply glow layer" and sees "Glow Core" not the actual paint name | Painting Mode step view must show the resolved paint (from slot fill), not the slot name |
| Unfilled slots treated as hard errors | Recipe has a technique applied but one slot is unfilled; Painting Mode blocks entry | Follow PR-03: unfilled slots are warnings, not blockers — show "slot not configured" inline and continue |

---

## "Looks Done But Isn't" Checklist

- [ ] **Technique edit propagation:** change technique step metadata (phase/tool/dilution/time) → open Painting Mode on a linked recipe → confirm new value is shown without re-applying the technique
- [ ] **Progress stability on technique step reorder:** reorder technique steps → open Painting Mode → confirm checked steps are still checked on the same logical steps (not shifted to adjacent ones)
- [ ] **Slot fill gap on slot add:** add a slot to a used technique → open each linked recipe → confirm "slot unfilled" warning appears, not a crash or silent omission
- [ ] **Cascade delete on slot removal:** remove a slot from a technique → verify `technique_slot_fills` rows for that slot are gone (ON DELETE CASCADE working)
- [ ] **Technique delete blocked:** attempt to delete a technique used by a recipe → confirm RESTRICT FK fires and the UI catches it with a meaningful toast (not generic "operation failed")
- [ ] **Backup includes new tables:** export backup after adding a technique → restore in fresh app → confirm techniques, sections, slots, steps, and slot fills are all present
- [ ] **Paint availability badge counts technique steps:** apply a technique with 3 steps needing paints, own all 3 → badge shows "3/3" not "0/3"
- [ ] **Log Session step selector includes technique steps:** with a technique-sourced recipe open in Log Session, technique steps appear in the step dropdown

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Progress corruption (technique_step_id missing or wrong) | HIGH | Migration required to re-key progress; without a snapshot of the original step order, user loses progress. Prevention is the only viable path |
| Orphaned slot fills (slot deleted, fills remain) | LOW | `DELETE FROM technique_slot_fills WHERE slot_id NOT IN (SELECT id FROM technique_slots)` — run as a diagnostic query surfaced in Data Health |
| Technique delete with linked recipes | MEDIUM | Restore from backup; or manually detach all links via SQL; the UI must prevent this case via RESTRICT FK |
| Transaction failure on technique save | LOW | tauri-plugin-sql auto-rolls back on error; retry without partial state |
| Schema mismatch on backup restore | LOW | Restore is blocked by the existing pipeline; user must use a compatible backup or upgrade app — error message must say "older backup" clearly |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Step-identity / progress corruption | Schema foundation (Phase 1 of v0.7.0) | Test: reorder technique steps → assert progress unchanged; test: add technique step → assert new progress row keyed by technique_step_id |
| Live-link propagation surprises | UX safety-rails phase | Test: edit technique step metadata → verify all linked recipes show updated value without re-apply; UAT: "from technique X" badge visible |
| Unfilled slot gaps + orphaned slot fills | Schema foundation (CASCADE) + paint-availability phase | Test: add slot → assert gap warning on linked recipe; remove slot → assert fill row deleted |
| Paint-availability broken for technique steps | Integration phase | Test: technique recipe shows correct owned/missing counts in RecipeCard badge and Painting Mode |
| Nested transaction crash | Schema foundation — document constraint in query module | Code review: any query helper that calls BEGIN is flagged; no helper-owned transactions |
| Migration / data-integrity failures | Schema foundation migration authoring | CI: migration parity check passes; data-layer test runs PRAGMA foreign_key_check on all new tables |
| UX mental model confusion / no detach | UX safety-rails phase | UAT: user can see technique provenance badge and detach without data loss |
| Technique delete with dependents | Schema + UI (RESTRICT FK) phase | Test: attempt delete of technique used by recipe → RESTRICT FK fires → UI shows "N recipes use this technique" |

---

## Sources

- HobbyForge `.planning/PROJECT.md` — Key Decisions table: recipe_step_id as progress key, no nested transactions, five-phase diff, saveRecipeGraph, ON DELETE CASCADE patterns, ON DELETE SET NULL patterns, JOIN (not LEFT JOIN) for paint availability
- `src-tauri/migrations/028_step_progress_identity.sql` — prior art for progress-key migration with CTE backfill and ROW_NUMBER deduplication; the exact pattern to follow for the unit_recipe_step_progress table rebuild
- `src-tauri/migrations/021_applied_recipe_assignments.sql` — original progress table schema (order_index key that migration 028 replaced; shows the failure mode)
- v0.2.13 requirements DI-01/DI-02 — the "completed step jumps" class of bug that motivates Pitfall 1
- v0.2.11 requirements REC-01/REC-02 — paintless step handling and non-destructive save (five-phase diff)
- v0.2.15 requirements PR-01/PR-03 — Painting Mode paint readiness: warnings not blockers, paintless step handling
- v0.7.0 milestone definition — live-link requirement, slot/role design, detach escape hatch, "from technique X" badge requirement

---
*Pitfalls research for: HobbyForge v0.7.0 Technique Library — parameterized live-linked reusable painting techniques*
*Researched: 2026-06-19*
