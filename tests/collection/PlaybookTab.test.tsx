/**
 * Phase 9  -- PlaybookTab component tests.
 *
 * Covers STRAT-01 through STRAT-05. Mocks @/db/queries/strategyNotes so
 * useStrategyNote / useUpsertStrategyNote hooks resolve without tauri-plugin-sql.
 *
 * STRAT-01 tab-render coverage: this file mounts PlaybookTab inside a Tabs
 * harness (defaultValue="playbook") to exercise tab rendering. Full
 * UnitDetailSheet integration is verified by the manual checkpoint in Plan 09-03.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster, toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

vi.mock("@/db/queries/strategyNotes", async () => ({
  getStrategyNote: vi.fn(async () => null),
  upsertStrategyNote: vi.fn(async () => undefined),
}));

vi.mock("@/hooks/useDatasheet", () => ({
  useDatasheet: vi.fn(() => ({ data: null })),
  useWahapediaFactionId: vi.fn(() => ({ data: null })),
  DATASHEET_KEY: (id: number) => ["datasheet", id] as const,
}));
vi.mock("@/hooks/useUdbMeta", () => ({
  useUdbMeta: vi.fn(() => ({ data: null })),
  UDB_META_KEY: ["udb-meta"],
}));
vi.mock("@/hooks/useFactions", () => ({
  useFactions: vi.fn(() => ({ data: [{ id: 1, name: "Space Marines", color_theme: "#000", icon_path: null, game_system: "40k", description: null, created_at: "", updated_at: "" }] })),
}));
vi.mock("@/hooks/useUnits", () => ({
  useUnits: vi.fn(() => ({ data: [{ id: 42, name: "Test Unit", faction_id: 1, category: null, painting_percentage: 0, status_painting: "Unpainted", status_assembly: 0, status_basing: 0, status_varnished: 0, is_active_project: 0, model_count: null, owned_count: null, points: null, priority: null, target_completion_date: null, purchase_date: null, purchase_price_pence: null, storage_location: null, notes: null, created_at: "", updated_at: "" }] })),
  useUnit: vi.fn(() => ({ data: null })),
  useUpdateUnit: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  UNITS_KEY: ["units"],
}));
vi.mock("@/hooks/useUnitPointTiers", () => ({
  useUnitPointTiers: vi.fn(() => ({ data: [] })),
  useUpsertUnitPointTier: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteUnitPointTier: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  UNIT_POINT_TIERS_KEY: (id: number) => ["unit-point-tiers", id] as const,
}));
vi.mock("@/hooks/useUnitLoadouts", () => ({
  useUnitLoadouts: vi.fn(() => ({ data: [] })),
  useCreateLoadout: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteLoadout: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useActivateLoadout: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useAddWargearToLoadout: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useRemoveWargearFromLoadout: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  UNIT_LOADOUTS_KEY: (id: number) => ["unit-loadouts", id] as const,
}));
vi.mock("@/db/queries/unitDatabase", () => ({
  getUdbUnitDetail: vi.fn(async () => null),
}));
vi.mock("@/features/units/DatasheetPicker", () => ({
  DatasheetPicker: () => null, // render nothing  -- picker is tested separately
}));

vi.mock("@/hooks/useRulesFavorites", () => ({
  useRulesFavorites: vi.fn(() => ({ data: [] })),
  useUpsertRulesFavorite: vi.fn(() => ({ mutate: vi.fn() })),
  useDeleteRulesFavorite: vi.fn(() => ({ mutate: vi.fn() })),
}));

vi.mock("@/hooks/useRulesNotes", () => ({
  useRulesNotes: vi.fn(() => ({ data: [] })),
  useUpsertRulesNote: vi.fn(() => ({ mutate: vi.fn() })),
}));

// Phase 107: useRulesExtended mock removed (PlaybookRules returns null)

import * as queries from "@/db/queries/strategyNotes";
import * as datasheetHooks from "@/hooks/useDatasheet";

import { PlaybookTab } from "@/features/units/PlaybookTab";
import type { StrategyNote } from "@/types/strategyNote";


const getStrategyNoteMock = queries.getStrategyNote as unknown as ReturnType<typeof vi.fn>;
const upsertStrategyNoteMock = queries.upsertStrategyNote as unknown as ReturnType<typeof vi.fn>;

function makeNote(over: Partial<StrategyNote> = {}): StrategyNote {
  return {
    id: 1,
    unit_id: 42,
    battlefield_role: null,
    strengths: null,
    weaknesses: null,
    best_targets: null,
    synergies: null,
    mistakes_to_avoid: null,
    rules_references: null,
    notes: null,
    move: null,
    toughness: null,
    save: null,
    wounds: null,
    leadership: null,
    objective_control: null,
    keywords: null,
    abilities: null,
    created_at: "2026-05-02",
    updated_at: "2026-05-02",
    ...over,
  };
}

function renderInsideTabs(unitId = 42) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const utils = render(
    <QueryClientProvider client={qc}>
      <Tabs defaultValue="playbook">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="playbook">Playbook</TabsTrigger>
        </TabsList>
        <TabsContent value="details">
          <div>Details content placeholder</div>
        </TabsContent>
        <TabsContent value="playbook">
          <PlaybookTab unitId={unitId} />
        </TabsContent>
      </Tabs>
      <Toaster />
    </QueryClientProvider>
  );
  return { qc, ...utils };
}

beforeEach(() => {
  getStrategyNoteMock.mockReset();
  upsertStrategyNoteMock.mockReset();
  // Default: no existing note (most tests use this; specific tests override)
  getStrategyNoteMock.mockResolvedValue(null);
  upsertStrategyNoteMock.mockResolvedValue(undefined);

});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("STRAT-01  -- Playbook tab renders inside UnitDetailSheet", () => {
  it("renders the Playbook tab trigger alongside the Details trigger", async () => {
    renderInsideTabs();
    expect(screen.getByRole("tab", { name: /Details/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Playbook/ })).toBeInTheDocument();
  });

  it("switches to Playbook tab content on click without closing the sheet", async () => {
    const user = userEvent.setup();
    renderInsideTabs();
    // We start on Playbook (defaultValue)  -- verify Save Playbook is present
    expect(await screen.findByRole("button", { name: /Save Playbook/ })).toBeInTheDocument();
    // Switch to Details
    await user.click(screen.getByRole("tab", { name: /Details/ }));
    expect(await screen.findByText(/Details content placeholder/)).toBeInTheDocument();
    // Switch back to Playbook
    await user.click(screen.getByRole("tab", { name: /Playbook/ }));
    expect(await screen.findByRole("button", { name: /Save Playbook/ })).toBeInTheDocument();
  });
});

describe("STRAT-02  -- Stats block displays values with suffixes", () => {
  it("renders six stat cells in order M, T, Sv, W, Ld, OC", async () => {
    renderInsideTabs();
    // Wait for hook query to settle
    await screen.findByRole("button", { name: /Save Playbook/ });
    const labels = screen.getAllByText(/^(M|T|Sv|W|Ld|OC)$/);
    const visibleOrder = labels.map((el) => el.textContent);
    expect(visibleOrder).toEqual(["M", "T", "Sv", "W", "Ld", "OC"]);
  });

  it("displays  -- placeholder when a stat value is null", async () => {
    getStrategyNoteMock.mockResolvedValueOnce(makeNote()); // all stats null
    renderInsideTabs();
    await screen.findByRole("button", { name: /Save Playbook/ });
    const dashes = screen.getAllByText("--");
    // 6 stat cells, all null â†’ 6 double-hyphens minimum (other em-dashes elsewhere are unlikely on this tab)
    expect(dashes.length).toBeGreaterThanOrEqual(6);
  });

  it("appends suffix at display time only (M=\", Sv/Ld/OC=+, T/W=raw)", async () => {
    getStrategyNoteMock.mockResolvedValueOnce(
      makeNote({
        move: 6,
        toughness: 4,
        save: 3,
        wounds: 2,
        leadership: 7,
        objective_control: 1,
      })
    );
    renderInsideTabs();
    // Wait for data to be rendered  -- 6" appears only after the hook resolves with stat data
    expect(await screen.findByText(`6"`)).toBeInTheDocument();
    expect(screen.getByText("3+")).toBeInTheDocument();
    expect(screen.getByText("7+")).toBeInTheDocument();
    expect(screen.getByText("1+")).toBeInTheDocument();
    // T=4 and W=2 are raw integers  -- pick them up by their value text
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("enters edit mode when the Pencil button is clicked, switching cells to number inputs", async () => {
    const user = userEvent.setup();
    getStrategyNoteMock.mockResolvedValueOnce(makeNote({ move: 6, toughness: 4, save: 3, wounds: 2, leadership: 7, objective_control: 1 }));
    renderInsideTabs();
    await screen.findByRole("button", { name: /Save Playbook/ });
    const editBtn = screen.getByRole("button", { name: /Edit stats/ });
    await user.click(editBtn);
    // 6 number inputs should now be present (one per stat cell)
    const numberInputs = screen.getAllByRole("spinbutton");
    expect(numberInputs.length).toBeGreaterThanOrEqual(6);
  });
});

describe("STRAT-03  -- Abilities and Keywords fields render", () => {
  it("renders Abilities textarea with rows=3 and accepts user input", async () => {
    const user = userEvent.setup();
    renderInsideTabs();
    await screen.findByRole("button", { name: /Save Playbook/ });
    const abilitiesTa = screen.getByLabelText(/Personal Ability Notes/) as HTMLTextAreaElement;
    expect(abilitiesTa.tagName).toBe("TEXTAREA");
    expect(abilitiesTa.rows).toBe(3);
    await user.type(abilitiesTa, "Deep Strike");
    expect(abilitiesTa.value).toBe("Deep Strike");
  });

  it("renders Keywords single-line Input and accepts comma-separated text", async () => {
    const user = userEvent.setup();
    renderInsideTabs();
    await screen.findByRole("button", { name: /Save Playbook/ });
    const keywordsInput = screen.getByLabelText(/Keywords/) as HTMLInputElement;
    expect(keywordsInput.tagName).toBe("INPUT");
    expect(keywordsInput.type).toBe("text");
    await user.type(keywordsInput, "Infantry, Battleline");
    expect(keywordsInput.value).toBe("Infantry, Battleline");
  });
});

describe("STRAT-04  -- Eight strategy note fields render in correct order", () => {
  const EXPECTED_LABELS = [
    "Battlefield Role",
    "Strengths",
    "Weaknesses",
    "Best Targets",
    "Synergies",
    "Mistakes to Avoid",
    "Rules Page References",
    "Personal Notes",
  ];

  it("renders all 8 strategy note labels in the order specified by STRAT-04", async () => {
    renderInsideTabs();
    await screen.findByRole("button", { name: /Save Playbook/ });
    // For each expected label, capture its DOM index  -- confirm strictly increasing
    const positions = EXPECTED_LABELS.map((label) => {
      const el = screen.getByText(label);
      return Array.from(document.querySelectorAll("label, span")).indexOf(el);
    });
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
  });

  it("each strategy note field is an editable textarea (rows=2)", async () => {
    const user = userEvent.setup();
    renderInsideTabs();
    await screen.findByRole("button", { name: /Save Playbook/ });
    for (const label of EXPECTED_LABELS) {
      const ta = screen.getByLabelText(label) as HTMLTextAreaElement;
      expect(ta.tagName).toBe("TEXTAREA");
      expect(ta.rows).toBe(2);
      await user.type(ta, "x");
      expect(ta.value.endsWith("x")).toBe(true);
    }
  });
});

describe("STRAT-05  -- Save button dirty-state and inline save", () => {
  it("Save button is disabled when no field has changed since load", async () => {
    getStrategyNoteMock.mockResolvedValueOnce(makeNote({ battlefield_role: "Anvil" }));
    renderInsideTabs();
    const saveBtn = await screen.findByRole("button", { name: /Save Playbook/ });
    expect(saveBtn).toBeDisabled();
  });

  it("Save button enables after any field is edited", async () => {
    const user = userEvent.setup();
    renderInsideTabs();
    const saveBtn = await screen.findByRole("button", { name: /Save Playbook/ });
    expect(saveBtn).toBeDisabled();
    const abilitiesTa = screen.getByLabelText(/Personal Ability Notes/);
    await user.type(abilitiesTa, "Deep Strike");
    expect(saveBtn).not.toBeDisabled();
  });

  it("clicking Save calls upsertStrategyNote with full payload and shows success toast", async () => {
    const user = userEvent.setup();
    const successSpy = vi.spyOn(toast, "success");
    renderInsideTabs();
    const saveBtn = await screen.findByRole("button", { name: /Save Playbook/ });
    await user.type(screen.getByLabelText(/Personal Ability Notes/), "Deep Strike");
    await user.type(screen.getByLabelText(/Keywords/), "Infantry");
    await user.click(saveBtn);
    await vi.waitFor(() => {
      expect(upsertStrategyNoteMock).toHaveBeenCalledTimes(1);
    });
    const payload = upsertStrategyNoteMock.mock.calls[0][0];
    expect(payload.unit_id).toBe(42);
    expect(payload.abilities).toBe("Deep Strike");
    expect(payload.keywords).toBe("Infantry");
    // 17 fields total in the payload (unit_id + 16 user-editable)
    expect(Object.keys(payload).length).toBe(17);
    await vi.waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith("Playbook saved");
    });
    successSpy.mockRestore();
  });

  it("on save error shows error toast with actual error message and re-enables the Save button", async () => {
    const user = userEvent.setup();
    upsertStrategyNoteMock.mockRejectedValueOnce(new Error("DB failure"));
    const errorSpy = vi.spyOn(toast, "error");
    renderInsideTabs();
    const saveBtn = await screen.findByRole("button", { name: /Save Playbook/ });
    await user.type(screen.getByLabelText(/Personal Ability Notes/), "Deep Strike");
    await user.click(saveBtn);
    await vi.waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith("Failed to save playbook: DB failure");
    });
    // Save button re-enabled because isDirty stays true (no snapshot update on failure)
    expect(saveBtn).not.toBeDisabled();
    errorSpy.mockRestore();
  });
});

describe("PlaybookTab  -- DS-09 Datasheet Abilities collapsible", () => {
  it("DS-09: renders Core/Faction/Unit sub-groups when useDatasheet returns abilities of all 3 types", async () => {
    const fakeDatasheet = {
      id: "001", name: "Intercessors", faction_id: "SM", role: "Battleline", base_points: 80, damaged_w: null, damaged_desc: null,
      models: [{ id: "m1", unit_id: "001", line_order: 1, name: "Intercessor", M: "6\"", T: "4", Sv: "3+", inv_sv: null, W: "2", Ld: "6+", OC: "2" }],
      abilities: [
        { id: 1, unit_id: "001", line_order: 1, name: "Oath of Moment", description: "Re-roll hits", ability_type: "Faction" },
        { id: 2, unit_id: "001", line_order: 2, name: "Bolter Discipline", description: "Sustained Hits 1", ability_type: "Datasheet" },
        { id: 3, unit_id: "001", line_order: 3, name: "Tactical Battle Brothers", description: "Core thing", ability_type: "Core" },
      ],
      keywords: [], weapons: [], points: [], composition: [],
    };
    (datasheetHooks.useDatasheet as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({ data: fakeDatasheet });
    renderInsideTabs(42);
    await screen.findByText("Datasheet Abilities");
    expect(screen.getByText("Core Abilities")).toBeInTheDocument();
    expect(screen.getByText("Faction Abilities")).toBeInTheDocument();
    expect(screen.getByText("Unit Abilities")).toBeInTheDocument();
    expect(screen.getByText("Tactical Battle Brothers")).toBeInTheDocument();
    expect(screen.getByText("Oath of Moment")).toBeInTheDocument();
    expect(screen.getByText("Bolter Discipline")).toBeInTheDocument();
  });

  it("DS-09: hides the entire Datasheet Abilities collapsible when datasheet has zero abilities", async () => {
    const fakeDatasheet = {
      id: "001", name: "X", faction_id: "SM", role: null, base_points: null, damaged_w: null, damaged_desc: null,
      models: [], abilities: [], keywords: [], weapons: [], points: [], composition: [],
    };
    (datasheetHooks.useDatasheet as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({ data: fakeDatasheet });
    renderInsideTabs(42);
    expect(screen.queryByText("Datasheet Abilities")).toBeNull();
  });
});

describe("PlaybookTab  -- DS-10 Sources list", () => {
  // Phase 107: Sources section removed (UdbUnitDetail has no source field)
  it.todo("DS-10: renders Sources section with the source publication name when datasheet has a source");
});

describe("PlaybookTab  -- DS-11 Personal Ability Notes textarea label rename", () => {
  it("DS-11: textarea labeled 'Personal Ability Notes' (not 'Abilities') for the personal notes field with id='playbook-abilities'", () => {
    renderInsideTabs(42);
    expect(screen.getByLabelText("Personal Ability Notes")).toBeInTheDocument();
    // Ensure no element renders the old 'Abilities' label as a standalone label/div for the textarea
    const oldLabel = screen.queryAllByText((content) => content === "Abilities");
    expect(oldLabel.length).toBe(0);
  });
});

describe("PlaybookTab  -- DS-12 multi-profile note", () => {
  it("DS-12: renders 'Additional model profiles available' note when datasheet.models has more than one row", async () => {
    const fakeDatasheet = {
      id: "001", name: "X", faction_id: "SM", role: null, base_points: null, damaged_w: null, damaged_desc: null,
      models: [
        { id: "m1", unit_id: "001", line_order: 1, name: "X (Sergeant)", M: "6\"", T: "4", Sv: "3+", inv_sv: null, W: "2", Ld: "6+", OC: "2" },
        { id: "m2", unit_id: "001", line_order: 2, name: "X (Body)", M: "6\"", T: "4", Sv: "3+", inv_sv: null, W: "2", Ld: "7+", OC: "2" },
      ],
      abilities: [], keywords: [], weapons: [], points: [], composition: [],
    };
    (datasheetHooks.useDatasheet as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({ data: fakeDatasheet });
    renderInsideTabs(42);
    expect(await screen.findByText("Additional model profiles available -- see Datasheet Abilities for details.")).toBeInTheDocument();
  });

  it("DS-12: does NOT render the multi-profile note when datasheet.models has exactly one row", async () => {
    const fakeDatasheet = {
      id: "001", name: "X", faction_id: "SM", role: null, base_points: null, damaged_w: null, damaged_desc: null,
      models: [{ id: "m1", unit_id: "001", line_order: 1, name: "X", M: "6\"", T: "4", Sv: "3+", inv_sv: null, W: "2", Ld: "6+", OC: "2" }],
      abilities: [], keywords: [], weapons: [], points: [], composition: [],
    };
    (datasheetHooks.useDatasheet as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({ data: fakeDatasheet });
    renderInsideTabs(42);
    expect(screen.queryByText("Additional model profiles available -- see Datasheet Abilities for details.")).toBeNull();
  });
});

describe("PlaybookTab  -- Weapons section (Phase 15 wargear)", () => {
  const boltRifle = {
    id: 1, unit_id: "001", weapon_group: 1, line_order: 1,
    name: "Bolt Rifle", range: "24", category: "Ranged", attacks: "2", skill: "3",
    strength: "4", ap: "-1", damage: "1", keywords: null,
  };

  function makeWeaponsDatasheet(weapons: typeof boltRifle[]) {
    return {
      id: "001", name: "Intercessors", faction_id: "SM", role: "Battleline", base_points: 80, damaged_w: null, damaged_desc: null,
      models: [{ id: "m1", unit_id: "001", line_order: 1, name: "Intercessor", M: "6\"", T: "4", Sv: "3+", inv_sv: null, W: "2", Ld: "6+", OC: "2" }],
      abilities: [], keywords: [], points: [], composition: [],
      weapons,
    };
  }

  it("G-5: renders 'Weapons' heading when wargear array is non-empty", async () => {
    (datasheetHooks.useDatasheet as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({ data: makeWeaponsDatasheet([boltRifle]) });
    renderInsideTabs(42);
    expect(await screen.findByText("Weapons")).toBeInTheDocument();
  });

  it("G-5: renders weapon name ‘Bolt Rifle’ and its stat values in the weapons table", async () => {
    (datasheetHooks.useDatasheet as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({ data: makeWeaponsDatasheet([boltRifle]) });
    renderInsideTabs(42);
    await screen.findByText("Weapons");
    expect(screen.getByText("Bolt Rifle")).toBeInTheDocument();
    // range: "24" -> displayed as 24"
    expect(screen.getByText('24"')).toBeInTheDocument();
    // A: "2", BS_WS: "3" -> displayed as "3+" in the weapon table; stat block also shows "3+" for Sv
    // Use getAllByText since statValue fallback now renders canonical Sv stat AND weapon skill both as "3+"
    expect(screen.getAllByText("3+").length).toBeGreaterThanOrEqual(1);
  });

  it("G-5: does NOT render 'Weapons' heading when wargear is an empty array", async () => {
    (datasheetHooks.useDatasheet as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({ data: makeWeaponsDatasheet([]) });
    renderInsideTabs(42);
    // Wait for the component to settle
    await screen.findByRole("button", { name: /Save Playbook/ });
    expect(screen.queryByText("Weapons")).toBeNull();
  });
});

// Phase 107: PlaybookRules returns null (rules.db eliminated)
// All SCHEMA-* and PLAY-* annotation tests are deferred until EXT-03 adds
// stratagems, detachments, and shared abilities to the canonical database.

describe("PlaybookTab — SCHEMA-01 Stratagems (Phase 107: deferred)", () => {
  it.todo("SCHEMA-01: renders 'Stratagems' heading when useStratagemsByFaction returns data");
  it.todo("SCHEMA-01: renders stratagem name, CP cost, and phase group header");
  it.todo("SCHEMA-01: renders stratagem description text");

  it("SCHEMA-01: hides Stratagems section when hook returns empty array", async () => {
    renderInsideTabs(42);
    await screen.findByRole("button", { name: /Save Playbook/ });
    expect(screen.queryByText("Stratagems")).toBeNull();
  });
});

describe("PlaybookTab — SCHEMA-02 Detachments (Phase 107: deferred)", () => {
  it.todo("SCHEMA-02: renders 'Detachments' heading when useDetachmentsByFaction returns data");
  it.todo("SCHEMA-02: renders detachment name and legend text");

  it("SCHEMA-02: hides Detachments section when hook returns empty array", async () => {
    renderInsideTabs(42);
    await screen.findByRole("button", { name: /Save Playbook/ });
    expect(screen.queryByText("Detachments")).toBeNull();
  });
});

describe("PlaybookTab — SCHEMA-03 Detachment abilities (Phase 107: deferred)", () => {
  it.todo("SCHEMA-03: renders ability name nested under detachment");
});

describe("PlaybookTab — SCHEMA-04 Shared Faction Abilities (Phase 107: deferred)", () => {
  it.todo("SCHEMA-04: renders 'Shared Faction Abilities' heading");
  it.todo("SCHEMA-04: renders shared ability name and description");

  it("SCHEMA-04: hides section when hook returns empty array", async () => {
    renderInsideTabs(42);
    await screen.findByRole("button", { name: /Save Playbook/ });
    expect(screen.queryByText("Shared Faction Abilities")).toBeNull();
  });
});

describe("PlaybookTab — combined absence of extended sections", () => {
  it("shows none of the extended section headings when PlaybookRules returns null (Phase 107)", async () => {
    renderInsideTabs(42);
    await screen.findByRole("button", { name: /Save Playbook/ });
    expect(screen.queryByText("Stratagems")).toBeNull();
    expect(screen.queryByText("Detachments")).toBeNull();
    expect(screen.queryByText("Shared Faction Abilities")).toBeNull();
  });
});

describe("PlaybookTab — PLAY-01/02 annotation controls (Phase 107: deferred)", () => {
  it.todo("PLAY-01: shows star button for stratagems");
  it.todo("PLAY-02: shows flag button for stratagems");
  it.todo("PLAY-01: shows filled yellow star for favorited stratagem");
  it.todo("PLAY-04: applies annotation styling to stratagem entry");
  it.todo("PLAY-01: shows star button for detachment abilities");
  it.todo("PLAY-02: shows flag button for detachment abilities");
  it.todo("PLAY-01: shows filled yellow star for favorited detachment ability");
  it.todo("PLAY-04: applies annotation styling to detachment ability entry");
  it.todo("PLAY-01: shows star button for shared faction abilities");
  it.todo("PLAY-02: shows flag button for shared faction abilities");
  it.todo("PLAY-01: shows filled yellow star for favorited shared ability");
  it.todo("PLAY-04: applies annotation styling to shared ability entry");
  it.todo("PLAY-03: shows StickyNote indicator on shared ability when note exists");
});

describe("PlaybookTab -- INT-01 statValue canonical fallback", () => {
  const canonicalDatasheet = {
    id: "001", name: "Intercessors", faction_id: "SM", role: "Battleline",
    base_points: 80, damaged_w: null, damaged_desc: null,
    models: [{
      id: "m1", unit_id: "001", line_order: 1, name: "Intercessor",
      M: "6\"", T: "4", Sv: "3+", inv_sv: null, W: "2", Ld: "6+", OC: "2",
    }],
    abilities: [], keywords: [], weapons: [], points: [], composition: [],
  };

  it("INT-01: when hasDatasheetLink is true and local stats are null, stat cells show canonical values from useDatasheet", async () => {
    // Strategy note exists but all stats are null
    getStrategyNoteMock.mockResolvedValueOnce(makeNote());
    // Datasheet provides canonical stats
    (datasheetHooks.useDatasheet as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: canonicalDatasheet });
    renderInsideTabs(42);
    await screen.findByRole("button", { name: /Save Playbook/ });
    // Canonical stats should render: M=6 -> 6", T=4, Sv=3 -> 3+, W=2, Ld=6 -> 6+, OC=2 -> 2+
    expect(screen.getByText('6"')).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getAllByText("3+").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("6+")).toBeInTheDocument();
    expect(screen.getByText("2+")).toBeInTheDocument();
  });

  it("INT-01 / D-02: when hasDatasheetLink is true and local stat is non-null, stat cell shows user value (not canonical)", async () => {
    // User entered move=12 but canonical M is 6
    getStrategyNoteMock.mockResolvedValueOnce(makeNote({ move: 12 }));
    (datasheetHooks.useDatasheet as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: canonicalDatasheet });
    renderInsideTabs(42);
    // Wait for the strategy note to resolve and populate local state
    await vi.waitFor(() => {
      expect(screen.getByText('12"')).toBeInTheDocument();
    });
    // User's move=12 should display as 12", NOT canonical 6"
    expect(screen.queryByText('6"')).not.toBeInTheDocument();
  });

  it("INT-01: when hasDatasheetLink is false and local stat is null, stat cell shows placeholder dash", async () => {
    // No datasheet link (useDatasheet returns null)
    getStrategyNoteMock.mockResolvedValueOnce(makeNote());
    (datasheetHooks.useDatasheet as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: null });
    renderInsideTabs(42);
    await screen.findByRole("button", { name: /Save Playbook/ });
    // All 6 stats are null with no datasheet -> should show "--" for each
    const dashes = screen.getAllByText("--");
    expect(dashes.length).toBeGreaterThanOrEqual(6);
  });
});

describe("PlaybookTab  -- datasheet error state", () => {
  it("renders error banner when useDatasheet returns an error", async () => {
    (datasheetHooks.useDatasheet as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      data: undefined,
      error: new Error("no such table: rw_datasheets"),
    });
    renderInsideTabs(42);
    expect(await screen.findByText(/Failed to load datasheet: no such table: rw_datasheets/)).toBeInTheDocument();
  });
});
