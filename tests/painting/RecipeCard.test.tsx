/**
 * STUDIO-01 — RecipeCard rendering tests.
 * Tests the card metadata, swatch strip, badges, and availability indicator.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RecipeCard } from "@/features/recipes/RecipeCard";
import type { PaintingRecipe } from "@/types/recipe";
import type { Faction } from "@/types/faction";
import type { AvailabilityStats } from "@/hooks/useRecipePaints";

function makeRecipe(over: Partial<PaintingRecipe> = {}): PaintingRecipe {
  return {
    id: 1,
    name: "Tau White Armor",
    faction_id: 1,
    unit_id: null,
    area: "Armor",
    primer: null, basecoat: null, shade: null, layer: null, highlight: null,
    glaze_filter: null, weathering: null, technical: null, basing: null,
    notes: null, tutorial_link: null,
    style: null, surface: "Armor", effect: null, difficulty: "Beginner",
    estimated_minutes: 45, result_photo_path: null,
    created_at: "2026-01-01", updated_at: "2026-01-01",
    ...over,
  };
}

function makeFaction(over: Partial<Faction> = {}): Faction {
  return {
    id: 1, name: "Tau Empire", game_system: "Warhammer 40K",
    description: null, color_theme: "#33aaff", icon_path: null,
    lore_notes: null,
    created_at: "2026-01-01", updated_at: "2026-01-01",
    ...over,
  };
}

function makeSwatches(count: number): { paint_id: number; hex_color: string | null }[] {
  return Array.from({ length: count }, (_, i) => ({
    paint_id: i + 1,
    hex_color: `#${String(i + 1).padStart(6, "0")}`,
  }));
}

function renderCard(props: Partial<Parameters<typeof RecipeCard>[0]> = {}) {
  const baseProps = {
    recipe: makeRecipe(),
    faction: makeFaction(),
    stepCount: 6,
    swatches: makeSwatches(3),
    availability: undefined as AvailabilityStats | undefined,
    onClick: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };
  return render(<RecipeCard {...baseProps} {...props} />);
}

describe("RecipeCard", () => {
  it("Test 1: renders recipe name in card", () => {
    renderCard({ recipe: makeRecipe({ name: "Ultramarines Blue" }) });
    expect(screen.getByText("Ultramarines Blue")).toBeInTheDocument();
  });

  it("Test 2: renders faction badge with backgroundColor when faction exists", () => {
    const faction = makeFaction({ name: "Tau Empire", color_theme: "#33aaff" });
    renderCard({ faction });
    const badge = screen.getByText("Tau Empire");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("data-slot", "badge");
  });

  it("Test 3: renders difficulty badge with correct color class for Beginner", () => {
    renderCard({ recipe: makeRecipe({ difficulty: "Beginner" }) });
    const badge = screen.getByText("Beginner");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("text-green-500");
  });

  it("Test 3b: renders difficulty badge with correct color class for Expert", () => {
    renderCard({ recipe: makeRecipe({ difficulty: "Expert" }) });
    const badge = screen.getByText("Expert");
    expect(badge.className).toContain("text-red-500");
  });

  it("Test 4: renders estimated time text when estimated_minutes is set", () => {
    renderCard({ recipe: makeRecipe({ estimated_minutes: 45 }) });
    expect(screen.getByText("45 min")).toBeInTheDocument();
  });

  it("Test 5: renders step count text", () => {
    renderCard({ stepCount: 6 });
    expect(screen.getByText("6 steps")).toBeInTheDocument();
  });

  it("Test 6: renders swatch circles from swatches array", () => {
    renderCard({ swatches: makeSwatches(3) });
    const dots = screen.getAllByTestId("swatch-dot");
    expect(dots).toHaveLength(3);
  });

  it("Test 7a: renders green availability badge when all owned", () => {
    const availability: AvailabilityStats = { owned: 5, missing: 0, runningLow: 0 };
    renderCard({ availability });
    expect(screen.getByText(/5 owned/)).toBeInTheDocument();
  });

  it("Test 7b: renders red availability badge when any missing", () => {
    const availability: AvailabilityStats = { owned: 3, missing: 2, runningLow: 0 };
    renderCard({ availability });
    expect(screen.getByText(/2 missing/)).toBeInTheDocument();
  });

  it("Test 8: renders no availability badge when availability is undefined", () => {
    renderCard({ availability: undefined });
    expect(screen.queryByText(/owned/)).not.toBeInTheDocument();
    expect(screen.queryByText(/missing/)).not.toBeInTheDocument();
  });

  it("Test 9: onClick fires with recipe on card click", () => {
    const onClick = vi.fn();
    const recipe = makeRecipe({ name: "Test Recipe" });
    renderCard({ recipe, onClick });
    fireEvent.click(screen.getByText("Test Recipe"));
    expect(onClick).toHaveBeenCalledWith(recipe);
  });
});
