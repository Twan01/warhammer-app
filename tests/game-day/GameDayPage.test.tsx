/**
 * Phase 56 — GameDayPage component tests.
 *
 * Mocks React Query hooks and TanStack Router. Verifies the page renders
 * list name in header and all 3 tab triggers (Stratagems, Units, Checklist).
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { GameDayPage } from "@/features/game-day/GameDayPage";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ listId: "1" }),
  useNavigate: () => vi.fn(),
}));

vi.mock("@/hooks/useArmyLists", () => ({
  useArmyList: () => ({
    data: {
      id: 1,
      name: "Space Marines Alpha",
      faction_id: 10,
      points_limit: 2000,
      list_type: "Matched Play",
      notes: null,
      detachment_id: "det-gladius",
      detachment_name: "Gladius Task Force",
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    },
    isLoading: false,
  }),
  useArmyListWithUnits: () => ({
    data: [
      {
        id: 1,
        army_list_id: 1,
        unit_id: 100,
        unit_name: "Intercessors",
        unit_points: 80,
        effective_points: 80,
        faction_id: 10,
        status_assembly: 1,
        status_painting: "Painted",
        painting_percentage: 100,
      },
    ],
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useFactions", () => ({
  useFactions: () => ({
    data: [{ id: 10, name: "Space Marines", color_theme: "#004B87" }],
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useRulesExtended", () => ({
  useStratagemsByDetachment: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/hooks/useRulesFavorites", () => ({
  useRulesFavorites: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/hooks/useDatasheet", () => ({
  useWahapediaFactionId: () => ({ data: null }),
  useRulesSyncMeta: () => ({ data: null }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GameDayPage", () => {
  it("renders list name in header", () => {
    render(<GameDayPage listId={1} />, { wrapper: createWrapper() });
    expect(screen.getByText("Space Marines Alpha")).toBeInTheDocument();
  });

  it("renders faction badge", () => {
    render(<GameDayPage listId={1} />, { wrapper: createWrapper() });
    expect(screen.getByText("Space Marines")).toBeInTheDocument();
  });

  it("renders detachment name", () => {
    render(<GameDayPage listId={1} />, { wrapper: createWrapper() });
    expect(screen.getByText("Gladius Task Force")).toBeInTheDocument();
  });

  it("renders 3 tab triggers", () => {
    render(<GameDayPage listId={1} />, { wrapper: createWrapper() });
    expect(screen.getByText("Stratagems")).toBeInTheDocument();
    expect(screen.getByText("Units")).toBeInTheDocument();
    expect(screen.getByText("Checklist")).toBeInTheDocument();
  });
});
