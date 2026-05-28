/**
 * PANEL-01: CurrentFocusCard displays photo thumbnail, unit name, faction name,
 * model count, points (null-safe), and painting progress.
 * PANEL-02: CurrentFocusCard exposes Open (ExternalLink) and Log (Paintbrush)
 * ghost action buttons wired to onOpen / onLog callbacks.
 *
 * Props-based component — no QueryClient, no router, no context needed.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CurrentFocusCard } from "@/features/dashboard/CurrentFocusCard";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";
import type { UnitPhotoWithUrl } from "@/hooks/useUnitPhotos";
import type { WorkflowPosition } from "@/lib/computeWorkflowPosition";
import type { AppliedRecipeProgress } from "@/types/recipeAssignment";

// CurrentFocusCard renders UnitThumbnail which imports from @/hooks/useUnitPhotos.
// Prevent the real hook from firing (it calls Tauri APIs).
vi.mock("@/hooks/useUnitPhotos", () => ({
  useLatestUnitPhotos: vi.fn().mockReturnValue({ data: new Map() }),
}));

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

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

function makePhoto(over: Partial<UnitPhotoWithUrl> = {}): UnitPhotoWithUrl {
  return {
    id: 1,
    unit_id: 1,
    file_path: "photos/fire-warrior.jpg",
    caption: null,
    taken_at: null,
    created_at: "2026-05-01 00:00:00",
    assetUrl: "asset://localhost/photos/fire-warrior.jpg",
    ...over,
  } as UnitPhotoWithUrl;
}

// ---------------------------------------------------------------------------
// PANEL-01: photo and metadata
// ---------------------------------------------------------------------------

describe("CurrentFocusCard", () => {
  describe("PANEL-01: photo and metadata", () => {
    it("renders UnitThumbnail with size md when unit exists", () => {
      const unit = makeUnit();
      const faction = makeFaction();
      const photo = makePhoto();

      render(
        <CurrentFocusCard
          unit={unit}
          faction={faction}
          photo={photo}
          onOpen={vi.fn()}
          onLog={vi.fn()}
        />
      );

      // Photo renders as an img element when photo prop is present
      const img = screen.getByRole("img");
      expect(img).toBeInTheDocument();
      // Size md class: w-20 h-20
      expect(img.className).toContain("w-20");
      expect(img.className).toContain("h-20");
    });

    it("displays unit name", () => {
      const unit = makeUnit({ name: "Crisis Battlesuit" });
      const faction = makeFaction();

      render(
        <CurrentFocusCard
          unit={unit}
          faction={faction}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
        />
      );

      expect(screen.getByText("Crisis Battlesuit")).toBeInTheDocument();
    });

    it("displays faction name", () => {
      const unit = makeUnit();
      const faction = makeFaction({ name: "T'au Empire" });

      render(
        <CurrentFocusCard
          unit={unit}
          faction={faction}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
        />
      );

      expect(screen.getByText("T'au Empire")).toBeInTheDocument();
    });

    it("displays model count with null-safe fallback", () => {
      const unit = makeUnit({ model_count: null });
      const faction = makeFaction();

      render(
        <CurrentFocusCard
          unit={unit}
          faction={faction}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
        />
      );

      // Null model count renders as "---"
      expect(screen.getByText(/--- models/)).toBeInTheDocument();
    });

    it("displays points with null-safe fallback", () => {
      const unit = makeUnit({ points: null });
      const faction = makeFaction();

      render(
        <CurrentFocusCard
          unit={unit}
          faction={faction}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
        />
      );

      // Null points renders as "---"
      expect(screen.getByText(/--- pts/)).toBeInTheDocument();
    });

    it("displays painting progress percentage", () => {
      const unit = makeUnit({ painting_percentage: 65 });
      const faction = makeFaction();

      render(
        <CurrentFocusCard
          unit={unit}
          faction={faction}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
        />
      );

      expect(screen.getByText("65% painted")).toBeInTheDocument();
    });

    it("renders progress bar with correct width", () => {
      const unit = makeUnit({ painting_percentage: 42 });
      const faction = makeFaction();

      const { container } = render(
        <CurrentFocusCard
          unit={unit}
          faction={faction}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
        />
      );

      // Progress bar fill div has inline width style
      const fills = container.querySelectorAll("[style*='width']");
      const progressFill = Array.from(fills).find(
        (el) => (el as HTMLElement).style.width === "42%"
      );
      expect(progressFill).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // PANEL-02: action buttons
  // ---------------------------------------------------------------------------

  describe("PANEL-02: action buttons", () => {
    it("renders Open button with ExternalLink icon", () => {
      const unit = makeUnit();
      const faction = makeFaction();

      render(
        <CurrentFocusCard
          unit={unit}
          faction={faction}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
        />
      );

      const openButton = screen.getByRole("button", { name: /Open/i });
      expect(openButton).toBeInTheDocument();
      // ExternalLink renders as SVG inside the button
      const svg = openButton.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders Log button with Paintbrush icon", () => {
      const unit = makeUnit();
      const faction = makeFaction();

      render(
        <CurrentFocusCard
          unit={unit}
          faction={faction}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
        />
      );

      const logButton = screen.getByRole("button", { name: /Log/i });
      expect(logButton).toBeInTheDocument();
      const svg = logButton.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("calls onOpen when Open button is clicked", async () => {
      const unit = makeUnit();
      const faction = makeFaction();
      const onOpen = vi.fn();
      const user = userEvent.setup();

      render(
        <CurrentFocusCard
          unit={unit}
          faction={faction}
          photo={undefined}
          onOpen={onOpen}
          onLog={vi.fn()}
        />
      );

      await user.click(screen.getByRole("button", { name: /Open/i }));

      expect(onOpen).toHaveBeenCalledOnce();
    });

    it("calls onLog when Log button is clicked", async () => {
      const unit = makeUnit();
      const faction = makeFaction();
      const onLog = vi.fn();
      const user = userEvent.setup();

      render(
        <CurrentFocusCard
          unit={unit}
          faction={faction}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={onLog}
        />
      );

      await user.click(screen.getByRole("button", { name: /Log/i }));

      expect(onLog).toHaveBeenCalledOnce();
    });
  });

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  describe("empty state", () => {
    it("shows empty state when unit is null", () => {
      render(
        <CurrentFocusCard
          unit={null}
          faction={undefined}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
        />
      );

      expect(
        screen.getByText(/No active project/i)
      ).toBeInTheDocument();
    });

    it("does not render action buttons when unit is null", () => {
      render(
        <CurrentFocusCard
          unit={null}
          faction={undefined}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
        />
      );

      expect(screen.queryByRole("button", { name: /Open/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /Log/i })).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // DATA-06: recipe name display
  // ---------------------------------------------------------------------------

  describe("DATA-06: recipe name display", () => {
    it("renders recipe name with Palette icon when recipeName prop is provided", () => {
      const unit = makeUnit();
      const faction = makeFaction();

      render(
        <CurrentFocusCard
          unit={unit}
          faction={faction}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
          recipeName="Battle Line Alpha"
        />
      );

      expect(screen.getByText(/Battle Line Alpha/)).toBeInTheDocument();
      // Palette icon renders as an SVG — confirm it is in the document
      const recipeSpan = screen.getByText(/Battle Line Alpha/).closest("span");
      expect(recipeSpan).not.toBeNull();
      const svg = recipeSpan?.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders nothing for recipe when recipeName is null", () => {
      const unit = makeUnit();
      const faction = makeFaction();

      render(
        <CurrentFocusCard
          unit={unit}
          faction={faction}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
          recipeName={null}
        />
      );

      // No recipe text in the DOM at all
      expect(screen.queryByText(/Battle Line Alpha/)).toBeNull();
      // Palette icon should not render
      expect(document.querySelector("[aria-hidden][data-icon]")).toBeNull();
    });

    it("renders nothing for recipe when recipeName is undefined (prop omitted)", () => {
      const unit = makeUnit();
      const faction = makeFaction();

      const { container } = render(
        <CurrentFocusCard
          unit={unit}
          faction={faction}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
          // recipeName not passed → undefined
        />
      );

      // No span with a Palette icon should be rendered
      // Look for any span that contains text referencing a recipe name
      // Since no recipe name is provided, just verify the component renders normally
      expect(container.querySelectorAll("svg").length).toBeGreaterThan(0); // Other icons exist
      // No extra text below faction name
      expect(screen.queryByText(/\(\+/)).toBeNull();
    });

    it("shows '+N more' suffix when extraRecipeCount > 0", () => {
      const unit = makeUnit();
      const faction = makeFaction();

      render(
        <CurrentFocusCard
          unit={unit}
          faction={faction}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
          recipeName="Recipe A"
          extraRecipeCount={2}
        />
      );

      expect(screen.getByText(/Recipe A \(\+2 more\)/)).toBeInTheDocument();
    });

    it("does not show '+N more' suffix when extraRecipeCount is 0", () => {
      const unit = makeUnit();
      const faction = makeFaction();

      render(
        <CurrentFocusCard
          unit={unit}
          faction={faction}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
          recipeName="Recipe A"
          extraRecipeCount={0}
        />
      );

      expect(screen.getByText("Recipe A")).toBeInTheDocument();
      expect(screen.queryByText(/\+/)).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // PROJ-02: workflow position display
  // ---------------------------------------------------------------------------

  describe("PROJ-02: workflow position display", () => {
    function makePosition(over: Partial<WorkflowPosition> = {}): WorkflowPosition {
      return {
        sectionName: "Armour",
        sectionIndex: 0,
        totalSections: 3,
        stepName: "Base Coat",
        stepIndex: 3,
        totalSteps: 12,
        technique: "Drybrush",
        isComplete: false,
        nextStepName: "Layer Highlight",
        ...over,
      };
    }

    it("PROJ-02: renders workflow guidance with section, technique, and step count", () => {
      render(
        <CurrentFocusCard
          unit={makeUnit()}
          faction={makeFaction()}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
          workflowPosition={makePosition()}
        />
      );

      expect(screen.getByText(/Armour/)).toBeInTheDocument();
      expect(screen.getByText(/Drybrush/)).toBeInTheDocument();
      expect(screen.getByText(/step 4\/12/)).toBeInTheDocument();
    });

    it("PROJ-02: renders workflow guidance without technique", () => {
      render(
        <CurrentFocusCard
          unit={makeUnit()}
          faction={makeFaction()}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
          workflowPosition={makePosition({ technique: null })}
        />
      );

      expect(screen.getByText(/Armour/)).toBeInTheDocument();
      expect(screen.getByText(/step 4\/12/)).toBeInTheDocument();
      // No colon between section name and step when no technique
      const workflowLine = screen.getByText(/Armour/).closest("span");
      expect(workflowLine?.textContent).not.toContain(": ");
    });

    it("PROJ-02: renders Recipe complete when isComplete", () => {
      render(
        <CurrentFocusCard
          unit={makeUnit()}
          faction={makeFaction()}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
          workflowPosition={makePosition({ isComplete: true })}
        />
      );

      expect(screen.getByText(/Recipe complete/)).toBeInTheDocument();
    });

    it("PROJ-05: does not render workflow line when workflowPosition is null", () => {
      const { container } = render(
        <CurrentFocusCard
          unit={makeUnit()}
          faction={makeFaction()}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
        />
      );

      // No Layers icon or step count
      expect(screen.queryByText(/step \d+\/\d+/)).toBeNull();
      expect(screen.queryByText(/Recipe complete/)).toBeNull();
    });

    it("PROJ-02: renders flat recipe step count", () => {
      render(
        <CurrentFocusCard
          unit={makeUnit()}
          faction={makeFaction()}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
          workflowPosition={makePosition({
            sectionName: null,
            sectionIndex: null,
            totalSections: 0,
            technique: null,
            stepIndex: 5,
            totalSteps: 20,
          })}
        />
      );

      expect(screen.getByText(/Step 6\/20/)).toBeInTheDocument();
    });

    it("renders unit name and faction", () => {
      render(
        <CurrentFocusCard
          unit={makeUnit({ name: "Riptide" })}
          faction={makeFaction({ name: "Tau Empire" })}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
          workflowPosition={makePosition()}
        />
      );

      expect(screen.getByText("Riptide")).toBeInTheDocument();
      expect(screen.getByText("Tau Empire")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // AR-06: Applied recipe progress display on CurrentFocusCard
  // ---------------------------------------------------------------------------

  describe("AR-06: appliedProgress display", () => {
    function makeProgress(over: Partial<AppliedRecipeProgress> = {}): AppliedRecipeProgress {
      return {
        recipeName: "NMM Gold",
        completed: 5,
        total: 12,
        assignmentCount: 1,
        ...over,
      };
    }

    function makePosition(over: Partial<WorkflowPosition> = {}): WorkflowPosition {
      return {
        sectionName: "Armour",
        sectionIndex: 0,
        totalSections: 3,
        stepName: "Base Coat",
        stepIndex: 3,
        totalSteps: 12,
        technique: "Drybrush",
        isComplete: false,
        nextStepName: "Layer Highlight",
        ...over,
      };
    }

    it("renders recipeName: completed/total steps with Layers icon when appliedProgress is provided", () => {
      const { container } = render(
        <CurrentFocusCard
          unit={makeUnit()}
          faction={makeFaction()}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
          appliedProgress={makeProgress({ recipeName: "Ultra Blue", completed: 8, total: 12 })}
        />
      );

      expect(screen.getByText(/Ultra Blue: 8\/12 steps/)).toBeInTheDocument();
      // The span containing the progress text should have a Layers SVG icon
      const progressSpan = screen.getByText(/Ultra Blue: 8\/12 steps/).closest("span");
      expect(progressSpan).not.toBeNull();
      const svg = progressSpan?.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders +N more suffix when assignmentCount > 1", () => {
      render(
        <CurrentFocusCard
          unit={makeUnit()}
          faction={makeFaction()}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
          appliedProgress={makeProgress({ recipeName: "Red Armor", completed: 3, total: 8, assignmentCount: 4 })}
        />
      );

      expect(screen.getByText(/Red Armor: 3\/8 steps/)).toBeInTheDocument();
      expect(screen.getByText(/\(\+3 more\)/)).toBeInTheDocument();
    });

    it("does not render +N more suffix when assignmentCount is 1", () => {
      render(
        <CurrentFocusCard
          unit={makeUnit()}
          faction={makeFaction()}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
          appliedProgress={makeProgress({ assignmentCount: 1 })}
        />
      );

      expect(screen.getByText(/NMM Gold: 5\/12 steps/)).toBeInTheDocument();
      expect(screen.queryByText(/more/)).toBeNull();
    });

    it("falls back to workflowPosition when appliedProgress is null", () => {
      render(
        <CurrentFocusCard
          unit={makeUnit()}
          faction={makeFaction()}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
          appliedProgress={null}
          workflowPosition={makePosition()}
        />
      );

      expect(screen.getByText(/Armour/)).toBeInTheDocument();
      expect(screen.getByText(/Drybrush/)).toBeInTheDocument();
      expect(screen.queryByText(/steps$/)).toBeNull();
    });

    it("falls back to workflowPosition when appliedProgress is undefined (prop omitted)", () => {
      render(
        <CurrentFocusCard
          unit={makeUnit()}
          faction={makeFaction()}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
          workflowPosition={makePosition({ sectionName: "Details", technique: null, stepIndex: 1, totalSteps: 5 })}
        />
      );

      expect(screen.getByText(/Details/)).toBeInTheDocument();
      expect(screen.getByText(/step 2\/5/)).toBeInTheDocument();
    });

    it("appliedProgress supersedes workflowPosition when both are provided", () => {
      render(
        <CurrentFocusCard
          unit={makeUnit()}
          faction={makeFaction()}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
          appliedProgress={makeProgress({ recipeName: "My Recipe", completed: 1, total: 3 })}
          workflowPosition={makePosition()}
        />
      );

      expect(screen.getByText(/My Recipe: 1\/3 steps/)).toBeInTheDocument();
      // workflowPosition "Drybrush" technique text should NOT appear
      expect(screen.queryByText(/Drybrush/)).toBeNull();
    });

    it("renders nothing for workflow line when both appliedProgress and workflowPosition are null", () => {
      render(
        <CurrentFocusCard
          unit={makeUnit()}
          faction={makeFaction()}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
          appliedProgress={null}
          workflowPosition={null}
        />
      );

      expect(screen.queryByText(/steps/)).toBeNull();
      expect(screen.queryByText(/Recipe complete/)).toBeNull();
    });
  });
});
