/**
 * AR-07 -- ApplyToUnitsDialog tests.
 * Covers: unit list rendering, already-assigned dimming, multi-select count,
 * disabled confirm, and bulk create mutation args.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplyToUnitsDialog } from "@/features/recipes/ApplyToUnitsDialog";
import type { PaintingRecipe } from "@/types/recipe";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockRecipe: PaintingRecipe = {
  id: 1,
  name: "Test Recipe",
  faction_id: null,
  unit_id: null,
  area: null,
  primer: null,
  basecoat: null,
  shade: null,
  layer: null,
  highlight: null,
  glaze_filter: null,
  weathering: null,
  technical: null,
  basing: null,
  notes: null,
  tutorial_link: null,
  style: null,
  surface: null,
  effect: null,
  difficulty: null,
  estimated_minutes: null,
  result_photo_path: null,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

const mockUnits = [
  { id: 1, name: "Intercessors", faction_id: 10, category: "Troops", qty: 10, status: "Built", acquired_date: "2026-01-01", cost_pence: 0, notes: null, photo_path: null, created_at: "2026-01-01", updated_at: "2026-01-01" },
  { id: 2, name: "Hellblasters", faction_id: 10, category: "Heavy Support", qty: 5, status: "Primed", acquired_date: "2026-01-01", cost_pence: 0, notes: null, photo_path: null, created_at: "2026-01-01", updated_at: "2026-01-01" },
  { id: 3, name: "Sanguinary Guard", faction_id: 20, category: "Elites", qty: 5, status: "Not Started", acquired_date: "2026-01-01", cost_pence: 0, notes: null, photo_path: null, created_at: "2026-01-01", updated_at: "2026-01-01" },
];

const mockBulkMutate = vi.fn();

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/hooks/useUnits", () => ({
  useUnits: () => ({ data: mockUnits }),
}));

vi.mock("@/hooks/useFactions", () => ({
  useFactions: () => ({
    data: [
      { id: 10, name: "Ultramarines", color_theme: "#0047AB" },
      { id: 20, name: "Blood Angels", color_theme: "#CC0000" },
    ],
  }),
}));

vi.mock("@/hooks/useRecipeAssignments", () => ({
  useAssignmentsByRecipe: () => ({
    data: [{ id: 100, unit_id: 2, recipe_id: 1, created_at: "2026-01-01" }],
  }),
  useBulkCreateAssignments: () => ({ mutate: mockBulkMutate, isPending: false }),
}));

// Tauri mocks
vi.mock("@tauri-apps/api/path", () => ({
  appDataDir: vi.fn().mockResolvedValue("/mock/app/data"),
  join: vi.fn().mockImplementation((...parts: string[]) => parts.join("/")),
}));
vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: vi.fn().mockImplementation((path: string) => `asset://${path}`),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ApplyToUnitsDialog", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders unit list with faction badges", () => {
    render(
      <ApplyToUnitsDialog open={true} recipe={mockRecipe} onClose={mockOnClose} />,
    );

    expect(screen.getByText("Intercessors")).toBeInTheDocument();
    expect(screen.getByText("Hellblasters")).toBeInTheDocument();
    expect(screen.getByText("Sanguinary Guard")).toBeInTheDocument();
    // Two units share Ultramarines faction, so multiple badges
    expect(screen.getAllByText("Ultramarines").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Blood Angels")).toBeInTheDocument();
  });

  it("dims already-assigned units", () => {
    render(
      <ApplyToUnitsDialog open={true} recipe={mockRecipe} onClose={mockOnClose} />,
    );

    // Unit 2 (Hellblasters) is already assigned - its CommandItem should have opacity-50
    const hellblastersItem = screen.getByText("Hellblasters").closest("[cmdk-item]");
    expect(hellblastersItem).toHaveAttribute("data-disabled", "true");
  });

  it("confirm button shows selected count", async () => {
    const user = userEvent.setup();

    render(
      <ApplyToUnitsDialog open={true} recipe={mockRecipe} onClose={mockOnClose} />,
    );

    // Select unit 1 (Intercessors) and unit 3 (Sanguinary Guard)
    await user.click(screen.getByText("Intercessors"));
    await user.click(screen.getByText("Sanguinary Guard"));

    expect(screen.getByText(/Apply to 2 units/)).toBeInTheDocument();
  });

  it("confirm button disabled when none selected", () => {
    render(
      <ApplyToUnitsDialog open={true} recipe={mockRecipe} onClose={mockOnClose} />,
    );

    const confirmBtn = screen.getByText(/Apply to 0 unit/);
    expect(confirmBtn.closest("button")).toBeDisabled();
  });

  it("calls bulkCreate with selected unit IDs", async () => {
    const user = userEvent.setup();

    render(
      <ApplyToUnitsDialog open={true} recipe={mockRecipe} onClose={mockOnClose} />,
    );

    // Select units 1 and 3
    await user.click(screen.getByText("Intercessors"));
    await user.click(screen.getByText("Sanguinary Guard"));

    // Click confirm
    const confirmBtn = screen.getByText(/Apply to 2 units/).closest("button")!;
    await user.click(confirmBtn);

    expect(mockBulkMutate).toHaveBeenCalledWith(
      { unitIds: expect.arrayContaining([1, 3]), recipeId: 1 },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });
});
