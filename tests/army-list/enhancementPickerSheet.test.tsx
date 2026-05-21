/**
 * Phase 91 — ENH-01, ENH-02: EnhancementPickerSheet component tests.
 *
 * Tests enhancement listing, assignment, and preventive validation
 * (max 3, no duplicates, Epic Hero guard).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EnhancementPickerSheet } from "@/features/army-lists/EnhancementPickerSheet";
import type { ArmyList, ArmyListUnitRow, ArmyListEnhancement } from "@/types/armyList";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockAddEnhancement = vi.fn().mockResolvedValue(1);
const mockRemoveEnhancement = vi.fn().mockResolvedValue(undefined);
const mockGetEnhancementsByList = vi.fn().mockResolvedValue([]);

vi.mock("@/db/queries/armyLists", () => ({
  getArmyLists: vi.fn().mockResolvedValue([]),
  getArmyListById: vi.fn().mockResolvedValue(null),
  getArmyListWithUnits: vi.fn().mockResolvedValue([]),
  createArmyList: vi.fn(),
  updateArmyList: vi.fn(),
  deleteArmyList: vi.fn(),
  addUnitToList: vi.fn(),
  removeUnitFromList: vi.fn(),
  updateArmyListUnit: vi.fn(),
  clearArmyListDetachment: vi.fn().mockResolvedValue(undefined),
  getArmyListReadiness: vi.fn().mockResolvedValue([]),
  addEnhancement: (...args: unknown[]) => mockAddEnhancement(...args),
  removeEnhancement: (...args: unknown[]) => mockRemoveEnhancement(...args),
  getEnhancementsByList: (...args: unknown[]) => mockGetEnhancementsByList(...args),
}));

vi.mock("@/db/queries/bsdataExtended", () => ({
  getEnhancementsByFaction: vi.fn().mockResolvedValue([
    { name: "Adeptus Command", faction_id: "1", detachment_name: "Gladius Task Force", points: 30 },
    { name: "Fire Discipline", faction_id: "1", detachment_name: "Gladius Task Force", points: 25 },
  ]),
}));

vi.mock("@/db/queries/datasheets", () => ({
  getUnitKeywords: vi.fn().mockResolvedValue({ isCharacter: true, isEpicHero: false }),
  getRulesSyncMeta: vi.fn().mockResolvedValue(null),
  resolveWahapediaFactionIdByName: vi.fn().mockResolvedValue(null),
  getDatasheetsByFaction: vi.fn().mockResolvedValue([]),
  getDatasheetIdForUnit: vi.fn().mockResolvedValue(null),
  getFullDatasheet: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/db/queries/units", () => ({
  getUnits: vi.fn().mockResolvedValue([]),
  getUnitById: vi.fn().mockResolvedValue(null),
  createUnit: vi.fn(),
  updateUnit: vi.fn(),
  deleteUnit: vi.fn(),
}));

vi.mock("@/db/queries/factions", () => ({
  getFactions: vi.fn().mockResolvedValue([]),
  getFactionById: vi.fn().mockResolvedValue(null),
  createFaction: vi.fn(),
  updateFaction: vi.fn(),
  deleteFaction: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeUnit(overrides: Partial<ArmyListUnitRow> = {}): ArmyListUnitRow {
  return {
    id: 10,
    list_id: 1,
    unit_id: 5,
    points_override: null,
    notes: null,
    created_at: "2024-01-01",
    unit_name: "Chaplain",
    unit_points: 75,
    faction_id: 1,
    status_assembly: 1,
    status_painting: "Completed",
    synced_points: null,
    override_points: null,
    painting_percentage: 100,
    effective_points: 75,
    tactical_role: null,
    ...overrides,
  };
}

function makeList(overrides: Partial<ArmyList> = {}): ArmyList {
  return {
    id: 1,
    name: "Test List",
    faction_id: 1,
    points_limit: 2000,
    list_type: null,
    notes: null,
    detachment_id: "det-1",
    detachment_name: "Gladius Task Force",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    ...overrides,
  };
}

function makeEnhancement(overrides: Partial<ArmyListEnhancement> = {}): ArmyListEnhancement {
  return {
    id: 1,
    list_id: 1,
    army_list_unit_id: 10,
    enhancement_name: "Adeptus Command",
    enhancement_points: 30,
    created_at: "2024-01-01",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function renderSheet(
  props: Partial<React.ComponentProps<typeof EnhancementPickerSheet>> = {},
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <EnhancementPickerSheet
          open={true}
          unit={makeUnit()}
          list={makeList()}
          onClose={vi.fn()}
          {...props}
        />
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests: ENH-01
// ---------------------------------------------------------------------------

describe("EnhancementPickerSheet — ENH-01 enhancement listing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEnhancementsByList.mockResolvedValue([]);
  });

  it("renders enhancement list for detachment", async () => {
    renderSheet();
    await waitFor(() => {
      expect(screen.getByText("Adeptus Command")).toBeInTheDocument();
      expect(screen.getByText("Fire Discipline")).toBeInTheDocument();
    });
  });

  it("Assign button is enabled and clickable for unassigned enhancements", async () => {
    renderSheet();

    await waitFor(() => {
      expect(screen.getByText("Adeptus Command")).toBeInTheDocument();
    });

    const assignButtons = screen.getAllByRole("button", { name: /assign/i });
    // Both enhancements should have enabled Assign buttons
    expect(assignButtons).toHaveLength(2);
    expect(assignButtons[0]).not.toBeDisabled();
    expect(assignButtons[1]).not.toBeDisabled();
  });

  it("shows no-detachment message when list.detachment_name is null", async () => {
    renderSheet({ list: makeList({ detachment_name: null }) });
    await waitFor(() => {
      expect(screen.getByText(/select a detachment first/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: ENH-02
// ---------------------------------------------------------------------------

describe("EnhancementPickerSheet — ENH-02 preventive validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Assign button disabled when 3 enhancements already assigned", async () => {
    mockGetEnhancementsByList.mockResolvedValue([
      makeEnhancement({ id: 1, enhancement_name: "Enh A", army_list_unit_id: 20 }),
      makeEnhancement({ id: 2, enhancement_name: "Enh B", army_list_unit_id: 21 }),
      makeEnhancement({ id: 3, enhancement_name: "Enh C", army_list_unit_id: 22 }),
    ]);

    renderSheet();

    await waitFor(() => {
      expect(screen.getByText("Adeptus Command")).toBeInTheDocument();
    });

    // All Assign buttons should be disabled
    const assignButtons = screen.getAllByRole("button", { name: /assign/i });
    for (const btn of assignButtons) {
      expect(btn).toBeDisabled();
    }
  });

  it("Assign button disabled when enhancement is a duplicate", async () => {
    mockGetEnhancementsByList.mockResolvedValue([
      makeEnhancement({ id: 1, enhancement_name: "Adeptus Command", army_list_unit_id: 20 }),
    ]);

    renderSheet();

    await waitFor(() => {
      expect(screen.getByText("Adeptus Command")).toBeInTheDocument();
    });

    // The "Adeptus Command" row should have a disabled Assign button
    // The "Fire Discipline" row should have an enabled Assign button
    const assignButtons = screen.getAllByRole("button", { name: /assign/i });
    expect(assignButtons).toHaveLength(2);
    // First button (Adeptus Command) is disabled
    expect(assignButtons[0]).toBeDisabled();
    // Second button (Fire Discipline) is enabled
    expect(assignButtons[1]).not.toBeDisabled();
  });

  it("Assign button disabled for Epic Hero unit", async () => {
    mockGetEnhancementsByList.mockResolvedValue([]);
    const { getUnitKeywords } = await import("@/db/queries/datasheets");
    vi.mocked(getUnitKeywords).mockResolvedValue({ isCharacter: true, isEpicHero: true });

    renderSheet();

    await waitFor(() => {
      expect(screen.getByText("Adeptus Command")).toBeInTheDocument();
    });

    const assignButtons = screen.getAllByRole("button", { name: /assign/i });
    for (const btn of assignButtons) {
      expect(btn).toBeDisabled();
    }
  });
});
