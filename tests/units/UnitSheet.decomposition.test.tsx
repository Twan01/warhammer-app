/**
 * ARCH-03 â€” UnitSheet decomposition behavioral tests.
 *
 * Verifies that the slim UnitSheet orchestrator:
 * 1. Renders both UnitFormRequired and UnitFormOptional inside its Form wrapper
 * 2. buildDefaultValues produces correct defaults for create (unit=null) mode
 * 3. buildDefaultValues hydrates an existing unit's values for edit mode
 * 4. The orchestrator itself renders the Sheet, form fields, and submit button
 *
 * This file intentionally does NOT mock UnitFormRequired or UnitFormOptional â€”
 * we want to verify the real render tree, not just that imports exist.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// â”€â”€ Mocks required for UnitSheet's own hook dependencies â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

vi.mock("@/hooks/useUnits", () => ({
  useCreateUnit: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateUnit: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
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
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
    ],
    isLoading: false,
  })),
}));

// Mock CategoryCombobox to avoid Radix Command/Popover complexity in jsdom
vi.mock("@/features/units/CategoryCombobox", () => ({
  CategoryCombobox: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input
      data-testid="category-combobox"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Category"
    />
  ),
}));

import { UnitSheet } from "@/features/units/UnitSheet";
import type { Unit } from "@/types/unit";

const SAMPLE_UNIT: Unit = {
  id: 42,
  faction_id: 1,
  name: "Intercessors",
  category: "Battleline",
  unit_type: null,
  model_count: 5,
  owned_count: 5,
  points: 100,
  status_assembly: 1,
  status_painting: "Basecoated",
  painting_percentage: 50,
  status_basing: 0,
  status_varnished: 0,
  is_active_project: 1,
  priority: 1,
  target_completion_date: null,
  purchase_date: "2025-01-15",
  purchase_price_pence: 3500,
  storage_location: "Shelf A",
  main_image_path: null,
  notes: "Tactical squad",
  lore_notes: "Defenders of the Imperium",
  undercoat: "Chaos Black",
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

function renderSheet(unit: Unit | null = null, open = true) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <UnitSheet
        open={open}
        unit={unit}
        defaultFactionId={undefined}
        onClose={vi.fn()}
      />
    </QueryClientProvider>
  );
}

describe("ARCH-03 â€” UnitSheet orchestrator renders decomposed sub-components", () => {
  it("renders the sheet title 'New Unit' when unit=null", () => {
    renderSheet(null);
    expect(screen.getByText("New Unit")).toBeInTheDocument();
  });

  it("renders the sheet title 'Edit Unit' when a unit is provided", () => {
    renderSheet(SAMPLE_UNIT);
    expect(screen.getByText("Edit Unit")).toBeInTheDocument();
  });

  it("renders the Name field from UnitFormRequired inside the Sheet", () => {
    renderSheet(null);
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  it("renders the Faction label from UnitFormRequired", () => {
    renderSheet(null);
    expect(screen.getByText("Faction")).toBeInTheDocument();
  });

  it("renders the Category combobox from UnitFormRequired", () => {
    renderSheet(null);
    expect(screen.getByTestId("category-combobox")).toBeInTheDocument();
  });

  it("renders the 'More details' toggle from UnitFormOptional", () => {
    renderSheet(null);
    expect(screen.getByRole("button", { name: /more details/i })).toBeInTheDocument();
  });

  it("renders the Save Unit submit button in the Sheet footer", () => {
    renderSheet(null);
    expect(screen.getByRole("button", { name: /save unit/i })).toBeInTheDocument();
  });

  it("renders the Discard changes button in the Sheet footer", () => {
    renderSheet(null);
    expect(screen.getByRole("button", { name: /discard changes/i })).toBeInTheDocument();
  });

  it("populates Name input with unit.name in edit mode (buildDefaultValues wired correctly)", () => {
    renderSheet(SAMPLE_UNIT);
    const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
    expect(nameInput.value).toBe("Intercessors");
  });

  it("category combobox reflects unit.category in edit mode", () => {
    renderSheet(SAMPLE_UNIT);
    const categoryInput = screen.getByTestId("category-combobox") as HTMLInputElement;
    expect(categoryInput.value).toBe("Battleline");
  });

  it("Name input is empty string in create mode (buildDefaultValues new-unit defaults)", () => {
    renderSheet(null);
    const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
    expect(nameInput.value).toBe("");
  });

  it("does not render when open=false", () => {
    renderSheet(null, false);
    // When Sheet is closed, the title should not be in the DOM
    expect(screen.queryByText("New Unit")).toBeNull();
    expect(screen.queryByLabelText("Name")).toBeNull();
  });
});
