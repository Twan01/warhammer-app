---
slug: active-unit-loses-category
status: resolved
trigger: "when i select a unit to be the active one, it loses it's Category forever"
created: 2026-06-14
updated: 2026-06-14
---

# Debug Session: active-unit-loses-category

## Symptoms

- **Expected behavior:** Selecting a collection unit as the "active" one should not alter its data. The Battlefield Role / Category column should remain populated.
- **Actual behavior:** When a unit on the Collection page is set as active, its Category (datasheet battlefield role) column goes blank.
- **Where:** Collection page — setting an active unit/project.
- **Which field:** Battlefield role / Category column (datasheet category, e.g. Battleline, Character, Vehicle).
- **Persistence:** On app restart, every unit's Category comes back EXCEPT the currently-active one. The active unit's Category stays blank (appears permanently lost for that unit).
- **Error messages:** None reported.
- **Timeline:** Newly reported (another bug found during ongoing v0.5.x work).

## Current Focus

- hypothesis: CONFIRMED — handleToggleActive sends a partial UpdateUnitInput ({ id, is_active_project }); updateUnit's SQL binds category to `$4 = input.category ?? null` (NOT COALESCE), so the toggle overwrites category to NULL in the DB.
- next_action: change non-COALESCE direct-assignment columns in updateUnit to COALESCE($n, column) so partial updates preserve unspecified fields.
- reasoning_checkpoint:
    hypothesis: "Setting active runs updateUnit with a partial input; the UPDATE assigns category = $4 (input.category ?? null), nulling category for the toggled unit. Same applies to all other non-COALESCE columns."
    confirming_evidence:
      - "CollectionPage.tsx:150-151 calls updateUnit.mutate({ id, is_active_project }) — no category passed."
      - "units.ts:87 `category = $4` (direct assign, not COALESCE); units.ts:116 binds `input.category ?? null` => null when category omitted."
      - "UpdateUnitInput = Partial<CreateUnitInput> & { id } — partial updates are the documented contract, but SQL doesn't honor it for category/unit_type/points/priority/etc."
      - "getUnitsWithPoints SELECT u.* sources category directly from units table; restart shows NULL for the toggled (active) unit only."
    falsification_test: "If updateUnit used COALESCE for category, a partial toggle would not null it. Reproducing the toggle and re-reading the row would show category preserved."
    fix_rationale: "Switch direct-assignment columns to COALESCE($n, column) so omitted (undefined->null) fields are preserved. This makes updateUnit honor the partial-update contract."
    blind_spots: "Some columns may be intentionally nullable-on-edit via the full UnitSheet form (e.g. clearing category). Need to confirm the edit form always sends complete field set so COALESCE doesn't block intentional clears."

## Evidence

- timestamp: 2026-06-14
  checked: src/features/units/CollectionPage.tsx handleToggleActive (lines 144-159)
  found: Toggling active calls updateUnit.mutate({ id: unit.id, is_active_project: next }) — only id and is_active_project in the input.
  implication: All other fields are undefined in the mutation input.

- timestamp: 2026-06-14
  checked: src/db/queries/units.ts updateUnit (lines 81-128)
  found: SQL assigns `category = $4`, `unit_type = $5`, `model_count = $6`, `owned_count = $7`, `points = $8`, `priority = $15`, dates, storage_location, main_image_path, notes, lore_notes, undercoat ALL as direct `= $n` (no COALESCE). Bindings use `input.X ?? null`, so omitted fields bind to NULL and overwrite the existing value. is_active_project itself uses COALESCE($14) so the toggle value is applied correctly while wiping the others.
  implication: Any partial update (like the active toggle) nulls every non-COALESCE field — category among them. Root cause of the symptom.

- timestamp: 2026-06-14
  checked: src/db/queries/units.ts getUnitsWithPoints + src/types/unit.ts
  found: category is a real column on units, read directly via SELECT u.*. Not a join/derived value.
  implication: A NULLed category column explains the permanent blank after restart for only the toggled unit.

- timestamp: 2026-06-14
  checked: all updateUnit callers (grep updateUnit.mutate / mutateAsync)
  found: MANY partial callers were silently nulling fields under the old SQL — KanbanBoard (is_active_project/status_painting), UnitDetailSheet (is_active_project), AddProjectPicker (is_active_project), TierManager (points/model_count), StatusPopover (status_painting), LogSessionSheet (status_painting), AssignmentChecklist (status_assembly). Only UnitSheet edit form sent a complete payload.
  implication: The bug was far broader than the active toggle. Moving a Kanban card, changing painting status, or confirming a tier all wiped category and other direct-assign fields. The dynamic-SET fix repairs every partial caller at once. UnitSheet still sends category:null explicitly for intentional clears, so COALESCE-style preservation would have broken clears — confirming the dynamic builder (present-key check) is the correct approach, not COALESCE.

## Eliminated

- hypothesis: The query path for the active unit drops/joins the category differently than for non-active units.
  evidence: getUnitsWithPoints reads category via SELECT u.* identically for all rows; no active-specific branch. The data is actually NULL in the DB, not a display artifact.
  timestamp: 2026-06-14

## Resolution

root_cause: updateUnit's UPDATE statement assigns category (and unit_type, model_count, owned_count, points, priority, target_completion_date, purchase_date, purchase_price_pence, storage_location, main_image_path, notes, lore_notes, undercoat) with direct `= $n` instead of COALESCE($n, column). handleToggleActive (and any other partial updateUnit caller) sends only { id, is_active_project }, so those fields bind to NULL and overwrite the stored values. The active unit's category is wiped to NULL in the DB.
fix: Rewrote updateUnit (src/db/queries/units.ts) to build the SET clause dynamically from UPDATABLE_UNIT_COLUMNS. A column is only written when its key is explicitly present in the input and not undefined; boolean columns are coerced to 0/1. Omitted keys are left untouched (preserving category etc.), while explicit nulls still clear a field. When only id is supplied, the write is skipped.
verification: |
  - Added regression test tests/collection/updateUnitPartial.test.ts (7 cases) — all pass: toggling is_active_project does not touch category; partial status change leaves category/points alone; booleans coerced to 0/1; explicit null still clears category; field omission verified; updated_at always set; id-only is a no-op.
  - pnpm exec tsc --noEmit: clean (EXIT 0).
  - Full suite: only pre-existing unrelated failure is tests/data-layer/migration-parity.test.ts (45 vs 44 migrations in lib.rs — no diff vs HEAD, untouched by this change).
  - Human verification PASSED (2026-06-14): user confirmed in-app that the active unit keeps its Category and it persists after restart.
files_changed:
  - src/db/queries/units.ts
  - tests/collection/updateUnitPartial.test.ts
