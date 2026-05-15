/**
 * Phase 56 — UnitAbilityCard component tests.
 *
 * Mocks useDatasheet, useStrategyNote, and the game day store to verify
 * rendering of painting badge, OPG abilities, regular abilities, strategy
 * notes, and empty state.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { UnitAbilityCard } from "@/features/game-day/UnitAbilityCard";
import type { ArmyListUnitRow } from "@/types/armyList";
import type { FullDatasheet, RwDatasheetAbility } from "@/types/datasheet";
import type { StrategyNote } from "@/types/strategyNote";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockUnit: ArmyListUnitRow = {
  id: 1,
  list_id: 1,
  unit_id: 100,
  points_override: null,
  notes: null,
  created_at: "2026-01-01",
  unit_name: "Intercessors",
  unit_points: 80,
  effective_points: 80,
  faction_id: 10,
  status_assembly: 1,
  status_painting: "Battle Ready",
  painting_percentage: 100,
  tactical_role: null,
  synced_points: null,
  override_points: null,
};

const opgAbility: RwDatasheetAbility = {
  datasheet_id: "ds-001",
  line: 1,
  ability_id: "abl-opg",
  name: "Oath of Moment",
  description: "Once per battle, you can re-roll all hits.",
  type: "Core",
  parameter: null,
};

const regularAbility: RwDatasheetAbility = {
  datasheet_id: "ds-001",
  line: 2,
  ability_id: "abl-reg",
  name: "Bolter Discipline",
  description: "Re-roll hit rolls of 1.",
  type: "Datasheet",
  parameter: null,
};

const mockDatasheet: FullDatasheet = {
  ds: { id: "ds-001", name: "Intercessors", faction_id: "F-SM", source_id: null, role: "Battleline", damaged_w: null, damaged_description: null },
  models: [],
  abilities: [opgAbility, regularAbility],
  keywords: [],
  source: null,
  wargear: [],
};

const mockStrategyNote: StrategyNote = {
  id: 1,
  unit_id: 100,
  battlefield_role: null,
  strengths: "Good at holding objectives",
  weaknesses: "Fragile to AP-2",
  best_targets: null,
  synergies: null,
  mistakes_to_avoid: null,
  rules_references: null,
  notes: "Deploy in cover",
  move: null,
  toughness: null,
  save: null,
  wounds: null,
  leadership: null,
  objective_control: null,
  keywords: null,
  abilities: null,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockToggleAbilityUsed = vi.fn();
let mockUsedAbilities: string[] = [];

vi.mock("@/hooks/useDatasheet", () => ({
  useDatasheet: vi.fn(() => ({ data: mockDatasheet, isLoading: false })),
}));

vi.mock("@/hooks/useStrategyNote", () => ({
  useStrategyNote: vi.fn(() => ({ data: mockStrategyNote, isLoading: false })),
}));

vi.mock("@/features/game-day/gameDayStore", () => ({
  useGameDayStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ toggleAbilityUsed: mockToggleAbilityUsed }),
  useGameDayListState: () => ({
    cp: 0,
    prevCp: null,
    startingCp: 0,
    checklistItems: [],
    usedAbilities: mockUsedAbilities,
  }),
}));

// Import after mocks so we can override return values
const { useDatasheet } = await import("@/hooks/useDatasheet");
const { useStrategyNote } = await import("@/hooks/useStrategyNote");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

async function renderCardExpanded(unit: ArmyListUnitRow = mockUnit) {
  const user = userEvent.setup();
  render(<UnitAbilityCard unit={unit} listId={1} />, { wrapper: Wrapper });
  // Expand the collapsible to reveal content — trigger is the button containing unit name
  const trigger = screen.getByText(unit.unit_name).closest("button")!;
  await user.click(trigger);
}

function renderCard(unit: ArmyListUnitRow = mockUnit) {
  return render(<UnitAbilityCard unit={unit} listId={1} />, { wrapper: Wrapper });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("UnitAbilityCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsedAbilities = [];
    vi.mocked(useDatasheet).mockReturnValue({ data: mockDatasheet, isLoading: false } as ReturnType<typeof useDatasheet>);
    vi.mocked(useStrategyNote).mockReturnValue({ data: mockStrategyNote, isLoading: false } as ReturnType<typeof useStrategyNote>);
  });

  it("renders unit name and painting status badge", () => {
    renderCard();
    expect(screen.getByText("Intercessors")).toBeInTheDocument();
    expect(screen.getByText("Battle Ready")).toBeInTheDocument();
    expect(screen.getByText("80pts")).toBeInTheDocument();
  });

  it("renders 'Once Per Game' section header when OPG abilities detected", async () => {
    await renderCardExpanded();
    expect(screen.getByText("Once Per Game")).toBeInTheDocument();
  });

  it("renders 'Available' button for unused OPG ability", async () => {
    await renderCardExpanded();
    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getByText("Oath of Moment")).toBeInTheDocument();
  });

  it("renders regular abilities with type badges", async () => {
    await renderCardExpanded();
    expect(screen.getByText("Bolter Discipline")).toBeInTheDocument();
    expect(screen.getByText("Datasheet")).toBeInTheDocument();
    expect(screen.getByText("Abilities")).toBeInTheDocument();
  });

  it("renders strategy note fields (Strengths, Weaknesses, Notes)", async () => {
    await renderCardExpanded();
    expect(screen.getByText("Strengths:")).toBeInTheDocument();
    expect(screen.getByText("Good at holding objectives")).toBeInTheDocument();
    expect(screen.getByText("Weaknesses:")).toBeInTheDocument();
    expect(screen.getByText("Fragile to AP-2")).toBeInTheDocument();
    expect(screen.getByText("Notes:")).toBeInTheDocument();
    expect(screen.getByText("Deploy in cover")).toBeInTheDocument();
  });

  it("renders empty state when no datasheet and no strategy note", async () => {
    vi.mocked(useDatasheet).mockReturnValue({ data: null, isLoading: false } as ReturnType<typeof useDatasheet>);
    vi.mocked(useStrategyNote).mockReturnValue({ data: null, isLoading: false } as ReturnType<typeof useStrategyNote>);
    await renderCardExpanded();
    expect(
      screen.getByText(/No ability data available/)
    ).toBeInTheDocument();
  });
});
