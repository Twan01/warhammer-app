/**
 * Phase 110 -- UnitAbilityCard weapons section and OPG key format tests.
 *
 * Covers INT-02 (Game Day weapons section, OPG key format):
 * - Collapsible weapons section renders when weapons exist
 * - Weapons section defaults to collapsed (defaultOpen={false})
 * - OPG key uses unit_id:ability_name format (single colon, no ability.id)
 * - OPG abilities toggleable with stable keys
 * - Empty state accounts for weapons (weapons prevent empty message)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { UnitAbilityCard } from "@/features/game-day/UnitAbilityCard";
import type { ArmyListUnitRow } from "@/types/armyList";
import type { UdbUnitDetail, UdbAbility, UdbWeapon } from "@/db/queries/unitDatabase";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeWeapon(overrides: Partial<UdbWeapon> = {}): UdbWeapon {
  return {
    id: 1,
    unit_id: "ds-001",
    weapon_group: 1,
    line_order: 1,
    name: "Bolt Rifle",
    category: "Ranged",
    range: "24",
    attacks: "2",
    skill: "3",
    strength: "4",
    ap: "-1",
    damage: "1",
    keywords: null,
    ...overrides,
  };
}

const mockUnit: ArmyListUnitRow = {
  id: 1,
  list_id: 1,
  unit_id: 100,
  ghost_unit_name: null,
  is_warlord: 0,
  selected_model_count: null,
  leader_attached_to_id: null,
  points_override: null,
  notes: null,
  sort_order: 0,
  created_at: "2026-01-01",
  unit_name: "Intercessors",
  unit_points: 80,
  udb_unit_id: null,
  effective_points: 80,
  faction_id: 10,
  unit_category: null,
  unit_model_count: null,
  status_assembly: 1,
  status_painting: "Battle Ready",
  painting_percentage: 100,
  tactical_role: null,
  udb_base_points: null,
  udb_role: null,
  udb_keywords: null,
  override_points: null,
  tier_points: null,
};

const opgAbility: UdbAbility = {
  id: 1,
  unit_id: "ds-001",
  line_order: 1,
  name: "Oath of Moment",
  description: "Once per battle, you can re-roll all hits.",
  ability_type: "Core",
};

const regularAbility: UdbAbility = {
  id: 2,
  unit_id: "ds-001",
  line_order: 2,
  name: "Bolter Discipline",
  description: "Re-roll hit rolls of 1.",
  ability_type: "Datasheet",
};

const rangedWeapon = makeWeapon({
  name: "Bolt Rifle",
  category: "Ranged",
  range: "24",
});

const meleeWeapon = makeWeapon({
  id: 2,
  name: "Close Combat Weapon",
  category: "Melee",
  range: "Melee",
  line_order: 2,
  skill: "3",
  strength: "4",
  ap: "0",
  damage: "1",
});

const datasheetWithWeapons: UdbUnitDetail = {
  id: "ds-001",
  faction_id: "F-SM",
  name: "Intercessors",
  role: "Battleline",
  base_points: 80,
  damaged_w: null,
  damaged_desc: null,
  models: [],
  weapons: [rangedWeapon, meleeWeapon],
  abilities: [opgAbility, regularAbility],
  keywords: [],
  points: [],
  composition: [],
};

const datasheetNoWeapons: UdbUnitDetail = {
  ...datasheetWithWeapons,
  weapons: [],
};

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockToggleAbilityUsed = vi.fn();
let mockUsedAbilities: string[] = [];

vi.mock("@/hooks/useDatasheet", () => ({
  useDatasheet: vi.fn(() => ({ data: datasheetWithWeapons, isLoading: false })),
}));

vi.mock("@/hooks/useStrategyNote", () => ({
  useStrategyNote: vi.fn(() => ({ data: null, isLoading: false })),
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

const { useDatasheet } = await import("@/hooks/useDatasheet");

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
  const trigger = screen.getByText(unit.unit_name).closest("button")!;
  await user.click(trigger);
  return user;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("UnitAbilityCard — Weapons section (Phase 110 INT-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsedAbilities = [];
    vi.mocked(useDatasheet).mockReturnValue({
      data: datasheetWithWeapons,
      isLoading: false,
    } as ReturnType<typeof useDatasheet>);
  });

  it("renders 'Weapons' label when datasheet has weapons", async () => {
    await renderCardExpanded();
    expect(screen.getByText("Weapons")).toBeInTheDocument();
  });

  it("renders 'Ranged' and 'Melee' sub-sections when both weapon types present", async () => {
    await renderCardExpanded();
    // The weapons section is collapsed by default, so we need to expand it
    const user = userEvent.setup();
    const weaponsTrigger = screen.getByText("Weapons").closest("button")!;
    await user.click(weaponsTrigger);

    expect(screen.getByText("Ranged")).toBeInTheDocument();
    // "Melee" appears both as the sub-section label and the weapon range cell value
    const meleeElements = screen.getAllByText("Melee");
    expect(meleeElements.length).toBeGreaterThanOrEqual(2);
    // Verify at least one is the section label (text-[10px] font-semibold)
    const sectionLabel = meleeElements.find((el) => el.className.includes("font-semibold"));
    expect(sectionLabel).toBeTruthy();
  });

  it("does NOT render 'Weapons' label when datasheet has no weapons", async () => {
    vi.mocked(useDatasheet).mockReturnValue({
      data: datasheetNoWeapons,
      isLoading: false,
    } as unknown as ReturnType<typeof useDatasheet>);

    await renderCardExpanded();
    expect(screen.queryByText("Weapons")).toBeNull();
  });

  it("weapons section defaults to collapsed (weapon names not visible until expanded)", async () => {
    await renderCardExpanded();
    // "Weapons" trigger text is visible
    expect(screen.getByText("Weapons")).toBeInTheDocument();
    // But the weapon name inside the collapsed content should not be visible
    // Note: Radix Collapsible with defaultOpen={false} hides content
    expect(screen.queryByText("Bolt Rifle")).toBeNull();
  });

  it("shows weapon names after expanding the Weapons collapsible", async () => {
    await renderCardExpanded();
    const user = userEvent.setup();
    const weaponsTrigger = screen.getByText("Weapons").closest("button")!;
    await user.click(weaponsTrigger);

    expect(screen.getByText("Bolt Rifle")).toBeInTheDocument();
    expect(screen.getByText("Close Combat Weapon")).toBeInTheDocument();
  });

  it("empty state message appears when no abilities, no weapons, and no notes", async () => {
    vi.mocked(useDatasheet).mockReturnValue({
      data: { ...datasheetNoWeapons, abilities: [] },
      isLoading: false,
    } as unknown as ReturnType<typeof useDatasheet>);

    await renderCardExpanded();
    expect(screen.getByText(/no ability data available/i)).toBeInTheDocument();
  });

  it("empty state message does NOT appear when weapons exist but no abilities/notes", async () => {
    vi.mocked(useDatasheet).mockReturnValue({
      data: { ...datasheetWithWeapons, abilities: [] },
      isLoading: false,
    } as unknown as ReturnType<typeof useDatasheet>);

    await renderCardExpanded();
    expect(screen.queryByText(/no ability data available/i)).toBeNull();
  });
});

describe("UnitAbilityCard — OPG key format (Phase 110 INT-03)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsedAbilities = [];
    vi.mocked(useDatasheet).mockReturnValue({
      data: datasheetWithWeapons,
      isLoading: false,
    } as ReturnType<typeof useDatasheet>);
  });

  it("OPG toggle calls toggleAbilityUsed with unit_id:ability_name format (single colon)", async () => {
    await renderCardExpanded();

    // Click the "Available" button for OPG ability
    const availableBtn = screen.getByRole("button", { name: "Available" });
    const user = userEvent.setup();
    await user.click(availableBtn);

    expect(mockToggleAbilityUsed).toHaveBeenCalledWith(1, "100:Oath of Moment");
  });

  it("OPG key does NOT use double-colon (::) format", async () => {
    await renderCardExpanded();

    const availableBtn = screen.getByRole("button", { name: "Available" });
    const user = userEvent.setup();
    await user.click(availableBtn);

    const calledKey = mockToggleAbilityUsed.mock.calls[0][1] as string;
    expect(calledKey).not.toContain("::");
    expect(calledKey).toBe("100:Oath of Moment");
  });

  it("OPG key uses ability.name not ability.id", async () => {
    await renderCardExpanded();

    const availableBtn = screen.getByRole("button", { name: "Available" });
    const user = userEvent.setup();
    await user.click(availableBtn);

    const calledKey = mockToggleAbilityUsed.mock.calls[0][1] as string;
    // Should contain the ability name "Oath of Moment", not ability id "1"
    expect(calledKey).toContain("Oath of Moment");
    // Should NOT be "100:1" (using ability.id)
    expect(calledKey).not.toBe("100:1");
  });

  it("marks OPG ability as used when key is in usedAbilities (single-colon format)", async () => {
    mockUsedAbilities = ["100:Oath of Moment"];
    await renderCardExpanded();

    // When ability is used, button text should be "Used"
    expect(screen.getByRole("button", { name: "Used" })).toBeInTheDocument();
  });
});
