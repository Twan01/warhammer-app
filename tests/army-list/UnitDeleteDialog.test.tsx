/**
 * ARMY-05 — Wave 0 stub tests for the enhanced UnitDeleteDialog.
 *
 * STATUS: skipped. Plan 08-04 will:
 *   1. Enhance src/features/units/UnitDeleteDialog.tsx to query
 *      getArmyListsByUnitId(unit.id) when open && unit !== null.
 *   2. Replace `describe.skip` below with `describe`.
 *   3. Add real `render`, `screen`, and `userEvent` assertions matching
 *      08-UI-SPEC.md §Enhanced UnitDeleteDialog and §Copywriting Contract.
 *
 * The stub exists in Wave 0 so the Nyquist sampling rate
 * (`pnpm test` after every task in plans 02–04) has a concrete failing
 * target to flip green.
 */
import { describe, it } from "vitest";

describe.skip("UnitDeleteDialog (army list membership) — ARMY-05", () => {
  it("normal state: when unit is in 0 army lists, renders simple confirm with 'Delete unit?' title and 'Delete' button (unchanged from base behavior)", () => {
    // Plan 04 will:
    //   - Mock getArmyListsByUnitId to return []
    //   - Render <UnitDeleteDialog open unit={mockUnit} onClose={vi.fn()} />
    //   - Assert screen.getByText("Delete unit?") and getByRole("button", { name: "Delete" })
  });

  it("warning state: when unit is in 2 army lists, renders 'This unit is in active army lists' title, lists the names, and shows a 'Delete Anyway' destructive button", () => {
    // Plan 04 will:
    //   - Mock getArmyListsByUnitId to return [{ id: 1, name: "My 1000pt List" }, { id: 2, name: "Starter Game" }]
    //   - Render the dialog open
    //   - Assert screen.getByText("This unit is in active army lists")
    //   - Assert the body contains "My 1000pt List" AND "Starter Game"
    //   - Assert getByRole("button", { name: "Delete Anyway" }) exists with destructive variant
    //   - Assert getByRole("button", { name: "Keep Unit" }) exists
  });
});
