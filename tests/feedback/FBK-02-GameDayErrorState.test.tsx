/**
 * FBK-02: GameDayPage shows centered error block with AlertCircle and "Try Again"
 * retry button when useArmyList query fails.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Controllable mock state
// ---------------------------------------------------------------------------
let mockListError = false;
let mockListLoading = false;
let mockListData: unknown = null;
const mockRefetch = vi.fn();

vi.mock("@/hooks/useArmyLists", () => ({
  useArmyList: () => ({
    data: mockListData,
    isLoading: mockListLoading,
    isError: mockListError,
    refetch: mockRefetch,
  }),
  useArmyListWithUnits: () => ({ data: [] }),
}));

vi.mock("@/hooks/useFactions", () => ({
  useFactions: () => ({ data: [] }),
}));

vi.mock("@/hooks/useUdbMeta", () => ({
  useUdbMeta: () => ({ data: null }),
}));

// Mock sub-components to avoid deep dependency chains
vi.mock("@/features/game-day/GameDayHeader", () => ({
  GameDayHeader: () => null,
}));
vi.mock("@/features/game-day/GameDayReadinessPanel", () => ({
  GameDayReadinessPanel: () => null,
}));
vi.mock("@/features/game-day/StrategemsTab", () => ({
  StrategemsTab: () => null,
}));
vi.mock("@/features/game-day/UnitsTab", () => ({
  UnitsTab: () => null,
}));
vi.mock("@/features/game-day/ChecklistTab", () => ({
  ChecklistTab: () => null,
}));
vi.mock("@/features/battle-log/BattleLogSheet", () => ({
  BattleLogSheet: () => null,
}));
vi.mock("@/features/game-day/gameDayStore", () => ({
  useGameDayStore: Object.assign(() => ({}), {
    getState: () => ({ listStates: {}, setDefaultChecklist: vi.fn() }),
  }),
  getDefaultChecklist: () => Promise.resolve([]),
}));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));
vi.mock("@/lib/dates", () => ({
  todayISO: () => "2026-06-11",
}));

import { GameDayPage } from "@/features/game-day/GameDayPage";

function Wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("FBK-02: GameDayPage error state", () => {
  it("shows error block with 'Failed to load game day data' when query fails", () => {
    mockListError = true;
    mockListLoading = false;
    mockListData = undefined;

    render(<GameDayPage listId={1} />, { wrapper: Wrapper });

    expect(screen.getByText("Failed to load game day data")).toBeInTheDocument();
  });

  it("shows 'Try Again' button that calls refetch", async () => {
    mockListError = true;
    mockListLoading = false;
    mockListData = undefined;
    mockRefetch.mockClear();

    render(<GameDayPage listId={1} />, { wrapper: Wrapper });

    const retryButton = screen.getByRole("button", { name: /try again/i });
    expect(retryButton).toBeInTheDocument();

    await userEvent.click(retryButton);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it("renders AlertCircle icon in error state", () => {
    mockListError = true;
    mockListLoading = false;
    mockListData = undefined;

    const { container } = render(<GameDayPage listId={1} />, { wrapper: Wrapper });

    // AlertCircle renders as an SVG with lucide classes
    const svg = container.querySelector("svg.lucide-circle-alert");
    expect(svg).toBeInTheDocument();
  });
});
