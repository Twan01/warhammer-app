/**
 * Phase 120 — ENH-02, ENH-03: EnhancementPickerSheet component tests.
 *
 * Phase 120: migrated from BSData (bsdataExtended) to canonical udb_enhancements.
 * Mocks must target @/hooks/useGameData (useEnhancementsByDetachment), not bsdataExtended.
 * Tests verify:
 *   - ENH-02: enhancements listed by detachment_id; cost field used (not points)
 *   - ENH-03: HTML descriptions rendered via dangerouslySetInnerHTML
 *   - Validation: max 3, duplicate, Epic Hero guards preserved
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EnhancementPickerSheet } from "@/features/army-lists/EnhancementPickerSheet";
import type { ArmyList, ArmyListUnitRow, ArmyListEnhancement } from "@/types/armyList";
import type { UdbEnhancement } from "@/types/gameData";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockAddEnhancement = vi.fn().mockResolvedValue(1);
const mockRemoveEnhancement = vi.fn().mockResolvedValue(undefined);
const mockGetEnhancementsByList = vi.fn().mockResolvedValue([]);

// Phase 120: mock useGameData, NOT bsdataExtended
vi.mock("@/hooks/useGameData", () => ({
  useEnhancementsByDetachment: vi.fn(),
}));

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

vi.mock("@/hooks/useUnitKeywords", () => ({
  useUnitKeywords: vi.fn().mockReturnValue({
    data: { isCharacter: true, isEpicHero: false },
    isLoading: false,
  }),
  SAFE_DEFAULT: { isCharacter: false, isEpicHero: false },
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

const mockUdbEnhancements: UdbEnhancement[] = [
  {
    id: "enh-1",
    faction_id: "SM",
    detachment_id: "det-1",
    name: "Adeptus Command",
    cost: 30,
    description: "<b>Once per battle</b>, reroll a command check.",
  },
  {
    id: "enh-2",
    faction_id: "SM",
    detachment_id: "det-1",
    name: "Fire Discipline",
    cost: 0,
    description: "Add 1 to hit rolls.",
  },
];

function makeUnit(overrides: Partial<ArmyListUnitRow> = {}): ArmyListUnitRow {
  return {
    id: 10,
    list_id: 1,
    unit_id: 5,
    points_override: null,
    notes: null,
    sort_order: 0,
    created_at: "2024-01-01",
    unit_name: "Chaplain",
    unit_points: 75,
    udb_unit_id: null,
    faction_id: 1,
    unit_category: null, unit_model_count: null,
    status_assembly: 1,
    status_painting: "Completed",
    udb_base_points: null,
    udb_role: null,
    udb_keywords: null,
    override_points: null,
    painting_percentage: 100,
    effective_points: 75,
    tactical_role: null,
    tier_points: null,
    ghost_unit_name: null,
    is_warlord: 0,
    selected_model_count: null,
    leader_attached_to_id: null,
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

async function setupEnhancementsMock(enhancements: UdbEnhancement[] = mockUdbEnhancements) {
  const { useEnhancementsByDetachment } = await import("@/hooks/useGameData");
  vi.mocked(useEnhancementsByDetachment).mockReturnValue({
    data: enhancements,
    isLoading: false,
  } as unknown as ReturnType<typeof useEnhancementsByDetachment>);
}

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
// Tests: ENH-02 — canonical udb_enhancements data source
// ---------------------------------------------------------------------------

describe("EnhancementPickerSheet — ENH-02 canonical data source (useGameData)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetEnhancementsByList.mockResolvedValue([]);
    await setupEnhancementsMock();
  });

  it("renders enhancement list from useEnhancementsByDetachment (not bsdataExtended)", async () => {
    renderSheet();
    await waitFor(() => {
      expect(screen.getByText("Adeptus Command")).toBeInTheDocument();
      expect(screen.getByText("Fire Discipline")).toBeInTheDocument();
    });
  });

  it("shows cost badge using enhancement.cost field — '30 pts' for cost=30", async () => {
    renderSheet();
    await waitFor(() => {
      expect(screen.getByText("30 pts")).toBeInTheDocument();
    });
  });

  it("shows 'Free' badge when enhancement.cost is 0", async () => {
    renderSheet();
    await waitFor(() => {
      expect(screen.getByText("Free")).toBeInTheDocument();
    });
  });

  it("Assign button is enabled for unassigned enhancements", async () => {
    renderSheet();
    await waitFor(() => {
      expect(screen.getByText("Adeptus Command")).toBeInTheDocument();
    });

    const assignButtons = screen.getAllByRole("button", { name: /assign/i });
    expect(assignButtons).toHaveLength(2);
    expect(assignButtons[0]).not.toBeDisabled();
    expect(assignButtons[1]).not.toBeDisabled();
  });

  it("shows no-detachment message when list.detachment_id is null", async () => {
    const { useEnhancementsByDetachment } = await import("@/hooks/useGameData");
    vi.mocked(useEnhancementsByDetachment).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useEnhancementsByDetachment>);

    renderSheet({ list: makeList({ detachment_id: null, detachment_name: null }) });
    await waitFor(() => {
      expect(screen.getByText(/select a detachment first/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: ENH-03 — HTML description rendering
// ---------------------------------------------------------------------------

describe("EnhancementPickerSheet — ENH-03 HTML descriptions via dangerouslySetInnerHTML", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetEnhancementsByList.mockResolvedValue([]);
    await setupEnhancementsMock();
  });

  it("renders HTML description content (bold text from <b> tag is visible)", async () => {
    renderSheet();
    await waitFor(() => {
      // The description "<b>Once per battle</b>, reroll a command check."
      // should render the text as DOM content (the <b> tag is processed by the browser)
      expect(screen.getByText(/once per battle/i)).toBeInTheDocument();
    });
  });

  it("description innerHTML contains raw HTML markup (not escaped text)", async () => {
    renderSheet();
    await waitFor(() => {
      expect(screen.getByText("Adeptus Command")).toBeInTheDocument();
    });

    // Sheet renders in a portal — query document.body, not container.
    // dangerouslySetInnerHTML: the div's innerHTML must contain the HTML tag,
    // NOT escaped entities like &lt;b&gt;. We find all divs with mt-1 class.
    const allDivs = Array.from(document.body.querySelectorAll("div"));
    const descriptionDivs = allDivs.filter(
      (div) => div.className.includes("mt-1"),
    );
    expect(descriptionDivs.length).toBeGreaterThan(0);
    // The innerHTML must contain "<b>" as a real tag, not "&lt;b&gt;" (escaped)
    const htmlContents = descriptionDivs.map((d) => d.innerHTML);
    const hasRealHtmlTag = htmlContents.some((html) => html.includes("<b>"));
    expect(hasRealHtmlTag).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: Validation logic preserved
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// FIX-08: Success toasts on assign/remove — structural verification
// ---------------------------------------------------------------------------

describe("EnhancementPickerSheet — FIX-08 success toasts", () => {
  it("source contains toast.success for assign and remove operations", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../src/features/army-lists/EnhancementPickerSheet.tsx"),
      "utf-8",
    );

    // Verify toast.success calls exist for both assign and remove
    expect(source).toContain('toast.success("Enhancement assigned.")');
    expect(source).toContain('toast.success("Enhancement removed.")');
  });

  it("source contains toast.error for assign and remove failure", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../src/features/army-lists/EnhancementPickerSheet.tsx"),
      "utf-8",
    );

    expect(source).toContain("toast.error");
  });
});

describe("EnhancementPickerSheet — validation logic preserved (D-11)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetEnhancementsByList.mockResolvedValue([]);
    await setupEnhancementsMock();
  });

  it("Assign button disabled when 3 enhancements already assigned (max 3 rule)", async () => {
    mockGetEnhancementsByList.mockResolvedValue([
      makeEnhancement({ id: 1, enhancement_name: "Enh A", army_list_unit_id: 20 }),
      makeEnhancement({ id: 2, enhancement_name: "Enh B", army_list_unit_id: 21 }),
      makeEnhancement({ id: 3, enhancement_name: "Enh C", army_list_unit_id: 22 }),
    ]);

    renderSheet();

    // Wait until enhancements are visible AND all Assign buttons are disabled
    await waitFor(() => {
      expect(screen.getByText("Adeptus Command")).toBeInTheDocument();
      const assignButtons = screen.getAllByRole("button", { name: /assign/i });
      expect(assignButtons.length).toBeGreaterThan(0);
      for (const btn of assignButtons) {
        expect(btn).toBeDisabled();
      }
    });
  });

  it("Assign button disabled when enhancement is already assigned (duplicate rule)", async () => {
    mockGetEnhancementsByList.mockResolvedValue([
      makeEnhancement({ id: 1, enhancement_name: "Adeptus Command", army_list_unit_id: 20 }),
    ]);

    renderSheet();

    // Wait until React Query resolves both useEnhancementsByDetachment and useEnhancementsByList
    await waitFor(() => {
      expect(screen.getByText("Adeptus Command")).toBeInTheDocument();
      const assignButtons = screen.getAllByRole("button", { name: /assign/i });
      expect(assignButtons).toHaveLength(2);
      // Adeptus Command is duplicated — its button is disabled
      expect(assignButtons[0]).toBeDisabled();
      // Fire Discipline is not duplicated — its button is enabled
      expect(assignButtons[1]).not.toBeDisabled();
    });
  });

  it("Assign button disabled for Epic Hero unit", async () => {
    mockGetEnhancementsByList.mockResolvedValue([]);
    const { useUnitKeywords } = await import("@/hooks/useUnitKeywords");
    vi.mocked(useUnitKeywords).mockReturnValue({
      data: { isCharacter: true, isEpicHero: true },
      isLoading: false,
    } as unknown as ReturnType<typeof useUnitKeywords>);

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
