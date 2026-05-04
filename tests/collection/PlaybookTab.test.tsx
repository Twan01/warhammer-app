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
  useUpdateUnit: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  UNITS_KEY: ["units"],
}));
vi.mock("@/db/queries/datasheets", () => ({
  upsertDatasheetLink: vi.fn(async () => undefined),
  getFullDatasheet: vi.fn(async () => null),
  resolveWahapediaFactionIdByName: vi.fn(async () => null),
}));
vi.mock("@/features/units/DatasheetPicker", () => ({
  DatasheetPicker: () => null, // render nothing — picker is tested separately
}));

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

  it("on save error shows error toast and re-enables the Save button", async () => {
    const user = userEvent.setup();
    upsertStrategyNoteMock.mockRejectedValueOnce(new Error("DB failure"));
    const errorSpy = vi.spyOn(toast, "error");
    renderInsideTabs();
    const saveBtn = await screen.findByRole("button", { name: /Save Playbook/ });
    await user.type(screen.getByLabelText(/Personal Ability Notes/), "Deep Strike");
    await user.click(saveBtn);
    await vi.waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith("Failed to save playbook — try again");
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
