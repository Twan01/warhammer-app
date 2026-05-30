/**
 * COL-07 -- UnitSheet prefill support tests.
 *
 * Tests:
 * a. buildDefaultValues overlays prefill values onto defaults in create mode
 * b. prefillUdbUnitId is passed through to createUnit payload
 * c. Database Link shows "Linked to unit database" when udb_unit_id present
 * d. Database Link shows "Custom unit (no database link)" when udb_unit_id is null
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Unit } from "@/types/unit";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCreateMutateAsync = vi.fn().mockResolvedValue(undefined);
const mockUpdateMutateAsync = vi.fn().mockResolvedValue(undefined);

vi.mock("@/hooks/useUnits", () => ({
  useCreateUnit: vi.fn(() => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
  })),
  useUpdateUnit: vi.fn(() => ({
    mutateAsync: mockUpdateMutateAsync,
    isPending: false,
  })),
  UNITS_KEY: ["units"],
}));

vi.mock("@/hooks/useUnitPointTiers", () => ({
  useUnitPointTiers: vi.fn(() => ({ data: [] })),
  UNIT_POINT_TIERS_KEY: (id: number) => ["unit-point-tiers", id] as const,
}));

vi.mock("@/hooks/useFactions", () => ({
  useFactions: vi.fn(() => ({
    data: [
      {
        id: 1,
        name: "Space Marines",
        color_theme: "#0000FF",
        icon_path: null,
        game_system: "40k",
        description: null,
        lore_notes: null,
        wahapedia_faction_id: "SM",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      {
        id: 2,
        name: "Necrons",
        color_theme: "#00FF00",
        icon_path: null,
        game_system: "40k",
        description: null,
        lore_notes: null,
        wahapedia_faction_id: "NEC",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
    ],
    isLoading: false,
  })),
}));

// Mock CategoryCombobox to avoid Radix Command/Popover complexity in jsdom
vi.mock("@/features/units/CategoryCombobox", () => ({
  CategoryCombobox: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => (
    <input
      data-testid="category-combobox"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Category"
    />
  ),
}));

import { UnitSheet } from "@/features/units/UnitSheet";

const SAMPLE_UNIT_LINKED: Unit = {
  id: 42,
  faction_id: 1,
  name: "Intercessors",
  category: "Battleline",
  unit_type: null,
  model_count: 5,
  owned_count: 5,
  points: 80,
  status_assembly: 1,
  status_painting: "Basecoated",
  painting_percentage: 50,
  status_basing: 0,
  status_varnished: 0,
  is_active_project: 0,
  priority: null,
  target_completion_date: null,
  purchase_date: null,
  purchase_price_pence: null,
  storage_location: null,
  main_image_path: null,
  notes: null,
  lore_notes: null,
  undercoat: null,
  status_assembly_override: 0,
  status_basing_override: 0,
  status_varnished_override: 0,
  udb_unit_id: "udb-unit-123",
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

const SAMPLE_UNIT_UNLINKED: Unit = {
  ...SAMPLE_UNIT_LINKED,
  id: 43,
  name: "Kitbash Captain",
  udb_unit_id: null,
};

function renderSheet(
  props: {
    unit?: Unit | null;
    prefill?: Partial<{
      faction_id: number;
      name: string;
      category: string;
      points: number | null;
      model_count: number | null;
    }>;
    prefillUdbUnitId?: string | null;
  } = {},
) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <UnitSheet
        open={true}
        unit={props.unit ?? null}
        onClose={vi.fn()}
        prefill={props.prefill}
        prefillUdbUnitId={props.prefillUdbUnitId}
      />
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// COL-07a: buildDefaultValues overlays prefill in create mode
// ---------------------------------------------------------------------------

describe("COL-07a -- buildDefaultValues overlays prefill values in create mode", () => {
  it("prefill name appears in the Name input field", () => {
    renderSheet({
      prefill: { name: "Intercessors", faction_id: 1, category: "Battleline" },
    });
    const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
    expect(nameInput.value).toBe("Intercessors");
  });

  it("prefill category appears in the Category combobox", () => {
    renderSheet({
      prefill: { name: "Test", faction_id: 1, category: "Character" },
    });
    const catInput = screen.getByTestId("category-combobox") as HTMLInputElement;
    expect(catInput.value).toBe("Character");
  });

  it("without prefill, Name input is empty in create mode", () => {
    renderSheet({});
    const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
    expect(nameInput.value).toBe("");
  });
});

// ---------------------------------------------------------------------------
// COL-07b: prefillUdbUnitId passed to createUnit payload
// ---------------------------------------------------------------------------

describe("COL-07b -- prefillUdbUnitId passed through to createUnit", () => {
  beforeEach(() => {
    mockCreateMutateAsync.mockReset();
    mockCreateMutateAsync.mockResolvedValue(undefined);
  });

  it("createUnit payload includes udb_unit_id from prefillUdbUnitId", async () => {
    renderSheet({
      prefill: { name: "Intercessors", faction_id: 1, category: "Battleline" },
      prefillUdbUnitId: "udb-unit-abc",
    });

    // Submit the form
    fireEvent.click(screen.getByRole("button", { name: /save unit/i }));

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledOnce();
    });

    const payload = mockCreateMutateAsync.mock.calls[0][0];
    expect(payload.udb_unit_id).toBe("udb-unit-abc");
  });

  it("createUnit payload has udb_unit_id: null when prefillUdbUnitId not provided", async () => {
    renderSheet({
      prefill: { name: "Custom Unit", faction_id: 1, category: "Battleline" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save unit/i }));

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledOnce();
    });

    const payload = mockCreateMutateAsync.mock.calls[0][0];
    expect(payload.udb_unit_id).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// COL-07c/d: Database Link status text display
// ---------------------------------------------------------------------------

describe("COL-07c/d -- Database Link status text", () => {
  it("shows 'Linked to unit database' in edit mode when udb_unit_id present", () => {
    renderSheet({ unit: SAMPLE_UNIT_LINKED });
    expect(screen.getByText("Linked to unit database")).toBeInTheDocument();
  });

  it("shows 'Custom unit (no database link)' in edit mode when udb_unit_id is null", () => {
    renderSheet({ unit: SAMPLE_UNIT_UNLINKED });
    expect(
      screen.getByText("Custom unit (no database link)"),
    ).toBeInTheDocument();
  });

  it("shows 'Linked to unit database' in create mode with prefillUdbUnitId", () => {
    renderSheet({
      prefill: { name: "Intercessors", faction_id: 1, category: "Battleline" },
      prefillUdbUnitId: "udb-unit-xyz",
    });
    expect(screen.getByText("Linked to unit database")).toBeInTheDocument();
  });

  it("shows 'Custom unit (no database link)' in create mode without prefillUdbUnitId", () => {
    renderSheet({});
    expect(
      screen.getByText("Custom unit (no database link)"),
    ).toBeInTheDocument();
  });
});
