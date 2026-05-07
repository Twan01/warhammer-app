/**
 * STEP-01/03 — RecipeStepRow renders new structured step inputs.
 *
 * Verifies the two-line layout:
 *  - Line 1: painting_phase Select (with PAINTING_PHASES items), title Input, PaintCombobox
 *  - Line 2: tool, technique, dilution, time estimate inputs
 *  - STEP_SUGGESTIONS datalist is NOT rendered
 *
 * Mocks @dnd-kit/sortable (no pointer events in jsdom) and
 * PaintCombobox (to isolate RecipeStepRow from DB hooks).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecipeStepRow } from "@/features/recipes/RecipeStepRow";
import type { DraftStep } from "@/features/recipes/recipeSteps";
import { PAINTING_PHASES } from "@/features/recipes/recipeSchema";

// ---------------------------------------------------------------------------
// Mock @dnd-kit/sortable — useSortable calls pointer APIs not available in jsdom
// ---------------------------------------------------------------------------
vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: () => "",
    },
  },
}));

// ---------------------------------------------------------------------------
// Mock PaintCombobox — it calls usePaints which calls Tauri IPC
// ---------------------------------------------------------------------------
vi.mock("@/features/recipes/PaintCombobox", () => ({
  PaintCombobox: () => <div data-testid="paint-combobox" />,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
function makeDraftStep(over: Partial<DraftStep> = {}): DraftStep {
  return {
    localId: "test-local-id",
    step_name: "",
    paint_id: null,
    notes: null,
    painting_phase: null,
    tool: null,
    technique: null,
    dilution: null,
    time_estimate_minutes: null,
    ...over,
  };
}

function renderRow(step: DraftStep = makeDraftStep()) {
  const onChange = vi.fn();
  const onRemove = vi.fn();
  const onCreateNewPaint = vi.fn();
  const utils = render(
    <RecipeStepRow
      step={step}
      onChange={onChange}
      onRemove={onRemove}
      onCreateNewPaint={onCreateNewPaint}
    />
  );
  return { ...utils, onChange, onRemove, onCreateNewPaint };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RecipeStepRow — STEP-01/03 structured step inputs", () => {
  describe("painting_phase Select", () => {
    it("renders a Select trigger for painting_phase", () => {
      const { container } = renderRow();
      // Radix Select renders a trigger button with data-slot="select-trigger"
      // plus a hidden native select — target by data-slot to avoid ambiguity
      const trigger = container.querySelector("[data-slot='select-trigger']");
      expect(trigger).toBeInTheDocument();
    });

    it("Select trigger shows '-- phase --' text when painting_phase is null (__none__ sentinel)", () => {
      const { container } = renderRow(makeDraftStep({ painting_phase: null }));
      // When painting_phase is null the component passes value="__none__" to Radix Select.
      // The SelectItem value="__none__" renders the text "-- phase --" as the displayed value.
      const trigger = container.querySelector("[data-slot='select-trigger']");
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveTextContent("-- phase --");
    });

    it("shows the current painting_phase value when it is set", () => {
      const { container } = renderRow(makeDraftStep({ painting_phase: "basecoat" }));
      const trigger = container.querySelector("[data-slot='select-trigger']");
      expect(trigger).toHaveTextContent("basecoat");
    });

    it("PAINTING_PHASES const has 10 values covering all expected phases", () => {
      expect(PAINTING_PHASES).toHaveLength(10);
      expect(PAINTING_PHASES).toContain("prime");
      expect(PAINTING_PHASES).toContain("basecoat");
      expect(PAINTING_PHASES).toContain("shade");
      expect(PAINTING_PHASES).toContain("layer");
      expect(PAINTING_PHASES).toContain("highlight");
      expect(PAINTING_PHASES).toContain("glaze");
      expect(PAINTING_PHASES).toContain("weathering");
      expect(PAINTING_PHASES).toContain("basing");
      expect(PAINTING_PHASES).toContain("varnish");
      expect(PAINTING_PHASES).toContain("other");
    });
  });

  describe("step_name title input", () => {
    it("renders the title Input with correct placeholder", () => {
      renderRow();
      expect(
        screen.getByPlaceholderText("e.g. Edge highlight on pauldrons")
      ).toBeInTheDocument();
    });

    it("shows the current step_name value", () => {
      renderRow(makeDraftStep({ step_name: "Blue armor basecoat" }));
      const input = screen.getByPlaceholderText("e.g. Edge highlight on pauldrons");
      expect(input).toHaveValue("Blue armor basecoat");
    });
  });

  describe("PaintCombobox", () => {
    it("renders the PaintCombobox (mocked)", () => {
      renderRow();
      expect(screen.getByTestId("paint-combobox")).toBeInTheDocument();
    });
  });

  describe("tool input", () => {
    it("renders the Tool input on the second row", () => {
      renderRow();
      expect(screen.getByPlaceholderText("Tool")).toBeInTheDocument();
    });

    it("shows the current tool value", () => {
      renderRow(makeDraftStep({ tool: "Size 1 brush" }));
      expect(screen.getByPlaceholderText("Tool")).toHaveValue("Size 1 brush");
    });
  });

  describe("technique input", () => {
    it("renders the Technique input on the second row", () => {
      renderRow();
      expect(screen.getByPlaceholderText("Technique")).toBeInTheDocument();
    });

    it("shows the current technique value", () => {
      renderRow(makeDraftStep({ technique: "Wet blend" }));
      expect(screen.getByPlaceholderText("Technique")).toHaveValue("Wet blend");
    });
  });

  describe("dilution input", () => {
    it("renders the Dilution input on the second row", () => {
      renderRow();
      expect(screen.getByPlaceholderText("Dilution")).toBeInTheDocument();
    });

    it("shows the current dilution value", () => {
      renderRow(makeDraftStep({ dilution: "1:1 water" }));
      expect(screen.getByPlaceholderText("Dilution")).toHaveValue("1:1 water");
    });
  });

  describe("time estimate input", () => {
    it("renders the time estimate Input with placeholder 'Min'", () => {
      renderRow();
      expect(screen.getByPlaceholderText("Min")).toBeInTheDocument();
    });

    it("renders the time estimate input as type=number", () => {
      renderRow();
      const input = screen.getByPlaceholderText("Min");
      expect(input).toHaveAttribute("type", "number");
    });

    it("shows the current time_estimate_minutes value", () => {
      renderRow(makeDraftStep({ time_estimate_minutes: 15 }));
      expect(screen.getByPlaceholderText("Min")).toHaveValue(15);
    });
  });

  describe("notes input", () => {
    it("renders the notes Input on the third row", () => {
      renderRow();
      expect(screen.getByPlaceholderText("Notes…")).toBeInTheDocument();
    });
  });

  describe("STEP_SUGGESTIONS datalist removal", () => {
    it("does NOT render a datalist with id='recipe-step-suggestions'", () => {
      const { container } = renderRow();
      const oldDatalist = container.querySelector("#recipe-step-suggestions");
      expect(oldDatalist).toBeNull();
    });

    it("does NOT render any datalist with 'Primer' or 'Basecoat' as option values (old suggestions)", () => {
      const { container } = renderRow();
      const options = container.querySelectorAll("datalist option");
      const oldValues = Array.from(options).map((o) => o.getAttribute("value") ?? "");
      expect(oldValues).not.toContain("Primer");
      expect(oldValues).not.toContain("Basecoat");
      expect(oldValues).not.toContain("Shade");
    });
  });

  describe("drag handle", () => {
    it("renders a drag handle button with aria-label 'Drag to reorder step'", () => {
      renderRow();
      expect(
        screen.getByRole("button", { name: "Drag to reorder step" })
      ).toBeInTheDocument();
    });
  });

  describe("delete button", () => {
    it("renders a remove button with aria-label 'Remove step'", () => {
      renderRow();
      expect(
        screen.getByRole("button", { name: "Remove step" })
      ).toBeInTheDocument();
    });
  });
});
