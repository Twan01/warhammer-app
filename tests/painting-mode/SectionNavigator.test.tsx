import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SectionNavigator } from "@/features/painting-mode/SectionNavigator";
import type { RecipeStep } from "@/types/recipePaint";
import type { RecipeSection } from "@/types/recipeSection";

function makeSection(overrides: Partial<RecipeSection> = {}): RecipeSection {
  return {
    id: 1,
    recipe_id: 10,
    name: "Basecoat",
    surface: null,
    optional: 0,
    order_index: 0,
    notes: null,
    section_type: null,
    technique: null,
    execution_mode: null,
    applies_to: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeStep(overrides: Partial<RecipeStep> = {}): RecipeStep {
  return {
    id: 1,
    recipe_id: 10,
    paint_id: null,
    step_name: "Apply base",
    order_index: 0,
    notes: null,
    painting_phase: null,
    tool: null,
    technique: null,
    dilution: null,
    time_estimate_minutes: null,
    step_photo_path: null,
    alt_paint_id: null,
    section_id: 1,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function renderNavigator(overrides: Partial<Parameters<typeof SectionNavigator>[0]> = {}) {
  const defaultSteps = [
    makeStep({ id: 1, step_name: "Apply base", section_id: 1, order_index: 0 }),
    makeStep({ id: 2, step_name: "Layer highlight", section_id: 1, order_index: 1 }),
  ];

  const defaultSections = [makeSection({ id: 1, name: "Basecoat" })];

  const defaultProgressMap = new Map<number, { completed: number; total: number; name: string }>([
    [1, { completed: 1, total: 2, name: "Basecoat" }],
  ]);

  const props = {
    sections: defaultSections,
    orderedSteps: defaultSteps,
    completedSet: new Set<number>(),
    currentStepId: 1 as number | null,
    sectionProgressMap: defaultProgressMap,
    goToStep: vi.fn(),
    ...overrides,
  };

  return { ...render(<SectionNavigator {...props} />), goToStep: props.goToStep };
}

describe("SectionNavigator", () => {
  it("renders section name and step count badge", () => {
    renderNavigator();

    expect(screen.getByText("Basecoat")).toBeInTheDocument();
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  it("highlights current section", () => {
    renderNavigator({ currentStepId: 1 });

    const currentSection = screen.getByTestId("current-section");
    expect(currentSection).toBeInTheDocument();
    expect(currentSection).toHaveClass("border-l-3", "border-primary", "bg-accent/50");
  });

  it("calls goToStep when step item clicked", async () => {
    const user = userEvent.setup();
    const { goToStep } = renderNavigator({ currentStepId: 1 });

    // Click on the second step (not current, so not nested in trigger)
    const stepButton = screen.getByText("Layer highlight").closest("button")!;
    await user.click(stepButton);

    expect(goToStep).toHaveBeenCalledWith(2);
  });

  it("renders Optional badge for optional sections", () => {
    renderNavigator({
      sections: [makeSection({ id: 1, name: "Weathering", optional: 1 })],
    });

    expect(screen.getByText("Optional")).toBeInTheDocument();
  });

  it("groups unsectioned steps under General", () => {
    renderNavigator({
      sections: [makeSection({ id: 1, name: "Basecoat" })],
      orderedSteps: [
        makeStep({ id: 1, step_name: "Apply base", section_id: 1 }),
        makeStep({ id: 10, step_name: "Varnish coat", section_id: null }),
      ],
      currentStepId: 10, // set current to the unsectioned step so General section opens
      sectionProgressMap: new Map([
        [1, { completed: 0, total: 1, name: "Basecoat" }],
        [-1, { completed: 0, total: 1, name: "General" }],
      ]),
    });

    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Varnish coat")).toBeInTheDocument();
  });

  describe("SP-05: section completion acknowledgment", () => {
    it("renders Check icon when all steps in section are complete", () => {
      renderNavigator({
        sectionProgressMap: new Map([
          [1, { completed: 2, total: 2, name: "Basecoat" }],
        ]),
      });

      expect(screen.getByTestId("section-complete")).toBeInTheDocument();
      // Should NOT show the progress badge text
      expect(screen.queryByText("2/2")).not.toBeInTheDocument();
    });

    it("renders Badge with count when section is incomplete", () => {
      renderNavigator({
        sectionProgressMap: new Map([
          [1, { completed: 1, total: 3, name: "Basecoat" }],
        ]),
      });

      expect(screen.queryByTestId("section-complete")).not.toBeInTheDocument();
      expect(screen.getByText("1/3")).toBeInTheDocument();
    });

    it("completed section name has muted styling", () => {
      renderNavigator({
        sectionProgressMap: new Map([
          [1, { completed: 2, total: 2, name: "Basecoat" }],
        ]),
      });

      const sectionName = screen.getByText("Basecoat");
      expect(sectionName).toHaveClass("text-muted-foreground");
    });
  });

  it("shows check indicator for completed steps", () => {
    renderNavigator({
      completedSet: new Set([1]),
      currentStepId: 2,
    });

    // Completed step should have a check icon (svg with lucide Check)
    const completedStepButton = screen.getByText("Apply base").closest("button")!;
    const svgIcon = completedStepButton.querySelector("svg");
    expect(svgIcon).toBeInTheDocument();
    expect(svgIcon).toHaveClass("text-green-500");

    // Completed step text should have line-through
    expect(screen.getByText("Apply base")).toHaveClass("line-through");
  });

  describe("TS-04: optional sections", () => {
    it("clicking step inside optional section calls goToStep correctly", async () => {
      const user = userEvent.setup();
      const optionalSection = makeSection({ id: 1, name: "Weathering", optional: 1 });
      const step1 = makeStep({ id: 1, step_name: "Apply rust effect", section_id: 1, order_index: 0 });
      const step2 = makeStep({ id: 2, step_name: "Drybrush edges", section_id: 1, order_index: 1 });

      const { goToStep } = renderNavigator({
        sections: [optionalSection],
        orderedSteps: [step1, step2],
        currentStepId: 1, // ensures the collapsible is open
        sectionProgressMap: new Map([
          [1, { completed: 0, total: 2, name: "Weathering" }],
        ]),
      });

      const stepButton = screen.getByText("Drybrush edges").closest("button")!;
      await user.click(stepButton);

      expect(goToStep).toHaveBeenCalledWith(2);
    });

    it("optional section with all steps complete shows check icon", () => {
      renderNavigator({
        sections: [makeSection({ id: 1, name: "Weathering", optional: 1 })],
        sectionProgressMap: new Map([
          [1, { completed: 2, total: 2, name: "Weathering" }],
        ]),
      });

      expect(screen.getByTestId("section-complete")).toBeInTheDocument();
      expect(screen.queryByText("2/2")).not.toBeInTheDocument();
    });
  });
});
