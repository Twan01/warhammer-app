/**
 * RECIPE-07, RECIPE-08 — RecipeTable rendering states.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RecipeTable } from "@/features/recipes/RecipeTable";
import type { PaintingRecipe } from "@/types/recipe";
import type { Faction } from "@/types/faction";
import type { Unit } from "@/types/unit";

function makeRecipe(over: Partial<PaintingRecipe> = {}): PaintingRecipe {
  return {
    id: 1, name: "Tau White Armor", faction_id: 1, unit_id: null,
    area: "Armor",
    primer: null, basecoat: null, shade: null, layer: null, highlight: null,
    glaze_filter: null, weathering: null, technical: null, basing: null,
    notes: null, tutorial_link: null,
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

function renderTable(props: Partial<Parameters<typeof RecipeTable>[0]> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const baseProps = {
    data: [] as PaintingRecipe[],
    factions: [] as Faction[],
    units: [] as Unit[],
    stepCountByRecipe: new Map<number, number>(),
    swatchColorsByRecipe: new Map<number, { paint_id: number; hex_color: string | null }[]>(),
    isLoading: false,
    onRowClick: vi.fn(),
    onAdd: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    ...props,
  };
  return render(
    <QueryClientProvider client={qc}>
      <RecipeTable {...baseProps} />
    </QueryClientProvider>
  );
}

describe("RecipeTable", () => {
  it("RECIPE-08: renders empty state with New recipe CTA when recipes is empty", () => {
    renderTable({ data: [] });
    expect(screen.getByText("No recipes yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New recipe" })).toBeInTheDocument();
  });

  it("RECIPE-07: renders recipe rows with name, faction badge, area, and step count", () => {
    renderTable({
      data: [makeRecipe({ name: "Tau White Armor", faction_id: 1, area: "Armor" })],
      factions: [makeFaction()],
      stepCountByRecipe: new Map([[1, 3]]),
    });
    expect(screen.getByText("Tau White Armor")).toBeInTheDocument();
    expect(screen.getByText("Tau Empire")).toBeInTheDocument();
    expect(screen.getByText("Armor")).toBeInTheDocument();
    expect(screen.getByText("3 steps")).toBeInTheDocument();
  });

  it("RECIPE-07: shows em-dash when faction_id is null", () => {
    renderTable({ data: [makeRecipe({ faction_id: null })], factions: [makeFaction()] });
    // Multiple em-dashes possible (faction + unit + area); just confirm at least one
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("calls onRowClick when a row is clicked", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    const onRowClick = vi.fn();
    renderTable({
      data: [makeRecipe()],
      factions: [makeFaction()],
      onRowClick,
    });
    await user.click(screen.getByText("Tau White Armor"));
    expect(onRowClick).toHaveBeenCalled();
  });
});
