/**
 * Phase 9 — PlaybookTab component tests.
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
  useRulesSyncMeta: vi.fn(() => ({ data: null })),
  useWahapediaFactionId: vi.fn(() => ({ data: null })),
  DATASHEET_KEY: (id: number) => ["datasheet", id] as const,
}));
vi.mock("@/hooks/useRulesSync", () => ({
  useRulesSync: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
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
vi.mock("@/db/queries/datasheets", () => ({
  upsertDatasheetLink: vi.fn(async () => undefined),
  getFullDatasheet: vi.fn(async () => null),
  resolveWahapediaFactionIdByName: vi.fn(async () => null),
}));
vi.mock("@/features/units/DatasheetPicker", () => ({
  DatasheetPicker: () => null, // render nothing — picker is tested separately
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

const useStratagemsByFactionMock = vi.fn();
const useDetachmentsByFactionMock = vi.fn();
const useSharedAbilitiesByFactionMock = vi.fn();
const useDetachmentAbilitiesByDetachmentMock = vi.fn();

vi.mock("@/hooks/useRulesExtended", () => ({
  useStratagemsByFaction: (factionId: string | undefined) => useStratagemsByFactionMock(factionId),
  useDetachmentsByFaction: (factionId: string | undefined) => useDetachmentsByFactionMock(factionId),
  useSharedAbilitiesByFaction: (factionId: string | undefined) => useSharedAbilitiesByFactionMock(factionId),
  useDetachmentAbilitiesByDetachment: (detachmentId: string | undefined) => useDetachmentAbilitiesByDetachmentMock(detachmentId),
}));

import * as queries from "@/db/queries/strategyNotes";
import * as datasheetHooks from "@/hooks/useDatasheet";
import * as rulesFavoritesHooks from "@/hooks/useRulesFavorites";
import * as rulesNotesHooks from "@/hooks/useRulesNotes";
import { PlaybookTab } from "@/features/units/PlaybookTab";
import type { StrategyNote } from "@/types/strategyNote";
import type { RulesFavorite } from "@/types/rulesFavorite";
import type { RulesNote } from "@/types/rulesNote";

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
  // Reset extended rules mocks to empty default
  useStratagemsByFactionMock.mockReset().mockReturnValue({ data: [] });
  useDetachmentsByFactionMock.mockReset().mockReturnValue({ data: [] });
  useSharedAbilitiesByFactionMock.mockReset().mockReturnValue({ data: [] });
  useDetachmentAbilitiesByDetachmentMock.mockReset().mockReturnValue({ data: [] });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("STRAT-01 — Playbook tab renders inside UnitDetailSheet", () => {
  it("renders the Playbook tab trigger alongside the Details trigger", async () => {
    renderInsideTabs();
    expect(screen.getByRole("tab", { name: /Details/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Playbook/ })).toBeInTheDocument();
  });

  it("switches to Playbook tab content on click without closing the sheet", async () => {
    const user = userEvent.setup();
    renderInsideTabs();
    // We start on Playbook (defaultValue) — verify Save Playbook is present
    expect(await screen.findByRole("button", { name: /Save Playbook/ })).toBeInTheDocument();
    // Switch to Details
    await user.click(screen.getByRole("tab", { name: /Details/ }));
    expect(await screen.findByText(/Details content placeholder/)).toBeInTheDocument();
    // Switch back to Playbook
    await user.click(screen.getByRole("tab", { name: /Playbook/ }));
    expect(await screen.findByRole("button", { name: /Save Playbook/ })).toBeInTheDocument();
  });
});

describe("STRAT-02 — Stats block displays values with suffixes", () => {
  it("renders six stat cells in order M, T, Sv, W, Ld, OC", async () => {
    renderInsideTabs();
    // Wait for hook query to settle
    await screen.findByRole("button", { name: /Save Playbook/ });
    const labels = screen.getAllByText(/^(M|T|Sv|W|Ld|OC)$/);
    const visibleOrder = labels.map((el) => el.textContent);
    expect(visibleOrder).toEqual(["M", "T", "Sv", "W", "Ld", "OC"]);
  });

  it("displays — placeholder when a stat value is null", async () => {
    getStrategyNoteMock.mockResolvedValueOnce(makeNote()); // all stats null
    renderInsideTabs();
    await screen.findByRole("button", { name: /Save Playbook/ });
    const dashes = screen.getAllByText("—");
    // 6 stat cells, all null → 6 em-dashes minimum (other em-dashes elsewhere are unlikely on this tab)
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
    // Wait for data to be rendered — 6" appears only after the hook resolves with stat data
    expect(await screen.findByText(`6"`)).toBeInTheDocument();
    expect(screen.getByText("3+")).toBeInTheDocument();
    expect(screen.getByText("7+")).toBeInTheDocument();
    expect(screen.getByText("1+")).toBeInTheDocument();
    // T=4 and W=2 are raw integers — pick them up by their value text
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

describe("STRAT-03 — Abilities and Keywords fields render", () => {
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

describe("STRAT-04 — Eight strategy note fields render in correct order", () => {
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
    // For each expected label, capture its DOM index — confirm strictly increasing
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

describe("STRAT-05 — Save button dirty-state and inline save", () => {
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

describe("PlaybookTab — DS-09 Datasheet Abilities collapsible", () => {
  it("DS-09: renders Core/Faction/Unit sub-groups when useDatasheet returns abilities of all 3 types", async () => {
    const fakeDatasheet = {
      ds: { id: "001", name: "Intercessors", faction_id: "SM", source_id: "src1", role: "Battleline", damaged_w: null, damaged_description: null },
      models: [{ datasheet_id: "001", line: 1, name: "Intercessor", M: "6\"", T: 4, Sv: "3+", inv_sv: null, W: 2, Ld: "6+", OC: 2 }],
      abilities: [
        { datasheet_id: "001", line: 1, ability_id: "a1", name: "Oath of Moment", description: "Re-roll hits", type: "Faction", parameter: null },
        { datasheet_id: "001", line: 2, ability_id: "a2", name: "Bolter Discipline", description: "Sustained Hits 1", type: "Datasheet", parameter: null },
        { datasheet_id: "001", line: 3, ability_id: "a3", name: "Tactical Battle Brothers", description: "Core thing", type: "Core", parameter: null },
      ],
      keywords: [],
      source: { id: "src1", name: "Codex: Space Marines", type: "Codex", edition: 10, version: "1.0", errata_date: null },
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
      ds: { id: "001", name: "X", faction_id: "SM", source_id: null, role: null, damaged_w: null, damaged_description: null },
      models: [], abilities: [], keywords: [], source: null,
    };
    (datasheetHooks.useDatasheet as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({ data: fakeDatasheet });
    renderInsideTabs(42);
    expect(screen.queryByText("Datasheet Abilities")).toBeNull();
  });
});

describe("PlaybookTab — DS-10 Sources list", () => {
  it("DS-10: renders Sources section with the source publication name when datasheet has a source", async () => {
    const fakeDatasheet = {
      ds: { id: "001", name: "Intercessors", faction_id: "SM", source_id: "src1", role: "Battleline", damaged_w: null, damaged_description: null },
      models: [{ datasheet_id: "001", line: 1, name: "Intercessor", M: "6\"", T: 4, Sv: "3+", inv_sv: null, W: 2, Ld: "6+", OC: 2 }],
      abilities: [], keywords: [],
      source: { id: "src1", name: "Codex: Space Marines 10th Ed.", type: "Codex", edition: 10, version: "1.0", errata_date: null },
    };
    (datasheetHooks.useDatasheet as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({ data: fakeDatasheet });
    renderInsideTabs(42);
    await screen.findByText("Sources");
    expect(screen.getByText("Codex: Space Marines 10th Ed.")).toBeInTheDocument();
  });
});

describe("PlaybookTab — DS-11 Personal Ability Notes textarea label rename", () => {
  it("DS-11: textarea labeled 'Personal Ability Notes' (not 'Abilities') for the personal notes field with id='playbook-abilities'", () => {
    renderInsideTabs(42);
    expect(screen.getByLabelText("Personal Ability Notes")).toBeInTheDocument();
    // Ensure no element renders the old 'Abilities' label as a standalone label/div for the textarea
    const oldLabel = screen.queryAllByText((content) => content === "Abilities");
    expect(oldLabel.length).toBe(0);
  });
});

describe("PlaybookTab — DS-12 multi-profile note", () => {
  it("DS-12: renders 'Additional model profiles available' note when datasheet.models has more than one row", async () => {
    const fakeDatasheet = {
      ds: { id: "001", name: "X", faction_id: "SM", source_id: null, role: null, damaged_w: null, damaged_description: null },
      models: [
        { datasheet_id: "001", line: 1, name: "X (Sergeant)", M: "6\"", T: 4, Sv: "3+", inv_sv: null, W: 2, Ld: "6+", OC: 2 },
        { datasheet_id: "001", line: 2, name: "X (Body)", M: "6\"", T: 4, Sv: "3+", inv_sv: null, W: 2, Ld: "7+", OC: 2 },
      ],
      abilities: [], keywords: [], source: null,
      wargear: [],
    };
    (datasheetHooks.useDatasheet as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({ data: fakeDatasheet });
    renderInsideTabs(42);
    expect(await screen.findByText("Additional model profiles available — see Datasheet Abilities for details.")).toBeInTheDocument();
  });

  it("DS-12: does NOT render the multi-profile note when datasheet.models has exactly one row", async () => {
    const fakeDatasheet = {
      ds: { id: "001", name: "X", faction_id: "SM", source_id: null, role: null, damaged_w: null, damaged_description: null },
      models: [{ datasheet_id: "001", line: 1, name: "X", M: "6\"", T: 4, Sv: "3+", inv_sv: null, W: 2, Ld: "6+", OC: 2 }],
      abilities: [], keywords: [], source: null,
      wargear: [],
    };
    (datasheetHooks.useDatasheet as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({ data: fakeDatasheet });
    renderInsideTabs(42);
    expect(screen.queryByText("Additional model profiles available — see Datasheet Abilities for details.")).toBeNull();
  });
});

describe("PlaybookTab — Weapons section (Phase 15 wargear)", () => {
  const boltRifle = {
    datasheet_id: "001", line: 1, line_in_wargear: 1,
    name: "Bolt Rifle", range: "24", type: "Ranged", A: "2", BS_WS: "3",
    S: "4", AP: "-1", D: "1", dice: null, description: null,
  };

  function makeWargearDatasheet(wargear: typeof boltRifle[]) {
    return {
      ds: { id: "001", name: "Intercessors", faction_id: "SM", source_id: null, role: "Battleline", damaged_w: null, damaged_description: null },
      models: [{ datasheet_id: "001", line: 1, name: "Intercessor", M: "6\"", T: 4, Sv: "3+", inv_sv: null, W: 2, Ld: "6+", OC: 2 }],
      abilities: [], keywords: [], source: null,
      wargear,
    };
  }

  it("G-5: renders 'Weapons' heading when wargear array is non-empty", async () => {
    (datasheetHooks.useDatasheet as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({ data: makeWargearDatasheet([boltRifle]) });
    renderInsideTabs(42);
    expect(await screen.findByText("Weapons")).toBeInTheDocument();
  });

  it("G-5: renders weapon name 'Bolt Rifle' and its stat values in the weapons table", async () => {
    (datasheetHooks.useDatasheet as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({ data: makeWargearDatasheet([boltRifle]) });
    renderInsideTabs(42);
    await screen.findByText("Weapons");
    expect(screen.getByText("Bolt Rifle")).toBeInTheDocument();
    // range: "24" → displayed as 24"
    expect(screen.getByText('24"')).toBeInTheDocument();
    // A: "2", BS_WS: "3" → displayed as "3+", AP: "-1", D: "1", S: "4"
    expect(screen.getByText("3+")).toBeInTheDocument();
  });

  it("G-5: does NOT render 'Weapons' heading when wargear is an empty array", async () => {
    (datasheetHooks.useDatasheet as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({ data: makeWargearDatasheet([]) });
    renderInsideTabs(42);
    // Wait for the component to settle
    await screen.findByRole("button", { name: /Save Playbook/ });
    expect(screen.queryByText("Weapons")).toBeNull();
  });
});

describe("PlaybookTab — SCHEMA-01 Stratagems", () => {
  const sampleStratagem = {
    id: "s1",
    faction_id: "SM",
    name: "Armour of Contempt",
    type: "Battle Tactic",
    cp_cost: "1",
    legend: null,
    turn: "Your turn",
    phase: "Command phase",
    detachment: null,
    detachment_id: null,
    description: "Improve AP by 1",
  };

  it("SCHEMA-01: renders 'Stratagems' heading when useStratagemsByFaction returns data", async () => {
    useStratagemsByFactionMock.mockReturnValue({ data: [sampleStratagem] });
    renderInsideTabs(42);
    expect(await screen.findByText("Stratagems")).toBeInTheDocument();
  });

  it("SCHEMA-01: renders stratagem name, CP cost, and phase group header", async () => {
    useStratagemsByFactionMock.mockReturnValue({ data: [sampleStratagem] });
    renderInsideTabs(42);
    await screen.findByText("Stratagems");
    expect(screen.getByText("Armour of Contempt")).toBeInTheDocument();
    expect(screen.getByText("1 CP")).toBeInTheDocument();
    expect(screen.getByText("Command phase")).toBeInTheDocument();
  });

  it("SCHEMA-01: renders stratagem description text", async () => {
    useStratagemsByFactionMock.mockReturnValue({ data: [sampleStratagem] });
    renderInsideTabs(42);
    await screen.findByText("Stratagems");
    expect(screen.getByText("Improve AP by 1")).toBeInTheDocument();
  });

  it("SCHEMA-01: hides Stratagems section when hook returns empty array", async () => {
    useStratagemsByFactionMock.mockReturnValue({ data: [] });
    renderInsideTabs(42);
    await screen.findByRole("button", { name: /Save Playbook/ });
    expect(screen.queryByText("Stratagems")).toBeNull();
  });
});

describe("PlaybookTab — SCHEMA-02 Detachments", () => {
  const sampleDetachment = {
    id: "d1",
    faction_id: "SM",
    name: "Gladius Task Force",
    legend: "A versatile strike force",
    type: "Standard",
  };

  it("SCHEMA-02: renders 'Detachments' heading when useDetachmentsByFaction returns data", async () => {
    useDetachmentsByFactionMock.mockReturnValue({ data: [sampleDetachment] });
    renderInsideTabs(42);
    expect(await screen.findByText("Detachments")).toBeInTheDocument();
  });

  it("SCHEMA-02: renders detachment name and legend text", async () => {
    useDetachmentsByFactionMock.mockReturnValue({ data: [sampleDetachment] });
    renderInsideTabs(42);
    await screen.findByText("Detachments");
    expect(screen.getByText("Gladius Task Force")).toBeInTheDocument();
    expect(screen.getByText("A versatile strike force")).toBeInTheDocument();
  });

  it("SCHEMA-02: hides Detachments section when hook returns empty array", async () => {
    useDetachmentsByFactionMock.mockReturnValue({ data: [] });
    renderInsideTabs(42);
    await screen.findByRole("button", { name: /Save Playbook/ });
    expect(screen.queryByText("Detachments")).toBeNull();
  });
});

describe("PlaybookTab — SCHEMA-03 Detachment abilities nested under parent", () => {
  const sampleDetachment = {
    id: "d1",
    faction_id: "SM",
    name: "Gladius Task Force",
    legend: null,
    type: "Standard",
  };
  const sampleAbility = {
    id: "da1",
    faction_id: "SM",
    name: "Combat Doctrines",
    legend: null,
    description: "Each time a unit fires",
    detachment: "Gladius Task Force",
    detachment_id: "d1",
  };

  it("SCHEMA-03: renders ability name nested under detachment when useDetachmentAbilitiesByDetachment returns data", async () => {
    useDetachmentsByFactionMock.mockReturnValue({ data: [sampleDetachment] });
    useDetachmentAbilitiesByDetachmentMock.mockReturnValue({ data: [sampleAbility] });
    renderInsideTabs(42);
    await screen.findByText("Detachments");
    expect(screen.getByText("Gladius Task Force")).toBeInTheDocument();
    expect(screen.getByText("Combat Doctrines")).toBeInTheDocument();
    expect(screen.getByText("Each time a unit fires")).toBeInTheDocument();
  });
});

describe("PlaybookTab — SCHEMA-04 Shared Faction Abilities", () => {
  const sampleAbility = {
    id: "a1",
    name: "Oath of Moment",
    legend: null,
    faction_id: "SM",
    description: "Re-roll hits against one target",
  };

  it("SCHEMA-04: renders 'Shared Faction Abilities' heading when useSharedAbilitiesByFaction returns data", async () => {
    useSharedAbilitiesByFactionMock.mockReturnValue({ data: [sampleAbility] });
    renderInsideTabs(42);
    expect(await screen.findByText("Shared Faction Abilities")).toBeInTheDocument();
  });

  it("SCHEMA-04: renders shared ability name and description", async () => {
    useSharedAbilitiesByFactionMock.mockReturnValue({ data: [sampleAbility] });
    renderInsideTabs(42);
    await screen.findByText("Shared Faction Abilities");
    expect(screen.getByText("Oath of Moment")).toBeInTheDocument();
    expect(screen.getByText("Re-roll hits against one target")).toBeInTheDocument();
  });

  it("SCHEMA-04: hides section when hook returns empty array", async () => {
    useSharedAbilitiesByFactionMock.mockReturnValue({ data: [] });
    renderInsideTabs(42);
    await screen.findByRole("button", { name: /Save Playbook/ });
    expect(screen.queryByText("Shared Faction Abilities")).toBeNull();
  });
});

describe("PlaybookTab — combined absence of extended sections", () => {
  it("shows none of the extended section headings when all three hooks return empty arrays and wahapediaFactionId is null", async () => {
    useStratagemsByFactionMock.mockReturnValue({ data: [] });
    useDetachmentsByFactionMock.mockReturnValue({ data: [] });
    useSharedAbilitiesByFactionMock.mockReturnValue({ data: [] });
    renderInsideTabs(42);
    await screen.findByRole("button", { name: /Save Playbook/ });
    expect(screen.queryByText("Stratagems")).toBeNull();
    expect(screen.queryByText("Detachments")).toBeNull();
    expect(screen.queryByText("Shared Faction Abilities")).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Phase 55 Plan 02 — Annotation controls in PlaybookTab sub-components
// PLAY-01: Star toggle visible on all rule entries
// PLAY-02: Flag toggle visible on all rule entries
// PLAY-04: Annotation styling (border-l-primary bg-primary/5) on annotated entries
// ────────────────────────────────────────────────────────────────────────────

const sampleStratagemAnnotation = {
  id: "s-ann",
  faction_id: "SM",
  name: "Transhuman Physiology",
  type: "Battle Tactic",
  cp_cost: "1",
  legend: null,
  turn: null,
  phase: "Fight phase",
  detachment: null,
  detachment_id: null,
  description: "Ignore wound modifiers.",
};

const sampleDetachmentAnnotation = {
  id: "d-ann",
  faction_id: "SM",
  name: "Ironstorm Spearhead",
  legend: null,
  type: "Vehicle",
};

const sampleAbilityAnnotation = {
  id: "a-ann",
  faction_id: "SM",
  name: "And They Shall Know No Fear",
  detachment: "Ironstorm Spearhead",
  detachment_id: "d-ann",
  legend: null,
  description: "Ignore morale modifiers.",
};

const sampleSharedAbilityAnnotation = {
  id: "sa-ann",
  name: "Oath of Moment",
  legend: null,
  faction_id: "SM",
  description: "Re-roll hit rolls of 1.",
};

describe("PlaybookTab — PLAY-01/02 StratagemEntry annotation controls", () => {
  it("PLAY-01: shows star button (Add to favorites) for each stratagem", async () => {
    useStratagemsByFactionMock.mockReturnValue({ data: [sampleStratagemAnnotation] });
    renderInsideTabs(42);
    await screen.findByText("Transhuman Physiology");
    expect(screen.getByRole("button", { name: "Add to favorites" })).toBeInTheDocument();
  });

  it("PLAY-02: shows flag button (Set as Game Day reminder) for each stratagem", async () => {
    useStratagemsByFactionMock.mockReturnValue({ data: [sampleStratagemAnnotation] });
    renderInsideTabs(42);
    await screen.findByText("Transhuman Physiology");
    expect(screen.getByRole("button", { name: "Set as Game Day reminder" })).toBeInTheDocument();
  });

  it("PLAY-01: shows filled yellow star when stratagem is in favorites (PLAY-01)", async () => {
    const mockFav: RulesFavorite = {
      id: 1,
      rule_id: "s-ann",
      rule_type: "stratagem",
      rule_name: "Transhuman Physiology",
      is_reminder: 0,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    vi.mocked(rulesFavoritesHooks.useRulesFavorites).mockReturnValueOnce(
      { data: [mockFav] } as unknown as ReturnType<typeof rulesFavoritesHooks.useRulesFavorites>
    );

    useStratagemsByFactionMock.mockReturnValue({ data: [sampleStratagemAnnotation] });
    renderInsideTabs(42);
    await screen.findByText("Transhuman Physiology");

    const starBtn = screen.getByRole("button", { name: "Remove from favorites" });
    expect(starBtn.querySelector("svg")).toHaveClass("fill-yellow-500");
  });

  it("PLAY-04: applies border-l-primary and bg-primary/5 to annotated stratagem entry", async () => {
    const mockFav: RulesFavorite = {
      id: 1,
      rule_id: "s-ann",
      rule_type: "stratagem",
      rule_name: "Transhuman Physiology",
      is_reminder: 0,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    vi.mocked(rulesFavoritesHooks.useRulesFavorites).mockReturnValueOnce(
      { data: [mockFav] } as unknown as ReturnType<typeof rulesFavoritesHooks.useRulesFavorites>
    );

    useStratagemsByFactionMock.mockReturnValue({ data: [sampleStratagemAnnotation] });
    const { container } = renderInsideTabs(42);
    await screen.findByText("Transhuman Physiology");

    // The annotated entry div should have border-l-primary and bg-primary/5
    const annotatedDiv = container.querySelector(".border-l-primary");
    expect(annotatedDiv).toBeInTheDocument();
    expect(annotatedDiv).toHaveClass("bg-primary/5");
  });
});

describe("PlaybookTab — PLAY-01/02 DetachmentAbilityRow annotation controls", () => {
  it("PLAY-01: shows star button for each detachment ability when rendered", async () => {
    useDetachmentsByFactionMock.mockReturnValue({ data: [sampleDetachmentAnnotation] });
    useDetachmentAbilitiesByDetachmentMock.mockReturnValue({ data: [sampleAbilityAnnotation] });
    renderInsideTabs(42);
    await screen.findByText("And They Shall Know No Fear");
    expect(screen.getByRole("button", { name: "Add to favorites" })).toBeInTheDocument();
  });

  it("PLAY-02: shows flag button for each detachment ability when rendered", async () => {
    useDetachmentsByFactionMock.mockReturnValue({ data: [sampleDetachmentAnnotation] });
    useDetachmentAbilitiesByDetachmentMock.mockReturnValue({ data: [sampleAbilityAnnotation] });
    renderInsideTabs(42);
    await screen.findByText("And They Shall Know No Fear");
    expect(screen.getByRole("button", { name: "Set as Game Day reminder" })).toBeInTheDocument();
  });

  it("PLAY-01: shows filled yellow star when detachment ability is in favorites", async () => {
    const mockFav: RulesFavorite = {
      id: 1,
      rule_id: "a-ann",
      rule_type: "detachment_ability",
      rule_name: "And They Shall Know No Fear",
      is_reminder: 0,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    vi.mocked(rulesFavoritesHooks.useRulesFavorites).mockReturnValueOnce(
      { data: [mockFav] } as unknown as ReturnType<typeof rulesFavoritesHooks.useRulesFavorites>
    );

    useDetachmentsByFactionMock.mockReturnValue({ data: [sampleDetachmentAnnotation] });
    useDetachmentAbilitiesByDetachmentMock.mockReturnValue({ data: [sampleAbilityAnnotation] });
    renderInsideTabs(42);
    await screen.findByText("And They Shall Know No Fear");

    const starBtn = screen.getByRole("button", { name: "Remove from favorites" });
    expect(starBtn.querySelector("svg")).toHaveClass("fill-yellow-500");
  });

  it("PLAY-04: applies border-l-primary to annotated detachment ability entry", async () => {
    const mockFav: RulesFavorite = {
      id: 1,
      rule_id: "a-ann",
      rule_type: "detachment_ability",
      rule_name: "And They Shall Know No Fear",
      is_reminder: 0,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    vi.mocked(rulesFavoritesHooks.useRulesFavorites).mockReturnValueOnce(
      { data: [mockFav] } as unknown as ReturnType<typeof rulesFavoritesHooks.useRulesFavorites>
    );

    useDetachmentsByFactionMock.mockReturnValue({ data: [sampleDetachmentAnnotation] });
    useDetachmentAbilitiesByDetachmentMock.mockReturnValue({ data: [sampleAbilityAnnotation] });
    const { container } = renderInsideTabs(42);
    await screen.findByText("And They Shall Know No Fear");

    const annotatedDiv = container.querySelector(".border-l-primary");
    expect(annotatedDiv).toBeInTheDocument();
    expect(annotatedDiv).toHaveClass("bg-primary/5");
  });
});

describe("PlaybookTab — PLAY-01/02 ExtendedAbilityEntry annotation controls (shared abilities)", () => {
  it("PLAY-01: shows star button for each shared faction ability", async () => {
    useSharedAbilitiesByFactionMock.mockReturnValue({ data: [sampleSharedAbilityAnnotation] });
    renderInsideTabs(42);
    await screen.findByText("Oath of Moment");
    expect(screen.getByRole("button", { name: "Add to favorites" })).toBeInTheDocument();
  });

  it("PLAY-02: shows flag button for each shared faction ability", async () => {
    useSharedAbilitiesByFactionMock.mockReturnValue({ data: [sampleSharedAbilityAnnotation] });
    renderInsideTabs(42);
    await screen.findByText("Oath of Moment");
    expect(screen.getByRole("button", { name: "Set as Game Day reminder" })).toBeInTheDocument();
  });

  it("PLAY-01: shows filled yellow star when shared ability is in favorites", async () => {
    const mockFav: RulesFavorite = {
      id: 1,
      rule_id: "sa-ann",
      rule_type: "shared_ability",
      rule_name: "Oath of Moment",
      is_reminder: 0,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    vi.mocked(rulesFavoritesHooks.useRulesFavorites).mockReturnValueOnce(
      { data: [mockFav] } as unknown as ReturnType<typeof rulesFavoritesHooks.useRulesFavorites>
    );

    useSharedAbilitiesByFactionMock.mockReturnValue({ data: [sampleSharedAbilityAnnotation] });
    renderInsideTabs(42);
    await screen.findByText("Oath of Moment");

    const starBtn = screen.getByRole("button", { name: "Remove from favorites" });
    expect(starBtn.querySelector("svg")).toHaveClass("fill-yellow-500");
  });

  it("PLAY-04: applies border-l-primary and bg-primary/5 to annotated shared ability entry", async () => {
    const mockFav: RulesFavorite = {
      id: 1,
      rule_id: "sa-ann",
      rule_type: "shared_ability",
      rule_name: "Oath of Moment",
      is_reminder: 0,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    vi.mocked(rulesFavoritesHooks.useRulesFavorites).mockReturnValueOnce(
      { data: [mockFav] } as unknown as ReturnType<typeof rulesFavoritesHooks.useRulesFavorites>
    );

    useSharedAbilitiesByFactionMock.mockReturnValue({ data: [sampleSharedAbilityAnnotation] });
    const { container } = renderInsideTabs(42);
    await screen.findByText("Oath of Moment");

    const annotatedDiv = container.querySelector(".border-l-primary");
    expect(annotatedDiv).toBeInTheDocument();
    expect(annotatedDiv).toHaveClass("bg-primary/5");
  });

  it("PLAY-03: shows StickyNote indicator on shared ability when note exists", async () => {
    const mockNote: RulesNote = {
      id: 1,
      rule_id: "sa-ann",
      rule_type: "shared_ability",
      rule_name: "Oath of Moment",
      note_text: "High priority target",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    vi.mocked(rulesNotesHooks.useRulesNotes).mockReturnValueOnce(
      { data: [mockNote] } as unknown as ReturnType<typeof rulesNotesHooks.useRulesNotes>
    );

    useSharedAbilitiesByFactionMock.mockReturnValue({ data: [sampleSharedAbilityAnnotation] });
    renderInsideTabs(42);
    await screen.findByText("Oath of Moment");

    // StickyNote renders as third SVG in the annotation controls div
    const starBtn = screen.getByRole("button", { name: "Add to favorites" });
    const controlsDiv = starBtn.parentElement;
    expect(controlsDiv?.querySelectorAll("svg").length).toBeGreaterThanOrEqual(3);
  });
});

describe("PlaybookTab — datasheet error state", () => {
  it("renders error banner when useDatasheet returns an error", async () => {
    (datasheetHooks.useDatasheet as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      data: undefined,
      error: new Error("no such table: rw_datasheets"),
    });
    renderInsideTabs(42);
    expect(await screen.findByText(/Failed to load datasheet: no such table: rw_datasheets/)).toBeInTheDocument();
  });
});
