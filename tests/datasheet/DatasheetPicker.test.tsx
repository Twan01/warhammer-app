/**
 * Phase 15 — DatasheetPicker component tests (Wave 0 stubs).
 *
 * STATUS: skipped. Plan 15-04 will:
 *   1. Create src/features/units/DatasheetPicker.tsx — Dialog with autoFocus search input,
 *      faction-pre-filtered list (~200 datasheets), client-side substring filter.
 *   2. Replace each `it.skip` below with `it`.
 *   3. Add real assertions matching 15-VALIDATION.md row 15-03-01.
 */
import { describe, it } from "vitest";

describe("DatasheetPicker — Wave 0 stubs", () => {
  it.skip("DS-04: renders Dialog with the unit's faction name in DialogDescription and one button per pre-filtered datasheet row", () => {
    // Plan 15-04 will:
    //   - vi.mock("@/hooks/useDatasheet") — useDatasheetsByFaction returns
    //     [{ id: "001", name: "Intercessors", role: "Battleline" }, { id: "002", name: "Hellblasters", role: "Battleline" }]
    //   - render <DatasheetPicker open={true} factionId="SM" factionName="Space Marines" onSelect={vi.fn()} onSkip={vi.fn()} />
    //   - assert screen.getByText(/Searching Space Marines datasheets/) is in document
    //   - assert screen.getByText("Intercessors") is in document
    //   - assert screen.getByText("Hellblasters") is in document
    //   - assert screen.getByRole("button", { name: "Skip" }) is in document
  });

  it.skip("DS-04: search input filters list by case-insensitive substring match on the name field", () => {
    // Plan 15-04 will:
    //   - render with 3 datasheets (Intercessors, Terminators, Hellblasters)
    //   - fireEvent.change(searchInput, { target: { value: "term" } })
    //   - assert screen.queryByText("Intercessors") is null
    //   - assert screen.getByText("Terminators") is in document
    //   - clear input
    //   - assert screen.queryByText("Intercessors") is in document again
    //   - empty-state branch: type "zzz" → assert screen.getByText(/No datasheets found/) appears
  });
});
