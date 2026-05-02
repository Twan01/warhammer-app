/**
 * Phase 9 — PlaybookTab component tests (Wave 0 stubs).
 *
 * Each describe block maps to one STRAT-0X requirement from 09-VALIDATION.md
 * §Per-Task Verification Map. Every it() is currently it.skip() with a TODO
 * marker — Plan 09-01 Task 2 replaces each skip with the real test body
 * once src/features/units/PlaybookTab.tsx exists.
 *
 * Wave 0 contract (STATE.md 06-00 decision):
 *   - describe blocks named per VALIDATION.md -t filter strings
 *   - it.skip() filled in-place by later plans
 *   - no imports from the SUT (PlaybookTab) — added in Plan 09-01
 *   - vitest globals:true means describe/it/expect/vi are global
 */

describe("STRAT-01 — Playbook tab renders inside UnitDetailSheet", () => {
  it.skip("renders the Playbook tab trigger alongside the Details trigger", () => {
    // TODO: 09-01 — render UnitDetailSheet with a unit, expect tab triggers "Details" and "Playbook"
  });

  it.skip("switches to Playbook tab content on click without closing the sheet", () => {
    // TODO: 09-01 — click Playbook trigger, expect Playbook tab content visible, sheet still open
  });
});

describe("STRAT-02 — Stats block displays values with suffixes", () => {
  it.skip("renders six stat cells in order M, T, Sv, W, Ld, OC", () => {
    // TODO: 09-01 — render PlaybookTab, expect six labels in the documented order
  });

  it.skip("displays — placeholder when a stat value is null", () => {
    // TODO: 09-01 — mock useStrategyNote to return null fields, expect each cell shows "—"
  });

  it.skip("appends suffix at display time only (M=\", Sv/Ld/OC=+, T/W=raw)", () => {
    // TODO: 09-01 — mock useStrategyNote with move=6, toughness=4, save=3, wounds=2, leadership=7, objective_control=1; expect 6\", 4, 3+, 2, 7+, 1+
  });

  it.skip("enters edit mode when the Pencil button is clicked, switching cells to number inputs", () => {
    // TODO: 09-01 — click button with aria-label \"Edit stats\", expect 6 number inputs visible
  });
});

describe("STRAT-03 — Abilities and Keywords fields render", () => {
  it.skip("renders Abilities textarea with rows=3 and accepts user input", () => {
    // TODO: 09-01 — render PlaybookTab, find textarea by Abilities label, type, expect value updates
  });

  it.skip("renders Keywords single-line Input and accepts comma-separated text", () => {
    // TODO: 09-01 — render PlaybookTab, find Keywords input, type \"Infantry, Battleline\", expect value updates
  });
});

describe("STRAT-04 — Eight strategy note fields render in correct order", () => {
  it.skip("renders all 8 strategy note labels in the order specified by STRAT-04", () => {
    // TODO: 09-01 — render PlaybookTab, query labels in DOM order, expect:
    // Battlefield Role, Strengths, Weaknesses, Best Targets, Synergies,
    // Mistakes to Avoid, Rules Page References, Personal Notes
  });

  it.skip("each strategy note field is an editable textarea (rows=2)", () => {
    // TODO: 09-01 — for each of the 8 fields, expect a textarea sibling and that typing updates value
  });
});

describe("STRAT-05 — Save button dirty-state and inline save", () => {
  it.skip("Save button is disabled when no field has changed since load", () => {
    // TODO: 09-01 — mock useStrategyNote with loaded data, expect button \"Save Playbook\" disabled
  });

  it.skip("Save button enables after any field is edited", () => {
    // TODO: 09-01 — type into Abilities textarea, expect \"Save Playbook\" no longer disabled
  });

  it.skip("clicking Save calls upsertStrategyNote with full payload and shows success toast", () => {
    // TODO: 09-01 — spy on useUpsertStrategyNote.mutateAsync, click Save, expect mutateAsync called once
    //              with all 17 fields, toast.success called with \"Playbook saved\"
  });

  it.skip("on save error shows error toast and re-enables the Save button", () => {
    // TODO: 09-01 — mock mutateAsync to reject, click Save, expect toast.error \"Failed to save playbook — try again\",
    //              button re-enabled (isDirty stays true)
  });
});
