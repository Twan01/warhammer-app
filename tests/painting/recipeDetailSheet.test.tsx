/**
 * DATA-05 — RecipeDetailSheet unit link navigation tests.
 *
 * RecipeDetailSheet's "Linked Unit" field renders a variant="link" Button
 * (not a plain span) when a unit is associated, and navigates to /collection
 * on click. When no unit is linked, it renders a dash span instead.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RecipeDetailSheet } from "@/features/recipes/RecipeDetailSheet";
import type { PaintingRecipe } from "@/types/recipe";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";

// ---------------------------------------------------------------------------
// Mock hooks to prevent Tauri / DB calls
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/hooks/useFactions", () => ({
  useFactions: () => ({ data: [] }),
}));

vi.mock("@/hooks/useUnits", () => ({
  useUnits: () => ({ data: mockUnits }),
}));

vi.mock("@/hooks/usePaints", () => ({
  usePaints: () => ({ data: [] }),
}));

vi.mock("@/hooks/useRecipePaints", () => ({
  useRecipePaints: () => ({ data: [] }),
}));

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const mockUnit: Unit = {
  id: 42,
  faction_id: 1,
  name: "Intercessor Squad",
  category: null,
  unit_type: null,
  model_count: 5,
  owned_count: null,
  points: 90,
  status_assembly: 1,
  status_painting: "Base Coated",
  painting_percentage: 40,
  status_basing: 0,
  status_varnished: 0,
  is_active_project: 1,
  priority: null,
  target_completion_date: null,
  purchase_date: null,
  purchase_price_pence: null,
  storage_location: null,
  main_image_path: null,
  notes: null,
  lore_notes: null,
  undercoat: null,
  created_at: "2026-01-01 00:00:00",
  updated_at: "2026-05-01 00:00:00",
};

// Used by vi.mock factory above (captured by closure)
let mockUnits: Unit[] = [mockUnit];

const mockFaction: Faction = {
  id: 1,
  name: "Space Marines",
  game_system: "Warhammer 40K",
  description: null,
  color_theme: "#1e3a5f",
  icon_path: null,
  lore_notes: null,
  created_at: "2026-01-01 00:00:00",
  updated_at: "2026-01-01 00:00:00",
};

function makeRecipe(over: Partial<PaintingRecipe> = {}): PaintingRecipe {
  return {
    id: 1,
    name: "Ultramarines Blue Scheme",
    faction_id: mockFaction.id,
    unit_id: mockUnit.id,
    area: "Armour",
    primer: null,
    basecoat: null,
    shade: null,
    layer: null,
    highlight: null,
    glaze_filter: null,
    weathering: null,
    technical: null,
    basing: null,
    tutorial_link: null,
    notes: null,
    created_at: "2026-01-01 00:00:00",
    updated_at: "2026-01-01 00:00:00",
    ...over,
  };
}

function renderSheet(recipe: PaintingRecipe | null) {
  const onClose = vi.fn();
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  render(
    <RecipeDetailSheet
      open={true}
      recipe={recipe}
      onClose={onClose}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
  return { onClose, onEdit, onDelete };
}

// ---------------------------------------------------------------------------
// DATA-05 tests
// ---------------------------------------------------------------------------

describe("RecipeDetailSheet — DATA-05 (unit link navigation)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUnits = [mockUnit];
  });

  describe("linked unit display", () => {
    it("renders a Button with variant='link' when recipe has a linked unit", () => {
      renderSheet(makeRecipe());

      // Button should be present (not a plain span)
      const button = screen.getByRole("button", { name: mockUnit.name });
      expect(button).toBeInTheDocument();
    });

    it("Button text matches the unit name", () => {
      renderSheet(makeRecipe());

      const button = screen.getByRole("button", { name: "Intercessor Squad" });
      expect(button).toHaveTextContent("Intercessor Squad");
    });

    it("clicking the Button calls onClose then navigates to /collection", async () => {
      const user = userEvent.setup();
      const { onClose } = renderSheet(makeRecipe());

      const button = screen.getByRole("button", { name: mockUnit.name });
      await user.click(button);

      expect(onClose).toHaveBeenCalledOnce();
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/collection" });
    });
  });

  describe("no linked unit", () => {
    it("renders a dash span when recipe has no linked unit (unit_id null)", () => {
      renderSheet(makeRecipe({ unit_id: null }));

      // Should render a dash, not a button
      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("does NOT render a Button when unit is null", () => {
      renderSheet(makeRecipe({ unit_id: null }));

      // Only the Edit Recipe and Delete Recipe buttons should exist, not the unit button
      const buttons = screen.getAllByRole("button");
      const unitButton = buttons.find((b) => b.textContent === mockUnit.name);
      expect(unitButton).toBeUndefined();
    });
  });
});
