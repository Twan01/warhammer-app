/**
 * Phase 14 — SpendingPage component tests.
 *
 * Verifies SPEND-03 (hero total) + SPEND-04 (per-faction breakdown + Paints row).
 * We mock useSpendingStats so this is a pure component test (no SQLite dependency).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { SpendingPage } from "@/features/spending/SpendingPage";
import type { Faction } from "@/types/faction";

// Mock useSpendingStats — different tests override the return value.
vi.mock("@/hooks/useSpendingStats", () => ({
  useSpendingStats: vi.fn(),
  SPENDING_STATS_KEY: ["spending-stats"],
}));
import { useSpendingStats } from "@/hooks/useSpendingStats";

function f(over: Partial<Faction> = {}): Faction {
  return {
    id: 1,
    name: "Tau Empire",
    game_system: "Warhammer 40K",
    description: null,
    color_theme: "#3a4f96",
    icon_path: null,
    lore_notes: null,
    created_at: "2026-01-01 00:00:00",
    updated_at: "2026-01-01 00:00:00",
    ...over,
  };
}

function Wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SpendingPage — SPEND-03/04 (hero total + faction breakdown)", () => {
  it("renders skeleton with aria-label='Loading spending data' while query is loading", () => {
    vi.mocked(useSpendingStats).mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
    } as unknown as ReturnType<typeof useSpendingStats>);
    render(<SpendingPage />, { wrapper: Wrapper });
    expect(screen.getByLabelText("Loading spending data")).toBeInTheDocument();
  });

  it("renders error message when query fails (no full-page takeover per UI-SPEC §Component Inventory)", () => {
    vi.mocked(useSpendingStats).mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
    } as unknown as ReturnType<typeof useSpendingStats>);
    render(<SpendingPage />, { wrapper: Wrapper });
    expect(
      screen.getByText("Could not load spending data. Restart the app or try again.")
    ).toBeInTheDocument();
  });

  it("renders 'Total Hobby Spend' label with formatted currency hero value when data loads", () => {
    vi.mocked(useSpendingStats).mockReturnValue({
      isLoading: false,
      isError: false,
      data: { totalPence: 24750, factionBreakdown: [], paintsPence: 0 },
    } as unknown as ReturnType<typeof useSpendingStats>);
    render(<SpendingPage />, { wrapper: Wrapper });
    expect(screen.getByText("Total Hobby Spend")).toBeInTheDocument();
    expect(screen.getByText("£247.50")).toBeInTheDocument();
  });

  it("renders one row per faction in factionBreakdown with formatted spend (zero shown as '£0.00')", () => {
    vi.mocked(useSpendingStats).mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        totalPence: 14750,
        factionBreakdown: [
          { faction: f({ id: 1, name: "Tau Empire" }), pence: 8500 },
          { faction: f({ id: 2, name: "Ultramarines" }), pence: 6250 },
          { faction: f({ id: 3, name: "Necrons" }), pence: 0 },
        ],
        paintsPence: 0,
      },
    } as unknown as ReturnType<typeof useSpendingStats>);
    render(<SpendingPage />, { wrapper: Wrapper });
    expect(screen.getByText("Tau Empire")).toBeInTheDocument();
    expect(screen.getByText("£85.00")).toBeInTheDocument();
    expect(screen.getByText("Ultramarines")).toBeInTheDocument();
    expect(screen.getByText("£62.50")).toBeInTheDocument();
    expect(screen.getByText("Necrons")).toBeInTheDocument();
    // Necrons row + Paints row both render £0.00; getAllByText to allow multiple matches
    expect(screen.getAllByText("£0.00").length).toBeGreaterThanOrEqual(1);
  });

  it("renders 'Paints' row separately at bottom of table with paintsPence formatted", () => {
    vi.mocked(useSpendingStats).mockReturnValue({
      isLoading: false,
      isError: false,
      data: { totalPence: 5500, factionBreakdown: [], paintsPence: 5500 },
    } as unknown as ReturnType<typeof useSpendingStats>);
    render(<SpendingPage />, { wrapper: Wrapper });
    expect(screen.getByText("Paints")).toBeInTheDocument();
    // Both hero (£55.00) and Paints row (£55.00) render this string
    expect(screen.getAllByText("£55.00").length).toBeGreaterThanOrEqual(2);
  });
});

describe("SpendingPage — DATA-03/04 (spending intelligence metrics)", () => {
  it.todo("renders 'Cost Per Completed Model' card with formatted currency when data has Completed units");
  it.todo("renders dash in 'Cost Per Completed Model' card when costPerCompletedModelPence is null");
  it.todo("renders 'Painted vs Unpainted Value' card with two figures and labels");
  it.todo("renders two skeleton cards in loading state for the metric section");
});
