/**
 * Phase 78 â€” ReadyToPlayCard component behavioral tests
 * (Task 78-02-02, Req GD-02/DB-02).
 *
 * Verifies:
 * - Loading state: skeleton renders
 * - Empty state: "No army lists yet" when no lists
 * - Data state: renders list name, points, unpainted count, sync freshness
 * - Warning badge when unpainted > 0
 * - Sorts by updated_at DESC (uses most recently updated list)
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ArmyList } from "@/types/armyList";

// Controllable mock state
let mockLists: ArmyList[] | undefined = [];
let mockListsLoading = false;
let mockUnits: Array<{ effective_points: number; status_painting: string }> = [];
let mockSyncMeta: { last_sync_at: string | null } | null = null;

vi.mock("@/hooks/useArmyLists", () => ({
  useArmyLists: () => ({ data: mockLists, isLoading: mockListsLoading }),
  useArmyListWithUnits: () => ({ data: mockUnits }),
}));

vi.mock("@/hooks/useDatasheet", () => ({
  useRulesSyncMeta: () => ({ data: mockSyncMeta }),
}));

import { ReadyToPlayCard } from "@/features/dashboard/ReadyToPlayCard";

const RECENT_LIST: ArmyList = {
  id: 1,
  name: "Space Marines Alpha",
  faction_id: 10,
  points_limit: 2000,
  list_type: "Matched Play",
  notes: null,
  detachment_id: null,
  detachment_name: null,
  created_at: "2026-01-01T10:00:00.000Z",
  updated_at: "2026-05-10T10:00:00.000Z",
};

const OLDER_LIST: ArmyList = {
  id: 2,
  name: "Orks Warband",
  faction_id: 20,
  points_limit: 1000,
  list_type: "Matched Play",
  notes: null,
  detachment_id: null,
  detachment_name: null,
  created_at: "2026-01-01T10:00:00.000Z",
  updated_at: "2026-03-01T10:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockLists = [];
  mockListsLoading = false;
  mockUnits = [];
  mockSyncMeta = null;
});

describe("ReadyToPlayCard â€” loading state", () => {
  it("renders a skeleton while army lists are loading", () => {
    mockListsLoading = true;
    mockLists = undefined;
    render(<ReadyToPlayCard />);
    const skeletons = document.querySelectorAll("[class*='animate-pulse']");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe("ReadyToPlayCard â€” empty state (no lists)", () => {
  it("renders 'No army lists yet' when lists array is empty", () => {
    mockLists = [];
    render(<ReadyToPlayCard />);
    expect(screen.getByText("No army lists yet")).toBeInTheDocument();
  });

  it("renders the empty state body text", () => {
    mockLists = [];
    render(<ReadyToPlayCard />);
    expect(
      screen.getByText("Create an army list to track battle readiness.")
    ).toBeInTheDocument();
  });
});

describe("ReadyToPlayCard â€” sorts by updated_at DESC and uses most recent list", () => {
  it("shows the most recently updated list name when multiple lists exist", () => {
    // RECENT_LIST has updated_at 2026-05-10, OLDER_LIST has 2026-03-01
    // Component should show RECENT_LIST
    mockLists = [OLDER_LIST, RECENT_LIST]; // intentionally unordered
    mockUnits = [];
    render(<ReadyToPlayCard />);
    expect(screen.getByText("Space Marines Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Orks Warband")).not.toBeInTheDocument();
  });
});

describe("ReadyToPlayCard â€” data rendering", () => {
  beforeEach(() => {
    mockLists = [RECENT_LIST];
    mockUnits = [
      { effective_points: 500, status_painting: "Completed" },
      { effective_points: 300, status_painting: "In Progress" },
      { effective_points: 200, status_painting: "Not Started" },
    ];
    mockSyncMeta = null;
  });

  it("renders the army list name", () => {
    render(<ReadyToPlayCard />);
    expect(screen.getByText("Space Marines Alpha")).toBeInTheDocument();
  });

  it("renders total points for units", () => {
    render(<ReadyToPlayCard />);
    // Total = 500 + 300 + 200 = 1000 pts
    expect(screen.getByText("1000 pts")).toBeInTheDocument();
  });

  it("renders unpainted count for non-completed units", () => {
    render(<ReadyToPlayCard />);
    // 2 units are not Completed â€” "2 unpainted" appears in the metadata row
    const matches = screen.getAllByText(/2 unpainted/);
    expect(matches.length).toBeGreaterThan(0);
  });

  it("renders sync age label from syncMeta", () => {
    mockSyncMeta = null; // no sync
    render(<ReadyToPlayCard />);
    expect(screen.getByText("Never synced")).toBeInTheDocument();
  });

  it("renders warning badge when unpainted count > 0", () => {
    render(<ReadyToPlayCard />);
    // 2 unpainted â€” warning badge should appear
    const badges = document.querySelectorAll(".bg-amber-500\\/15");
    expect(badges.length).toBeGreaterThan(0);
  });
});

describe("ReadyToPlayCard â€” all units painted (no warning badge)", () => {
  it("does not render warning badge when all units are Completed", () => {
    mockLists = [RECENT_LIST];
    mockUnits = [
      { effective_points: 500, status_painting: "Completed" },
      { effective_points: 300, status_painting: "Completed" },
    ];
    mockSyncMeta = null;
    render(<ReadyToPlayCard />);
    const badges = document.querySelectorAll(".bg-amber-500\\/15");
    expect(badges.length).toBe(0);
  });
});
