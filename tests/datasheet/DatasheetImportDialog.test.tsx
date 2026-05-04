/**
 * Phase 15 — DatasheetImportDialog component tests (Wave 0 stubs).
 *
 * STATUS: skipped. Plan 15-04 will:
 *   1. Create src/features/units/DatasheetImportDialog.tsx — Dialog showing a per-field
 *      "Keep yours / Use datasheet" toggle for every conflicting field; default choice "use".
 *   2. Replace each `it.skip` below with `it`.
 *   3. Add real assertions matching 15-VALIDATION.md row 15-03-02.
 */
import { describe, it } from "vitest";

describe("DatasheetImportDialog — Wave 0 stubs", () => {
  it.skip("DS-08: renders one field row per conflict; each row shows current value, incoming value, and Keep/Use buttons", () => {
    // Plan 15-04 will:
    //   - const conflicts = [
    //       { key: "M", label: "M", currentValue: "5", incomingValue: "6", choice: "use" },
    //       { key: "T", label: "T", currentValue: "4", incomingValue: "4", choice: "use" }, // would be filtered before reaching dialog
    //       { key: "abilities", label: "Personal Ability Notes", currentValue: "Old text", incomingValue: "Imported text", choice: "use" },
    //     ]
    //   - render <DatasheetImportDialog open={true} conflicts={conflicts} onConfirm={vi.fn()} onClose={vi.fn()} />
    //   - assert screen.getAllByRole("button", { name: "Keep" }).length === 3 (one per row)
    //   - assert screen.getAllByRole("button", { name: "Use datasheet" }).length === 3
    //   - assert screen.getByText("Yours: 5") is in document (M current value display)
    //   - assert screen.getByText("Datasheet: 6") is in document
    //   - assert screen.getByRole("button", { name: "Apply import" }) is in document
    //   - assert screen.getByRole("button", { name: "Discard changes" }) is in document
  });

  it.skip("DS-08: every row defaults to choice = 'use' (Use datasheet button shows variant='default'); clicking 'Keep' on a row flips that row's choice and visual state", () => {
    // Plan 15-04 will:
    //   - render dialog with 1 conflict row, choice: "use"
    //   - assert the "Use datasheet" button has data-variant="default" or className containing "bg-primary"
    //   - assert the "Keep" button has variant="outline" (lighter visual)
    //   - fireEvent.click(screen.getByRole("button", { name: "Keep" }))
    //   - re-query and assert the "Keep" button now shows the variant="default" style
    //   - click "Apply import" — assert onConfirm called with the resolved selections (e.g. { M: "keep", ... })
  });
});
