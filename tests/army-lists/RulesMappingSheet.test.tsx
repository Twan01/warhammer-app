/**
 * Phase 76 — PV-04/PV-05 gap: RulesMappingSheet component tests.
 *
 * Verifies:
 * - Current match info renders when a mapping exists
 * - "Confirm Match" button calls upsertMapping mutation with match_status "confirmed"
 * - "Remove Mapping" button calls deleteMapping mutation
 * - Empty state rendered when no mapping exists
 * - Search input has aria-label="Search datasheets"
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RulesMappingSheet } from "@/features/army-lists/RulesMappingSheet";
import type { UnitRulesMapping } from "@/types/unitRulesMapping";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockMutateAsync = vi.fn().mockResolvedValue(undefined);
const mockDeleteMutateAsync = vi.fn().mockResolvedValue(undefined);

vi.mock("@/hooks/useUnitRulesMapping", () => ({
  useUnitRulesMapping: vi.fn(),
  useUpsertUnitRulesMapping: vi.fn(() => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  })),
  useDeleteUnitRulesMapping: vi.fn(() => ({
    mutateAsync: mockDeleteMutateAsync,
    isPending: false,
  })),
}));

vi.mock("@/db/queries/unitRulesMapping", () => ({
  findRulesDatasheets: vi.fn().mockResolvedValue([]),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Import after mocking so we can drive return values per test
import { useUnitRulesMapping } from "@/hooks/useUnitRulesMapping";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function makeMapping(overrides: Partial<UnitRulesMapping> = {}): UnitRulesMapping {
  return {
    id: 1,
    unit_id: 10,
    rules_datasheet_id: "ds-001",
    datasheet_name: null,
    match_status: "auto",
    source: null,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    ...overrides,
  };
}

function renderSheet(props: {
  open?: boolean;
  unitId?: number;
  unitName?: string;
  factionId?: number;
  onClose?: () => void;
} = {}) {
  const onClose = props.onClose ?? vi.fn();
  render(
    <TooltipProvider>
      <RulesMappingSheet
        open={props.open ?? true}
        unitId={props.unitId ?? 10}
        unitName={props.unitName ?? "Intercessors"}
        factionId={props.factionId ?? 1}
        onClose={onClose}
      />
    </TooltipProvider>,
  );
  return { onClose };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RulesMappingSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Current match section
  // -------------------------------------------------------------------------

  it("renders unit name as the sheet title", () => {
    vi.mocked(useUnitRulesMapping).mockReturnValue({
      data: makeMapping(),
      isLoading: false,
    } as ReturnType<typeof useUnitRulesMapping>);

    renderSheet({ unitName: "Space Marines" });
    expect(screen.getByText("Space Marines")).toBeInTheDocument();
  });

  it("renders current match status text when mapping exists", () => {
    vi.mocked(useUnitRulesMapping).mockReturnValue({
      data: makeMapping({ match_status: "auto" }),
      isLoading: false,
    } as ReturnType<typeof useUnitRulesMapping>);

    renderSheet();
    expect(screen.getByText(/Status: auto/)).toBeInTheDocument();
  });

  it("renders current match datasheet id when mapping has one", () => {
    vi.mocked(useUnitRulesMapping).mockReturnValue({
      data: makeMapping({ rules_datasheet_id: "ds-space-marines-001" }),
      isLoading: false,
    } as ReturnType<typeof useUnitRulesMapping>);

    renderSheet();
    expect(screen.getByText("ds-space-marines-001")).toBeInTheDocument();
  });

  it("renders empty state when no mapping exists", () => {
    vi.mocked(useUnitRulesMapping).mockReturnValue({
      data: null,
      isLoading: false,
    } as ReturnType<typeof useUnitRulesMapping>);

    renderSheet();
    expect(
      screen.getByText(/No rules mapping exists for this unit/),
    ).toBeInTheDocument();
  });

  it("renders loading state while mapping is loading", () => {
    vi.mocked(useUnitRulesMapping).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useUnitRulesMapping>);

    renderSheet();
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Confirm Match button
  // -------------------------------------------------------------------------

  it("renders Confirm Match button when mapping status is not confirmed", () => {
    vi.mocked(useUnitRulesMapping).mockReturnValue({
      data: makeMapping({ match_status: "auto" }),
      isLoading: false,
    } as ReturnType<typeof useUnitRulesMapping>);

    renderSheet();
    expect(
      screen.getByRole("button", { name: /Confirm Match/i }),
    ).toBeInTheDocument();
  });

  it("does NOT render Confirm Match button when mapping is already confirmed", () => {
    vi.mocked(useUnitRulesMapping).mockReturnValue({
      data: makeMapping({ match_status: "confirmed" }),
      isLoading: false,
    } as ReturnType<typeof useUnitRulesMapping>);

    renderSheet();
    expect(
      screen.queryByRole("button", { name: /Confirm Match/i }),
    ).not.toBeInTheDocument();
  });

  it("calls upsertMapping with match_status confirmed when Confirm Match is clicked", async () => {
    vi.mocked(useUnitRulesMapping).mockReturnValue({
      data: makeMapping({ unit_id: 10, rules_datasheet_id: "ds-001", match_status: "auto" }),
      isLoading: false,
    } as ReturnType<typeof useUnitRulesMapping>);

    renderSheet({ unitId: 10 });

    const confirmBtn = screen.getByRole("button", { name: /Confirm Match/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          unit_id: 10,
          match_status: "confirmed",
        }),
      );
    });
  });

  it("calls toast.success after successful confirm", async () => {
    vi.mocked(useUnitRulesMapping).mockReturnValue({
      data: makeMapping({ match_status: "auto" }),
      isLoading: false,
    } as ReturnType<typeof useUnitRulesMapping>);

    renderSheet();
    fireEvent.click(screen.getByRole("button", { name: /Confirm Match/i }));

    await waitFor(() => {
      expect(vi.mocked(toast.success)).toHaveBeenCalledWith("Rules mapping confirmed");
    });
  });

  // -------------------------------------------------------------------------
  // Remove Mapping button
  // -------------------------------------------------------------------------

  it("renders Remove Mapping button when mapping exists", () => {
    vi.mocked(useUnitRulesMapping).mockReturnValue({
      data: makeMapping(),
      isLoading: false,
    } as ReturnType<typeof useUnitRulesMapping>);

    renderSheet();
    expect(
      screen.getByRole("button", { name: /Remove rules mapping/i }),
    ).toBeInTheDocument();
  });

  it("calls deleteMapping with unitId when Remove Mapping is clicked", async () => {
    vi.mocked(useUnitRulesMapping).mockReturnValue({
      data: makeMapping({ unit_id: 10 }),
      isLoading: false,
    } as ReturnType<typeof useUnitRulesMapping>);

    renderSheet({ unitId: 10 });
    fireEvent.click(screen.getByRole("button", { name: /Remove rules mapping/i }));

    await waitFor(() => {
      expect(mockDeleteMutateAsync).toHaveBeenCalledWith(10);
    });
  });

  it("calls toast.success after successful remove", async () => {
    vi.mocked(useUnitRulesMapping).mockReturnValue({
      data: makeMapping(),
      isLoading: false,
    } as ReturnType<typeof useUnitRulesMapping>);

    renderSheet();
    fireEvent.click(screen.getByRole("button", { name: /Remove rules mapping/i }));

    await waitFor(() => {
      expect(vi.mocked(toast.success)).toHaveBeenCalledWith("Rules mapping removed");
    });
  });

  // -------------------------------------------------------------------------
  // Search input
  // -------------------------------------------------------------------------

  it("renders search input with aria-label='Search datasheets'", () => {
    vi.mocked(useUnitRulesMapping).mockReturnValue({
      data: null,
      isLoading: false,
    } as ReturnType<typeof useUnitRulesMapping>);

    renderSheet();
    expect(screen.getByLabelText("Search datasheets")).toBeInTheDocument();
  });

  it("search input accepts user input", () => {
    vi.mocked(useUnitRulesMapping).mockReturnValue({
      data: null,
      isLoading: false,
    } as ReturnType<typeof useUnitRulesMapping>);

    renderSheet();
    const input = screen.getByLabelText("Search datasheets") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Space" } });
    expect(input.value).toBe("Space");
  });

  // -------------------------------------------------------------------------
  // Sheet not rendered when closed
  // -------------------------------------------------------------------------

  it("does not show unit name as heading when sheet is closed", () => {
    vi.mocked(useUnitRulesMapping).mockReturnValue({
      data: makeMapping(),
      isLoading: false,
    } as ReturnType<typeof useUnitRulesMapping>);

    renderSheet({ open: false, unitName: "HiddenUnit" });
    // Radix Sheet hides content from accessibility tree when closed
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
