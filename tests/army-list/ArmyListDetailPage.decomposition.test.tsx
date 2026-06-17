/**
 * HON-09 — ArmyListDetailPage behavior-preservation integration test (Wave 0).
 *
 * This test is the BEHAVIOR GUARD for the ArmyListDetailPage decomposition.
 * It must:
 *   1. Pass against the current UNDECOMPOSED file.
 *   2. Keep passing (unchanged) after every extraction commit in Plan 136-02.
 *
 * Assertions are render-output only — no internal file structure checks.
 * All external dependencies are mocked so this runs in jsdom without Tauri.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Tauri plugin mocks (no native bridge in jsdom)
// ---------------------------------------------------------------------------

vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({
  writeText: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: vi.fn().mockResolvedValue(null),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  writeTextFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// TanStack Router mock (ArmyListDetailPage calls useNavigate + Link)
// ---------------------------------------------------------------------------

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

// ---------------------------------------------------------------------------
// Data hook mocks
// ---------------------------------------------------------------------------

vi.mock("@/hooks/useArmyLists", () => ({
  useArmyList: vi.fn(),
  useArmyListWithUnits: vi.fn(),
  useEnhancementsByList: vi.fn(),
  useListWargear: vi.fn(),
  useRemoveUnitFromList: vi.fn(),
  useUpdateArmyList: vi.fn(),
  useClearArmyListDetachment: vi.fn(),
  useSetWarlord: vi.fn(),
  useClearWarlord: vi.fn(),
  useReorderArmyListUnits: vi.fn(),
  useAddUnitToList: vi.fn(),
}));

vi.mock("@/hooks/useUnits", () => ({
  useUnits: vi.fn(),
}));

vi.mock("@/hooks/useUdbMeta", () => ({
  useUdbMeta: vi.fn(),
}));

vi.mock("@/hooks/useLeaderTargets", () => ({
  useLeaderTargets: vi.fn(),
}));

vi.mock("@/hooks/useFactions", () => ({
  useFactions: vi.fn(),
}));

vi.mock("@/stores/localeStore", () => ({
  useLocale: vi.fn(() => "en"),
}));

// ---------------------------------------------------------------------------
// Heavy child component mocks (portal sheets/dialogs — no Radix internals needed)
// ---------------------------------------------------------------------------

vi.mock("@/features/army-lists/ArmyListSheet", () => ({
  ArmyListSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="portal-edit-sheet">EditSheet</div> : null,
}));

vi.mock("@/features/army-lists/ArmyListDeleteDialog", () => ({
  ArmyListDeleteDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="portal-delete-dialog">DeleteDialog</div> : null,
}));

vi.mock("@/features/army-lists/UnitPickerDialog", () => ({
  UnitPickerDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="portal-unit-picker">UnitPicker</div> : null,
}));

vi.mock("@/features/army-lists/LoadoutBuilderSheet", () => ({
  LoadoutBuilderSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="portal-loadout">LoadoutBuilder</div> : null,
}));

vi.mock("@/features/army-lists/EnhancementPickerSheet", () => ({
  EnhancementPickerSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="portal-enhancement">EnhancementPicker</div> : null,
}));

vi.mock("@/features/army-lists/LeaderAttachmentSheet", () => ({
  LeaderAttachmentSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="portal-leader">LeaderAttachment</div> : null,
}));

vi.mock("@/features/army-lists/DatasheetBrowserDialog", () => ({
  DatasheetBrowserDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="portal-datasheet-browser">DatasheetBrowser</div> : null,
}));

vi.mock("@/features/army-lists/PrintPreviewDialog", () => ({
  PrintPreviewDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="portal-print-preview">PrintPreview</div> : null,
}));

vi.mock("@/features/army-lists/SnapshotHistorySheet", () => ({
  SnapshotHistorySheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="portal-snapshot-history">SnapshotHistory</div> : null,
}));

vi.mock("@/features/army-lists/SnapshotCompareDialog", () => ({
  SnapshotCompareDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="portal-snapshot-compare">SnapshotCompare</div> : null,
}));

// Lighter child mocks — just render basic structure
vi.mock("@/features/army-lists/ArmyListSummaryBar", () => ({
  ArmyListSummaryBar: () => <div data-testid="summary-bar" />,
}));

vi.mock("@/features/army-lists/ExportDropdown", () => ({
  ExportDropdown: ({
    onCopyToClipboard,
    onSaveJson,
    onSavePdf,
  }: {
    onCopyToClipboard: () => void;
    onPrint: () => void;
    onSaveJson: () => void;
    onSavePdf: () => void;
  }) => (
    <div data-testid="export-dropdown">
      <button onClick={onCopyToClipboard}>Copy to Clipboard</button>
      <button onClick={onSaveJson}>Save JSON</button>
      <button onClick={onSavePdf}>Save PDF</button>
    </div>
  ),
}));

vi.mock("@/features/army-lists/DetachmentPicker", () => ({
  DetachmentPicker: () => <div data-testid="detachment-picker" />,
}));

vi.mock("@/features/army-lists/DetachmentRulesSection", () => ({
  DetachmentRulesSection: () => <div data-testid="detachment-rules" />,
}));

vi.mock("@/features/army-lists/RemindersSection", () => ({
  RemindersSection: () => <div data-testid="reminders-section" />,
}));

vi.mock("@/features/army-lists/ArmyListUnitRow", () => ({
  ArmyListUnitRow: ({
    unit,
  }: {
    unit: { unit_name: string };
  }) => <tr><td data-testid="unit-row">{unit.unit_name}</td></tr>,
}));

// ---------------------------------------------------------------------------
// Import the component under test
// ---------------------------------------------------------------------------

import { ArmyListDetailPage } from "@/features/army-lists/ArmyListDetailPage";

// Import the hooks we mock so we can control return values per-test
import {
  useArmyList,
  useArmyListWithUnits,
  useEnhancementsByList,
  useListWargear,
  useRemoveUnitFromList,
  useUpdateArmyList,
  useClearArmyListDetachment,
  useSetWarlord,
  useClearWarlord,
  useReorderArmyListUnits,
  useAddUnitToList,
} from "@/hooks/useArmyLists";
import { useUnits } from "@/hooks/useUnits";
import { useUdbMeta } from "@/hooks/useUdbMeta";
import { useLeaderTargets } from "@/hooks/useLeaderTargets";
import { useFactions } from "@/hooks/useFactions";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SAMPLE_LIST = {
  id: 7,
  name: "My Battle Company",
  faction_id: 1,
  points_limit: 2000,
  list_type: null,
  notes: null,
  detachment_id: null,
  detachment_name: null,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

const SAMPLE_FACTION = {
  id: 1,
  name: "Space Marines",
  color_theme: null,
  icon_path: null,
  game_system: "40k",
  description: null,
  lore_notes: null,
  wahapedia_faction_id: "SM",
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

const SAMPLE_UNIT = {
  id: 101,
  list_id: 7,
  unit_id: 42,
  ghost_unit_name: null,
  is_warlord: 0,
  selected_model_count: null,
  leader_attached_to_id: null,
  points_override: null,
  notes: null,
  sort_order: 0,
  created_at: "2026-01-01",
  unit_name: "Intercessors",
  unit_points: 100,
  udb_unit_id: null,
  effective_points: 100,
  faction_id: 1,
  unit_category: "Battleline",
  status_painting: "Built" as const,
  status_assembly: 1,
  painting_percentage: 0,
  status_basing: 0,
  status_varnished: 0,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function noopMutation<T = ReturnType<typeof useRemoveUnitFromList>>() {
  return { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false } as unknown as T;
}

function setupDefaultMocks() {
  vi.mocked(useArmyList).mockReturnValue(
    { data: SAMPLE_LIST, isLoading: false } as unknown as ReturnType<typeof useArmyList>
  );

  vi.mocked(useArmyListWithUnits).mockReturnValue(
    { data: [SAMPLE_UNIT], isLoading: false } as unknown as ReturnType<typeof useArmyListWithUnits>
  );

  vi.mocked(useEnhancementsByList).mockReturnValue(
    { data: [] } as unknown as ReturnType<typeof useEnhancementsByList>
  );

  vi.mocked(useListWargear).mockReturnValue(
    { data: [] } as unknown as ReturnType<typeof useListWargear>
  );

  vi.mocked(useFactions).mockReturnValue(
    { data: [SAMPLE_FACTION], isLoading: false } as unknown as ReturnType<typeof useFactions>
  );

  vi.mocked(useUnits).mockReturnValue(
    { data: [], isLoading: false } as unknown as ReturnType<typeof useUnits>
  );

  vi.mocked(useUdbMeta).mockReturnValue(
    { data: null } as unknown as ReturnType<typeof useUdbMeta>
  );

  vi.mocked(useLeaderTargets).mockReturnValue(
    { data: [] } as unknown as ReturnType<typeof useLeaderTargets>
  );

  vi.mocked(useRemoveUnitFromList).mockReturnValue(
    noopMutation<ReturnType<typeof useRemoveUnitFromList>>()
  );
  vi.mocked(useUpdateArmyList).mockReturnValue(
    noopMutation<ReturnType<typeof useUpdateArmyList>>()
  );
  vi.mocked(useClearArmyListDetachment).mockReturnValue(
    noopMutation<ReturnType<typeof useClearArmyListDetachment>>()
  );
  vi.mocked(useSetWarlord).mockReturnValue(
    noopMutation<ReturnType<typeof useSetWarlord>>()
  );
  vi.mocked(useClearWarlord).mockReturnValue(
    noopMutation<ReturnType<typeof useClearWarlord>>()
  );
  vi.mocked(useReorderArmyListUnits).mockReturnValue(
    noopMutation<ReturnType<typeof useReorderArmyListUnits>>()
  );
  vi.mocked(useAddUnitToList).mockReturnValue(
    noopMutation<ReturnType<typeof useAddUnitToList>>()
  );
}

function renderPage(listId = 7) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ArmyListDetailPage listId={listId} />
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  setupDefaultMocks();
});

describe("HON-09 — ArmyListDetailPage behavior-preservation (Wave 0)", () => {
  describe("Header section", () => {
    it("renders the list name as the page title", () => {
      renderPage();
      expect(screen.getByText("My Battle Company")).toBeInTheDocument();
    });

    it("renders a Back to Army Lists link", () => {
      renderPage();
      expect(screen.getByText("Back to Army Lists")).toBeInTheDocument();
    });

    it("renders the Edit List button", () => {
      renderPage();
      expect(screen.getByRole("button", { name: "Edit List" })).toBeInTheDocument();
    });

    it("renders the Game Day button", () => {
      renderPage();
      expect(screen.getByRole("button", { name: /Game Day/i })).toBeInTheDocument();
    });

    it("renders the Delete List button", () => {
      renderPage();
      expect(screen.getByRole("button", { name: "Delete List" })).toBeInTheDocument();
    });
  });

  describe("Quick-add section", () => {
    it("renders the quick-add search input", () => {
      renderPage();
      expect(
        screen.getByPlaceholderText("Quick add — search units by name..."),
      ).toBeInTheDocument();
    });

    it("renders the Add Unit button", () => {
      renderPage();
      expect(screen.getByRole("button", { name: /Add Unit/i })).toBeInTheDocument();
    });

    it("renders the Browse Datasheets button", () => {
      renderPage();
      expect(screen.getByRole("button", { name: /Browse Datasheets/i })).toBeInTheDocument();
    });
  });

  describe("Unit table section", () => {
    it("renders the unit table with at least one category group header", () => {
      renderPage();
      // The Battleline category header is rendered as a table row
      expect(screen.getByText("Battleline")).toBeInTheDocument();
    });

    it("renders the unit row for the seeded unit", () => {
      renderPage();
      expect(screen.getByTestId("unit-row")).toBeInTheDocument();
      expect(screen.getByText("Intercessors")).toBeInTheDocument();
    });
  });

  describe("Export actions section", () => {
    it("renders the Export dropdown with Copy to Clipboard action", () => {
      renderPage();
      expect(screen.getByRole("button", { name: "Copy to Clipboard" })).toBeInTheDocument();
    });

    it("renders the Export dropdown with Save JSON action", () => {
      renderPage();
      expect(screen.getByRole("button", { name: "Save JSON" })).toBeInTheDocument();
    });

    it("renders the Export dropdown with Save PDF action", () => {
      renderPage();
      expect(screen.getByRole("button", { name: "Save PDF" })).toBeInTheDocument();
    });

    it("renders the Snapshots button", () => {
      renderPage();
      expect(screen.getByRole("button", { name: /Snapshots/i })).toBeInTheDocument();
    });
  });

  describe("Portal visibility — driven by reducer", () => {
    it("does NOT render the Edit Sheet when no portal is open", () => {
      renderPage();
      expect(screen.queryByTestId("portal-edit-sheet")).not.toBeInTheDocument();
    });

    it("renders the Edit Sheet when Edit List button is clicked", async () => {
      renderPage();
      await act(async () => {
        screen.getByRole("button", { name: "Edit List" }).click();
      });
      expect(screen.getByTestId("portal-edit-sheet")).toBeInTheDocument();
    });

    it("renders the Delete Dialog when Delete List button is clicked", async () => {
      renderPage();
      await act(async () => {
        screen.getByRole("button", { name: "Delete List" }).click();
      });
      expect(screen.getByTestId("portal-delete-dialog")).toBeInTheDocument();
    });

    it("renders the Unit Picker when Add Unit button is clicked", async () => {
      renderPage();
      await act(async () => {
        screen.getByRole("button", { name: /Add Unit/i }).click();
      });
      expect(screen.getByTestId("portal-unit-picker")).toBeInTheDocument();
    });

    it("renders the Datasheet Browser when Browse Datasheets button is clicked", async () => {
      renderPage();
      await act(async () => {
        screen.getByRole("button", { name: /Browse Datasheets/i }).click();
      });
      expect(screen.getByTestId("portal-datasheet-browser")).toBeInTheDocument();
    });

    it("renders the Snapshot History when Snapshots button is clicked", async () => {
      renderPage();
      await act(async () => {
        screen.getByRole("button", { name: /Snapshots/i }).click();
      });
      expect(screen.getByTestId("portal-snapshot-history")).toBeInTheDocument();
    });

    it("does NOT render the Snapshot Compare portal initially", () => {
      renderPage();
      expect(screen.queryByTestId("portal-snapshot-compare")).not.toBeInTheDocument();
    });
  });

  describe("Loading state", () => {
    it("renders skeletons when list is loading", () => {
      vi.mocked(useArmyList).mockReturnValue(
        { data: undefined, isLoading: true } as unknown as ReturnType<typeof useArmyList>
      );
      renderPage();
      // Back to Army Lists link is present in loading state
      expect(screen.getByText("Back to Army Lists")).toBeInTheDocument();
      // But no list name or action buttons
      expect(screen.queryByText("My Battle Company")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Edit List" })).not.toBeInTheDocument();
    });

    it("renders 'List not found' when list is undefined after loading", () => {
      vi.mocked(useArmyList).mockReturnValue(
        { data: undefined, isLoading: false } as unknown as ReturnType<typeof useArmyList>
      );
      renderPage();
      expect(screen.getByText("List not found")).toBeInTheDocument();
    });
  });

  describe("Faction badge", () => {
    it("renders the faction name badge when a faction is assigned", () => {
      renderPage();
      // Faction badge renders the faction name
      expect(screen.getByText("Space Marines")).toBeInTheDocument();
    });
  });
});
