/**
 * Phase 138-02 — PLAY-01: Unit comparison UI tests.
 *
 * Tests UnitComparePage (2-column render, diff highlight, empty state)
 * and UdbUnitRow compare toggle (aria-label, GitCompare icon).
 *
 * Wave 0: RED until Tasks 2-4 land (UnitCompareColumn, UnitComparePage, UnitCompareActionBar,
 * and row toggle are implemented).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { UdbUnitDetail } from "@/db/queries/unitDatabase";
import type { UdbUnitSummary } from "@/db/queries/unitDatabase";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUseUdbUnitsByIds = vi.fn();

vi.mock("@/hooks/useUnitDatabase", () => ({
  useUdbUnitsByIds: (...args: unknown[]) => mockUseUdbUnitsByIds(...args),
  useUdbUnitDetail: vi.fn(() => ({ data: null, isLoading: false })),
}));

// Mock the store with controllable compareIds
let mockCompareIds = new Set<string>();
const mockClearCompare = vi.fn();
const mockAddToCompare = vi.fn();
const mockRemoveFromCompare = vi.fn();

vi.mock("@/features/unit-database/databaseBrowserFilters", () => ({
  useDatabaseBrowserFilters: (selector?: (s: unknown) => unknown) => {
    const state = {
      compareIds: mockCompareIds,
      clearCompare: mockClearCompare,
      addToCompare: mockAddToCompare,
      removeFromCompare: mockRemoveFromCompare,
    };
    if (typeof selector === "function") return selector(state);
    return state;
  },
}));

// Mock TanStack Router navigate
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to, onClick, ...props }: { children: React.ReactNode; to: string; onClick?: (e: unknown) => void; [key: string]: unknown }) => (
    <a href={to} onClick={onClick} {...props}>{children}</a>
  ),
}));

// Mock TooltipProvider (Radix portals don't work in jsdom)
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => {
    if (asChild) return <>{children}</>;
    return <div>{children}</div>;
  },
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { UnitComparePage } from "@/features/unit-database/UnitComparePage";
import { UdbUnitRow } from "@/features/unit-database/UdbUnitRow";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeUnit(overrides: Partial<UdbUnitDetail> & { id: string; name: string }): UdbUnitDetail {
  return {
    faction_id: "SM",
    role: "Battleline",
    base_points: 80,
    damaged_w: null,
    damaged_desc: null,
    models: [
      {
        id: 1,
        unit_id: overrides.id,
        line_order: 0,
        name: null,
        M: "6\"",
        T: 4,
        Sv: "3+",
        inv_sv: null,
        W: 2,
        Ld: "6+",
        OC: 2,
      },
    ],
    weapons: [
      {
        id: 1,
        unit_id: overrides.id,
        weapon_group: 0,
        line_order: 0,
        name: "Bolt rifle",
        category: "Ranged",
        range: "24",
        attacks: "2",
        skill: "3+",
        strength: "4",
        ap: "-1",
        damage: "1",
        keywords: null,
      },
    ],
    abilities: [
      { id: 1, unit_id: overrides.id, line_order: 0, name: "Oath of Moment", description: null, ability_type: "Core" },
    ],
    keywords: [
      { unit_id: overrides.id, keyword: "Infantry", is_faction: 0 },
    ],
    points: [
      { id: 1, unit_id: overrides.id, model_count: 5, points: 80 },
    ],
    composition: [
      { id: 1, unit_id: overrides.id, min_models: 5, max_models: 10, notes: null },
    ],
    ...overrides,
  };
}

// Two units where T stat DIFFERS (4 vs 5) — differing stat should get bg-faction-accent/15
const UNIT_A = makeUnit({
  id: "u1",
  name: "Intercessors",
  models: [{ id: 1, unit_id: "u1", line_order: 0, name: null, M: "6\"", T: 4, Sv: "3+", inv_sv: null, W: 2, Ld: "6+", OC: 2 }],
});

const UNIT_B = makeUnit({
  id: "u2",
  name: "Terminators",
  models: [{ id: 2, unit_id: "u2", line_order: 0, name: null, M: "5\"", T: 5, Sv: "2+", inv_sv: null, W: 3, Ld: "6+", OC: 1 }],
});

const ROW_UNIT: UdbUnitSummary = {
  id: "u1",
  faction_id: "SM",
  name: "Intercessors",
  role: "Battleline",
  sub_faction: null,
  base_points: 80,
  min_models: 5,
  max_models: 10,
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockUseUdbUnitsByIds.mockReset();
  mockClearCompare.mockReset();
  mockAddToCompare.mockReset();
  mockRemoveFromCompare.mockReset();
  mockNavigate.mockReset();
  mockCompareIds = new Set<string>();
});

// ---------------------------------------------------------------------------
// Tests: UnitComparePage — 2-column render
// ---------------------------------------------------------------------------

describe("UnitComparePage — 2-column render", () => {
  it("renders 2 columns when 2 units are selected", () => {
    mockCompareIds = new Set(["u1", "u2"]);
    mockUseUdbUnitsByIds.mockReturnValue({ data: [UNIT_A, UNIT_B], isLoading: false });

    render(<UnitComparePage />);

    // Both unit names appear in the page (one per column header)
    expect(screen.getByText("Intercessors")).toBeInTheDocument();
    expect(screen.getByText("Terminators")).toBeInTheDocument();
  });

  it("renders the Compare Units page heading", () => {
    mockCompareIds = new Set(["u1", "u2"]);
    mockUseUdbUnitsByIds.mockReturnValue({ data: [UNIT_A, UNIT_B], isLoading: false });

    render(<UnitComparePage />);

    expect(screen.getByText("Compare Units")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Tests: UnitComparePage — diff highlight
// ---------------------------------------------------------------------------

describe("UnitComparePage — diff highlight", () => {
  it("renders an element with bg-faction-accent/15 for differing stat cells", () => {
    // UNIT_A T=4, UNIT_B T=5 => T stat differs => bg-faction-accent/15 applied
    mockCompareIds = new Set(["u1", "u2"]);
    mockUseUdbUnitsByIds.mockReturnValue({ data: [UNIT_A, UNIT_B], isLoading: false });

    const { container } = render(<UnitComparePage />);

    // At least one element should have the diff highlight class
    const diffCells = container.querySelectorAll(".bg-faction-accent\\/15");
    expect(diffCells.length).toBeGreaterThan(0);
  });

  it("does NOT render bg-faction-accent/15 when all stats are identical", () => {
    // Both units have same stats
    const unitC = makeUnit({
      id: "u3",
      name: "Unit C",
      models: [{ id: 3, unit_id: "u3", line_order: 0, name: null, M: "6\"", T: 4, Sv: "3+", inv_sv: null, W: 2, Ld: "6+", OC: 2 }],
      weapons: [],
      abilities: [],
      keywords: [],
      points: [{ id: 3, unit_id: "u3", model_count: 5, points: 80 }],
    });
    const unitD = makeUnit({
      id: "u4",
      name: "Unit D",
      models: [{ id: 4, unit_id: "u4", line_order: 0, name: null, M: "6\"", T: 4, Sv: "3+", inv_sv: null, W: 2, Ld: "6+", OC: 2 }],
      weapons: [],
      abilities: [],
      keywords: [],
      points: [{ id: 4, unit_id: "u4", model_count: 5, points: 80 }],
    });

    mockCompareIds = new Set(["u3", "u4"]);
    mockUseUdbUnitsByIds.mockReturnValue({ data: [unitC, unitD], isLoading: false });

    const { container } = render(<UnitComparePage />);

    // No stat diff cells should be present when all stats match
    const diffCells = container.querySelectorAll(".bg-faction-accent\\/15");
    expect(diffCells.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: UnitComparePage — empty state
// ---------------------------------------------------------------------------

describe("UnitComparePage — empty state", () => {
  it("shows empty state heading when fewer than 2 units are selected", () => {
    mockCompareIds = new Set(["u1"]); // only 1 unit
    mockUseUdbUnitsByIds.mockReturnValue({ data: [], isLoading: false });

    render(<UnitComparePage />);

    expect(screen.getByText("Select units to compare")).toBeInTheDocument();
  });

  it("shows Browse Unit Database CTA in empty state", () => {
    mockCompareIds = new Set([]); // 0 units
    mockUseUdbUnitsByIds.mockReturnValue({ data: [], isLoading: false });

    render(<UnitComparePage />);

    expect(screen.getByText("Browse Unit Database")).toBeInTheDocument();
  });

  it("shows empty state body text", () => {
    mockCompareIds = new Set(["u1"]);
    mockUseUdbUnitsByIds.mockReturnValue({ data: [], isLoading: false });

    render(<UnitComparePage />);

    expect(
      screen.getByText("Choose 2 or 3 units from the Unit Database to compare them side by side."),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Tests: UdbUnitRow — compare toggle
// ---------------------------------------------------------------------------

describe("UdbUnitRow — compare toggle", () => {
  it("renders a GitCompare button with add aria-label when unit is not in compare", () => {
    mockCompareIds = new Set<string>(); // not in compare

    render(<UdbUnitRow unit={ROW_UNIT} onOpen={() => {}} />);

    const btn = screen.getByRole("button", { name: "Add Intercessors to comparison" });
    expect(btn).toBeInTheDocument();
  });

  it("renders remove aria-label when unit is in compare", () => {
    mockCompareIds = new Set(["u1"]); // already in compare

    render(<UdbUnitRow unit={ROW_UNIT} onOpen={() => {}} />);

    const btn = screen.getByRole("button", { name: "Remove Intercessors from comparison" });
    expect(btn).toBeInTheDocument();
  });

  it("disables the compare button when cap is reached and unit is not in compare", () => {
    mockCompareIds = new Set(["u2", "u3", "u4"]); // already 3 others

    render(<UdbUnitRow unit={ROW_UNIT} onOpen={() => {}} />);

    const btn = screen.getByRole("button", { name: "Add Intercessors to comparison" });
    expect(btn).toBeDisabled();
  });
});
