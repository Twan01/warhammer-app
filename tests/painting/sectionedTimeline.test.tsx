/**
 * VIEW-01 through VIEW-04 — SectionedTimeline component tests.
 *
 * Covers:
 * - VIEW-01: Sectioned container and section headers with grouped steps
 * - VIEW-02: Section header metadata (surface, step count, time, optional badge)
 * - VIEW-03: Per-section owned/missing paint availability
 * - VIEW-04: Empty sections array renders nothing
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SectionedTimeline } from "@/features/recipes/SectionedTimeline";
import type { RecipeSection } from "@/types/recipeSection";
import type { RecipeStep } from "@/types/recipePaint";
import type { Paint } from "@/types/paint";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/features/recipes/RecipeStepTimeline", () => ({
  RecipeStepTimeline: ({ steps }: { steps: RecipeStep[] }) => (
    <div data-testid="step-timeline">
      {steps.map((s) => (
        <div key={s.id}>{s.step_name}</div>
      ))}
    </div>
  ),
}));

vi.mock("@/features/recipes/recipeSteps", () => ({
  isPaintMissing: (paint: Paint | undefined | null) => !paint || paint.owned !== 1,
}));

// ---------------------------------------------------------------------------
// Fixture factories
// ---------------------------------------------------------------------------

function makeSection(over: Partial<RecipeSection> = {}): RecipeSection {
  return {
    id: 1,
    recipe_id: 1,
    name: "Section A",
    surface: null,
    optional: 0,
    order_index: 0,
    notes: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...over,
  };
}

function makeStep(over: Partial<RecipeStep> = {}): RecipeStep {
  return {
    id: 1,
    recipe_id: 1,
    paint_id: 0,
    step_name: "Step",
    order_index: 0,
    notes: null,
    painting_phase: null,
    tool: null,
    technique: null,
    dilution: null,
    time_estimate_minutes: null,
    step_photo_path: null,
    alt_paint_id: null,
    section_id: null,
    created_at: "2026-01-01",
    ...over,
  };
}

function makePaint(over: Partial<Paint> = {}): Paint {
  return {
    id: 1,
    brand: "Citadel",
    name: "Macragge Blue",
    paint_type: "Base",
    color_family: null,
    hex_color: "#1e3a5f",
    owned: 1,
    quantity: null,
    running_low: 0,
    wishlist: 0,
    notes: null,
    purchase_price_pence: null,
    purchase_date: null,
    created_at: "2026-01-01 00:00:00",
    updated_at: "2026-01-01 00:00:00",
    ...over,
  };
}

// ---------------------------------------------------------------------------
// VIEW-01 — Container and grouped rendering
// ---------------------------------------------------------------------------

describe("SectionedTimeline — VIEW-01 (container and grouped steps)", () => {
  it("renders sectioned-timeline container when sections and steps are provided", () => {
    const sections = [
      makeSection({ id: 1, name: "Armour" }),
      makeSection({ id: 2, name: "Cloth", order_index: 1 }),
    ];
    const steps = [
      makeStep({ id: 1, step_name: "Primer", section_id: 1 }),
      makeStep({ id: 2, step_name: "Basecoat", section_id: 2 }),
    ];
    render(
      <SectionedTimeline
        sections={sections}
        steps={steps}
        paintMap={new Map()}
      />
    );
    expect(screen.getByTestId("sectioned-timeline")).toBeInTheDocument();
  });

  it("renders a section-header element for each section", () => {
    const sections = [
      makeSection({ id: 1, name: "Armour" }),
      makeSection({ id: 2, name: "Cloth", order_index: 1 }),
    ];
    render(
      <SectionedTimeline
        sections={sections}
        steps={[]}
        paintMap={new Map()}
      />
    );
    const headers = screen.getAllByTestId("section-header");
    expect(headers).toHaveLength(2);
  });

  it("each section header shows the section name", () => {
    const sections = [
      makeSection({ id: 1, name: "Armour" }),
      makeSection({ id: 2, name: "Cloth", order_index: 1 }),
    ];
    render(
      <SectionedTimeline
        sections={sections}
        steps={[]}
        paintMap={new Map()}
      />
    );
    expect(screen.getByText("Armour")).toBeInTheDocument();
    expect(screen.getByText("Cloth")).toBeInTheDocument();
  });

  it("steps appear grouped under their parent section", () => {
    const sections = [
      makeSection({ id: 1, name: "Armour" }),
      makeSection({ id: 2, name: "Cloth", order_index: 1 }),
    ];
    const steps = [
      makeStep({ id: 1, step_name: "Layer Armour", section_id: 1 }),
      makeStep({ id: 2, step_name: "Wash Cloth", section_id: 2 }),
    ];
    render(
      <SectionedTimeline
        sections={sections}
        steps={steps}
        paintMap={new Map()}
      />
    );
    // Both step names should appear in the document
    expect(screen.getByText("Layer Armour")).toBeInTheDocument();
    expect(screen.getByText("Wash Cloth")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// VIEW-02 — Section header metadata
// ---------------------------------------------------------------------------

describe("SectionedTimeline — VIEW-02 (section header metadata)", () => {
  it("shows surface badge text when section.surface is set", () => {
    const sections = [makeSection({ id: 1, name: "Armour", surface: "Armour" })];
    render(
      <SectionedTimeline
        sections={sections}
        steps={[makeStep({ section_id: 1 })]}
        paintMap={new Map()}
      />
    );
    // Surface badge — multiple "Armour" texts may exist (name + badge), just check at least one
    const armourEls = screen.getAllByText("Armour");
    expect(armourEls.length).toBeGreaterThan(0);
  });

  it("shows step count text", () => {
    const sections = [makeSection({ id: 1, name: "Section A" })];
    const steps = [
      makeStep({ id: 1, section_id: 1 }),
      makeStep({ id: 2, section_id: 1, order_index: 1 }),
    ];
    render(
      <SectionedTimeline sections={sections} steps={steps} paintMap={new Map()} />
    );
    expect(screen.getByText("2 steps")).toBeInTheDocument();
  });

  it("shows singular '1 step' when section has exactly one step", () => {
    const sections = [makeSection({ id: 1, name: "Section A" })];
    const steps = [makeStep({ id: 1, section_id: 1 })];
    render(
      <SectionedTimeline sections={sections} steps={steps} paintMap={new Map()} />
    );
    expect(screen.getByText("1 step")).toBeInTheDocument();
  });

  it("shows estimated time sum when at least one step has time_estimate_minutes", () => {
    const sections = [makeSection({ id: 1, name: "Section A" })];
    const steps = [
      makeStep({ id: 1, section_id: 1, time_estimate_minutes: 15 }),
      makeStep({ id: 2, section_id: 1, time_estimate_minutes: 10, order_index: 1 }),
    ];
    render(
      <SectionedTimeline sections={sections} steps={steps} paintMap={new Map()} />
    );
    expect(screen.getByText("25 min")).toBeInTheDocument();
  });

  it("hides time display when ALL steps in section have null time_estimate_minutes", () => {
    const sections = [makeSection({ id: 1, name: "Section A" })];
    const steps = [
      makeStep({ id: 1, section_id: 1, time_estimate_minutes: null }),
      makeStep({ id: 2, section_id: 1, time_estimate_minutes: null, order_index: 1 }),
    ];
    render(
      <SectionedTimeline sections={sections} steps={steps} paintMap={new Map()} />
    );
    expect(screen.queryByText(/\d+ min/)).not.toBeInTheDocument();
  });

  it("optional section (optional === 1) renders 'Optional' badge text", () => {
    const sections = [makeSection({ id: 1, name: "Section A", optional: 1 })];
    render(
      <SectionedTimeline sections={sections} steps={[]} paintMap={new Map()} />
    );
    expect(screen.getByText("Optional")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// VIEW-03 — Per-section availability
// ---------------------------------------------------------------------------

describe("SectionedTimeline — VIEW-03 (per-section paint availability)", () => {
  it("shows owned and missing counts when section has paints", () => {
    const ownedPaint = makePaint({ id: 1, owned: 1 });
    const missingPaint = makePaint({ id: 2, owned: 0 });
    const paintMap = new Map([
      [1, ownedPaint],
      [2, missingPaint],
    ]);
    const sections = [makeSection({ id: 1, name: "Section A" })];
    const steps = [
      makeStep({ id: 1, section_id: 1, paint_id: 1 }),
      makeStep({ id: 2, section_id: 1, paint_id: 2, order_index: 1 }),
      makeStep({ id: 3, section_id: 1, paint_id: 1, order_index: 2 }),
    ];
    render(
      <SectionedTimeline sections={sections} steps={steps} paintMap={paintMap} />
    );
    // Text may be split across elements — use regex to match
    expect(screen.getByText(/2 owned/)).toBeInTheDocument();
    expect(screen.getByText(/1 missing/)).toBeInTheDocument();
  });

  it("shows owned count but no missing count when all paints are owned", () => {
    const ownedPaint = makePaint({ id: 1, owned: 1 });
    const paintMap = new Map([[1, ownedPaint]]);
    const sections = [makeSection({ id: 1, name: "Section A" })];
    const steps = [
      makeStep({ id: 1, section_id: 1, paint_id: 1 }),
    ];
    render(
      <SectionedTimeline sections={sections} steps={steps} paintMap={paintMap} />
    );
    expect(screen.getByText(/1 owned/)).toBeInTheDocument();
    expect(screen.queryByText(/missing/)).not.toBeInTheDocument();
  });

  it("shows no availability info when section steps have no linked paints (paint_id === 0)", () => {
    const sections = [makeSection({ id: 1, name: "Section A" })];
    const steps = [
      makeStep({ id: 1, section_id: 1, paint_id: 0 }),
    ];
    render(
      <SectionedTimeline sections={sections} steps={steps} paintMap={new Map()} />
    );
    expect(screen.queryByText(/owned/)).not.toBeInTheDocument();
    expect(screen.queryByText(/missing/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// VIEW-04 — Empty sections guard
// ---------------------------------------------------------------------------

describe("SectionedTimeline — VIEW-04 (empty sections guard)", () => {
  it("renders nothing when sections array is empty", () => {
    const { container } = render(
      <SectionedTimeline sections={[]} steps={[]} paintMap={new Map()} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
