/**
 * Phase 14 — SpendingPage component tests (Wave 0 stubs).
 *
 * STATUS: skipped. Plan 14-03 will:
 *   1. Create src/features/spending/SpendingPage.tsx per 14-UI-SPEC.md §Component Inventory.
 *   2. Replace `describe.skip` below with `describe`.
 *   3. Add real assertions using vi.mock("@/hooks/useSpendingStats") + render() pattern
 *      from tests/dashboard/DashboardPage.test.tsx verbatim.
 *
 * The .tsx extension is required because real bodies use JSX in render(<SpendingPage />).
 */
import { describe, it } from "vitest";

describe.skip("SpendingPage — SPEND-03/04 (hero total + faction breakdown)", () => {
  it("renders skeleton with aria-label='Loading spending data' while query is loading", () => {
    // Plan 14-03 will:
    //   - vi.mock("@/hooks/useSpendingStats", () => ({ useSpendingStats: vi.fn() }));
    //   - vi.mocked(useSpendingStats).mockReturnValue({ isLoading: true } as ReturnType<typeof useSpendingStats>);
    //   - render(<SpendingPage />, { wrapper: QueryClientProviderWrapper });
    //   - expect(screen.getByLabelText("Loading spending data")).toBeInTheDocument();
  });

  it("renders error message when query fails (no full-page takeover per UI-SPEC §Component Inventory)", () => {
    // Plan 14-03 will:
    //   - vi.mocked(useSpendingStats).mockReturnValue({ isError: true } as ReturnType<typeof useSpendingStats>);
    //   - render(<SpendingPage />, { wrapper: QueryClientProviderWrapper });
    //   - expect(screen.getByText("Could not load spending data. Restart the app or try again.")).toBeInTheDocument();
  });

  it("renders 'Total Hobby Spend' label with formatted currency hero value when data loads", () => {
    // Plan 14-03 will:
    //   - vi.mocked(useSpendingStats).mockReturnValue({
    //       data: { totalPence: 24750, factionBreakdown: [], paintsPence: 5500 },
    //     } as ReturnType<typeof useSpendingStats>);
    //   - render(<SpendingPage />, { wrapper: QueryClientProviderWrapper });
    //   - expect(screen.getByText("Total Hobby Spend")).toBeInTheDocument();
    //   - expect(screen.getByText("£247.50")).toBeInTheDocument();
  });

  it("renders one row per faction in factionBreakdown with formatted spend (zero shown as '£0.00')", () => {
    // Plan 14-03 will:
    //   - vi.mocked(useSpendingStats).mockReturnValue({
    //       data: {
    //         totalPence: 14750,
    //         factionBreakdown: [
    //           { faction: { id: 1, name: "Tau Empire", ... }, pence: 8500 },
    //           { faction: { id: 2, name: "Ultramarines", ... }, pence: 6250 },
    //           { faction: { id: 3, name: "Necrons", ... }, pence: 0 },
    //         ],
    //         paintsPence: 0,
    //       },
    //     } as ReturnType<typeof useSpendingStats>);
    //   - render(<SpendingPage />, { wrapper: QueryClientProviderWrapper });
    //   - expect(screen.getByText("Tau Empire")).toBeInTheDocument();
    //   - expect(screen.getByText("£85.00")).toBeInTheDocument();
    //   - expect(screen.getByText("Ultramarines")).toBeInTheDocument();
    //   - expect(screen.getByText("£62.50")).toBeInTheDocument();
    //   - expect(screen.getByText("Necrons")).toBeInTheDocument();
    //   - expect(screen.getByText("£0.00")).toBeInTheDocument();  // zero spend shown, not "—"
  });

  it("renders 'Paints' row separately at bottom of table with paintsPence formatted", () => {
    // Plan 14-03 will:
    //   - vi.mocked(useSpendingStats).mockReturnValue({
    //       data: { totalPence: 5500, factionBreakdown: [], paintsPence: 5500 },
    //     } as ReturnType<typeof useSpendingStats>);
    //   - render(<SpendingPage />, { wrapper: QueryClientProviderWrapper });
    //   - expect(screen.getByText("Paints")).toBeInTheDocument();
    //   - // The "Paints" cell and the £55.00 cell are sibling td elements in the same TableRow
    //   - expect(screen.getByText("£55.00")).toBeInTheDocument();
  });
});
