/**
 * PROJ-03 — KanbanCard renders unit name, faction badge, progress, priority, target date.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { KanbanCard } from "@/features/painting-projects/KanbanCard";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";

function makeUnit(over: Partial<Unit> = {}): Unit {
  return {
    id: 1,
    faction_id: 1,
    name: "Fire Warriors",
    category: null,
    unit_type: null,
    model_count: null,
    owned_count: null,
    points: null,
    status_assembly: 0,
    status_painting: "Built",
    painting_percentage: 50,
    status_basing: 0,
    status_varnished: 0,
    is_active_project: 1,
    priority: 1,
    target_completion_date: "2099-12-31",
    purchase_date: null,
    purchase_price_pence: null,
    storage_location: null,
    main_image_path: null,
    notes: null,
    lore_notes: null,
    undercoat: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...over,
  };
}

function makeFaction(over: Partial<Faction> = {}): Faction {
  return {
    id: 1,
    name: "Tau Empire",
    game_system: "Warhammer 40K",
    description: null,
    color_theme: "#33aaff",
    icon_path: null,
    lore_notes: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...over,
  };
}

function renderCard(unit: Unit, faction: Faction | undefined = makeFaction()) {
  return render(
    <DndContext>
      <SortableContext items={[`unit-${unit.id}`]}>
        <KanbanCard
          unit={unit}
          faction={faction}
          onRemoveFromBoard={vi.fn()}
          onEditUnit={vi.fn()}
          onLogSession={vi.fn()}
        />
      </SortableContext>
    </DndContext>,
  );
}

describe("KanbanCard", () => {
  it("PROJ-03: renders unit name, faction badge, progress bar, and meta row", () => {
    renderCard(makeUnit({ name: "Fire Warriors", priority: 2, painting_percentage: 75 }));
    expect(screen.getByText("Fire Warriors")).toBeInTheDocument();
    expect(screen.getByText("Tau Empire")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // priority
  });

  it("PROJ-03: applies text-destructive when target_completion_date is past today", () => {
    const { container } = renderCard(makeUnit({ target_completion_date: "2000-01-01" }));
    const overdueSpan = container.querySelector('[aria-label^="Target date overdue"]');
    expect(overdueSpan).not.toBeNull();
    expect(overdueSpan?.className).toContain("text-destructive");
  });

  it("PROJ-03: hides target date when null", () => {
    renderCard(makeUnit({ target_completion_date: null, priority: null }));
    // No date span at all
    const dateSpan = document.querySelector('[aria-label^="Target date overdue"]');
    expect(dateSpan).toBeNull();
  });
});
