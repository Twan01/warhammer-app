import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HobbyPipeline } from "@/features/dashboard/HobbyPipeline";
import type { Unit } from "@/types/unit";

function u(over: Partial<Unit> = {}): Unit {
  return {
    id: 1,
    faction_id: 1,
    name: "Test Unit",
    category: null,
    unit_type: null,
    model_count: null,
    owned_count: null,
    points: 100,
    status_assembly: 1,
    status_painting: "Not Started",
    painting_percentage: 0,
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
    created_at: "2026-01-01 00:00:00",
    updated_at: "2026-01-01 00:00:00",
    ...over,
  };
}

describe("LAYOUT-03 — HobbyPipeline 5-bucket grouping", () => {
  it("renders exactly 5 bucket labels", () => {
    render(<HobbyPipeline units={[]} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(5);
  });

  it("renders bucket labels in order: Not Started, Assembly, Painting, Finishing, Done", () => {
    render(<HobbyPipeline units={[]} />);
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveAccessibleName(expect.stringContaining("Not Started"));
    expect(items[1]).toHaveAccessibleName(expect.stringContaining("Assembly"));
    expect(items[2]).toHaveAccessibleName(expect.stringContaining("Painting"));
    expect(items[3]).toHaveAccessibleName(expect.stringContaining("Finishing"));
    expect(items[4]).toHaveAccessibleName(expect.stringContaining("Done"));
  });

  it("shows 0 for all buckets when units array is empty", () => {
    render(<HobbyPipeline units={[]} />);
    const items = screen.getAllByRole("listitem");
    items.forEach((item) => {
      expect(item.textContent).toContain("0");
    });
  });

  it("sums Built + Primed into Assembly bucket", () => {
    const units = [
      u({ id: 1, status_painting: "Built" }),
      u({ id: 2, status_painting: "Primed" }),
      u({ id: 3, status_painting: "Primed" }),
    ];
    render(<HobbyPipeline units={units} />);
    const assemblyItem = screen.getByLabelText(/Assembly: 3 units/);
    expect(assemblyItem).toBeInTheDocument();
  });

  it("sums Basecoated + Shaded + Layered + Highlighted + Details Done into Painting bucket", () => {
    const units = [
      u({ id: 1, status_painting: "Basecoated" }),
      u({ id: 2, status_painting: "Shaded" }),
      u({ id: 3, status_painting: "Layered" }),
      u({ id: 4, status_painting: "Highlighted" }),
      u({ id: 5, status_painting: "Details Done" }),
    ];
    render(<HobbyPipeline units={units} />);
    const paintingItem = screen.getByLabelText(/Painting: 5 units/);
    expect(paintingItem).toBeInTheDocument();
  });

  it("sums Based + Varnished into Finishing bucket", () => {
    const units = [
      u({ id: 1, status_painting: "Based" }),
      u({ id: 2, status_painting: "Varnished" }),
    ];
    render(<HobbyPipeline units={units} />);
    const finishingItem = screen.getByLabelText(/Finishing: 2 units/);
    expect(finishingItem).toBeInTheDocument();
  });

  it("counts Completed into Done bucket", () => {
    const units = [
      u({ id: 1, status_painting: "Completed" }),
      u({ id: 2, status_painting: "Completed" }),
      u({ id: 3, status_painting: "Completed" }),
    ];
    render(<HobbyPipeline units={units} />);
    const doneItem = screen.getByLabelText(/Done: 3 units/);
    expect(doneItem).toBeInTheDocument();
  });

  it("counts Not Started into Not Started bucket", () => {
    const units = [
      u({ id: 1, status_painting: "Not Started" }),
    ];
    render(<HobbyPipeline units={units} />);
    const notStartedItem = screen.getByLabelText(/Not Started: 1 units/);
    expect(notStartedItem).toBeInTheDocument();
  });

  it("does NOT render individual stage labels like Built, Primed, Basecoated, etc.", () => {
    const units = [
      u({ id: 1, status_painting: "Built" }),
      u({ id: 2, status_painting: "Basecoated" }),
    ];
    render(<HobbyPipeline units={units} />);
    // These are individual stage labels from the old 11-stage rendering
    expect(screen.queryByText("Built")).toBeNull();
    expect(screen.queryByText("Primed")).toBeNull();
    expect(screen.queryByText("Basecoat")).toBeNull();
    expect(screen.queryByText("Shaded")).toBeNull();
    expect(screen.queryByText("Layered")).toBeNull();
    expect(screen.queryByText("Highlight")).toBeNull();
    expect(screen.queryByText("Details")).toBeNull();
    expect(screen.queryByText("Based")).toBeNull();
    expect(screen.queryByText("Varnish")).toBeNull();
  });
});
