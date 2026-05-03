/**
 * Phase 10 — FactionSummaryCard active-state tests (Wave 0 stubs).
 *
 * STATUS: skipped. Plan 10-02 will:
 *   1. Add `isActive: boolean` and `onActivate: () => void` props to
 *      src/features/dashboard/FactionSummaryCard.tsx.
 *   2. Add ring + "Active" badge when isActive === true.
 *   3. Replace `describe.skip` below with `describe`.
 *   4. Add real render + userEvent assertions matching the inline TODOs.
 *
 * The stub exists in Wave 0 so Plan 10-02 has a concrete failing target.
 */
import { describe, it } from "vitest";

describe.skip("FactionSummaryCard — THEME-03 (active selection UI)", () => {
  it("when isActive=true, renders the 'Active' badge and ring-faction-accent class", () => {
    // Plan 10-02 will:
    //   - render <FactionSummaryCard stat={mockStat} isActive={true} onActivate={vi.fn()} />
    //     wrapped in QueryClientProvider + RouterProvider (mirror tests/dashboard/DashboardPage.test.tsx pattern)
    //   - assert screen.getByText("Active") is in document
    //   - assert the Card root element has class "ring-2" AND "ring-faction-accent"
  });

  it("when isActive=false, does NOT render the 'Active' badge or ring class", () => {
    // Plan 10-02 will:
    //   - render <FactionSummaryCard stat={mockStat} isActive={false} onActivate={vi.fn()} />
    //   - assert screen.queryByText("Active") is null
    //   - assert the Card root does NOT have class "ring-2"
  });

  it("clicking the card calls onActivate exactly once", async () => {
    // Plan 10-02 will:
    //   - const onActivate = vi.fn();
    //   - render <FactionSummaryCard stat={mockStat} isActive={false} onActivate={onActivate} />
    //   - await userEvent.click(screen.getByRole("button", { name: /Tau/i }))
    //   - assert onActivate called exactly 1 time
  });

  it("pressing Enter on the focused card calls onActivate exactly once", async () => {
    // Plan 10-02 will:
    //   - const onActivate = vi.fn();
    //   - render the card, focus the role=button element
    //   - await userEvent.keyboard("{Enter}")
    //   - assert onActivate called exactly 1 time
  });

  it("pressing Space on the focused card calls onActivate exactly once", async () => {
    // Plan 10-02 will:
    //   - const onActivate = vi.fn();
    //   - render the card, focus the role=button element
    //   - await userEvent.keyboard(" ")
    //   - assert onActivate called exactly 1 time
  });
});
