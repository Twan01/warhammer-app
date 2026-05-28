/**
 * Phase 87 EP-02..EP-07 -- Entry point behavioral tests.
 *
 * Tests painting mode entry points across surfaces:
 * - EP-02: CurrentFocusCard Paint button
 * - EP-03: AppliedRecipesTab Paint button per assignment
 * - EP-04: KanbanCard paint icon when assignmentId available
 * - EP-05: RecipeDetailSheet Paint button for applied units
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";

// ============================================================================
// EP-02: CurrentFocusCard Paint button
// ============================================================================

// Prevent the real hook from firing (it calls Tauri APIs).
vi.mock("@/hooks/useUnitPhotos", () => ({
  useLatestUnitPhotos: vi.fn().mockReturnValue({ data: new Map() }),
}));

import { CurrentFocusCard } from "@/features/dashboard/CurrentFocusCard";

function makeUnit(over: Partial<Unit> = {}): Unit {
  return {
    id: 1,
    faction_id: 1,
    name: "Fire Warrior",
    category: null,
    unit_type: null,
    model_count: 10,
    owned_count: null,
    points: 100,
    status_assembly: 1,
    status_painting: "Highlighted",
    painting_percentage: 65,
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
    undercoat: null, status_assembly_override: 0 as 0 | 1, status_basing_override: 0 as 0 | 1, status_varnished_override: 0 as 0 | 1,
    created_at: "2026-01-01 00:00:00",
    updated_at: "2026-05-01 00:00:00",
    ...over,
  };
}

function makeFaction(over: Partial<Faction> = {}): Faction {
  return {
    id: 1,
    name: "Space Marines",
    game_system: "Warhammer 40K",
    description: null,
    color_theme: "#1e3a5f",
    icon_path: null,
    lore_notes: null,
    created_at: "2026-01-01 00:00:00",
    updated_at: "2026-01-01 00:00:00",
    ...over,
  };
}

describe("EP-02: CurrentFocusCard Paint button", () => {
  it("renders Paint button with data-testid when onPaint is provided", () => {
    render(
      <CurrentFocusCard
        unit={makeUnit()}
        faction={makeFaction()}
        photo={undefined}
        onOpen={vi.fn()}
        onLog={vi.fn()}
        onPaint={vi.fn()}
      />
    );

    const paintBtn = screen.getByTestId("paint-btn");
    expect(paintBtn).toBeInTheDocument();
    expect(paintBtn).toHaveTextContent("Paint");
  });

  it("calls onPaint when Paint button is clicked", async () => {
    const user = userEvent.setup();
    const onPaint = vi.fn();

    render(
      <CurrentFocusCard
        unit={makeUnit()}
        faction={makeFaction()}
        photo={undefined}
        onOpen={vi.fn()}
        onLog={vi.fn()}
        onPaint={onPaint}
      />
    );

    await user.click(screen.getByTestId("paint-btn"));
    expect(onPaint).toHaveBeenCalledOnce();
  });

  it("does NOT render Paint button when onPaint is undefined (EP-06)", () => {
    render(
      <CurrentFocusCard
        unit={makeUnit()}
        faction={makeFaction()}
        photo={undefined}
        onOpen={vi.fn()}
        onLog={vi.fn()}
      />
    );

    expect(screen.queryByTestId("paint-btn")).not.toBeInTheDocument();
  });

  it("does NOT render Paint button in empty state (EP-06)", () => {
    render(
      <CurrentFocusCard
        unit={null}
        faction={undefined}
        photo={undefined}
        onOpen={vi.fn()}
        onLog={vi.fn()}
        onPaint={vi.fn()}
      />
    );

    expect(screen.queryByTestId("paint-btn")).not.toBeInTheDocument();
  });
});

// ============================================================================
// EP-04: KanbanCard paint icon
// ============================================================================

import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { KanbanCard } from "@/features/painting-projects/KanbanCard";

function renderKanbanCard(props: Partial<import("@/features/painting-projects/KanbanCard").KanbanCardProps> = {}) {
  const unit = makeUnit();
  return render(
    <DndContext>
      <SortableContext items={[`unit-${unit.id}`]}>
        <KanbanCard
          unit={unit}
          faction={makeFaction()}
          onRemoveFromBoard={vi.fn()}
          onEditUnit={vi.fn()}
          onLogSession={vi.fn()}
          {...props}
        />
      </SortableContext>
    </DndContext>
  );
}

describe("EP-04: KanbanCard paint icon", () => {
  it("renders paint button when both onPaint and assignmentId are defined", () => {
    renderKanbanCard({ onPaint: vi.fn(), assignmentId: 42 });

    const paintBtn = screen.getByLabelText(/Open painting mode/i);
    expect(paintBtn).toBeInTheDocument();
  });

  it("calls onPaint with assignmentId on click", async () => {
    const onPaint = vi.fn();
    renderKanbanCard({ onPaint, assignmentId: 42 });

    // Use fireEvent.click instead of userEvent.click because dnd-kit's
    // useSortable hooks intercept pointer events from userEvent's full
    // pointer simulation sequence.
    fireEvent.click(screen.getByLabelText(/Open painting mode/i));
    expect(onPaint).toHaveBeenCalledWith(42);
  });

  it("does NOT render paint button when assignmentId is undefined (EP-06)", () => {
    renderKanbanCard({ onPaint: vi.fn() });

    expect(screen.queryByLabelText(/Open painting mode/i)).not.toBeInTheDocument();
  });

  it("does NOT render paint button when onPaint is undefined (EP-06)", () => {
    renderKanbanCard({ assignmentId: 42 });

    expect(screen.queryByLabelText(/Open painting mode/i)).not.toBeInTheDocument();
  });
});
