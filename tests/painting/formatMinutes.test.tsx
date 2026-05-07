/**
 * STEP-04 — formatMinutes pure function behavior via RecipeFormSheet.
 *
 * formatMinutes is a module-level function in RecipeFormSheet.tsx that converts
 * a total-minutes integer to a human-readable string (e.g. "~30 min", "~1h").
 *
 * It is not exported, so its behavior is tested by rendering RecipeFormSheet
 * in edit mode with existingSteps that have time_estimate_minutes set.
 * The Recipe Steps header shows the computed total.
 *
 * Mocks all hooks that call Tauri/SQLite so the component can render in jsdom.
 */
import { vi, describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports
// ---------------------------------------------------------------------------

vi.mock("@/hooks/useRecipes", () => ({
  useCreateRecipe: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateRecipe: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

// useRecipePaints is the key mock: returning steps with time_estimate_minutes
// populates the draft steps state in RecipeFormSheet
const mockExistingSteps = vi.fn(() => ({ data: [] }));
vi.mock("@/hooks/useRecipePaints", () => ({
  useRecipePaints: (...args: unknown[]) => mockExistingSteps(...args),
  useAddRecipePaint: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRemoveRecipePaint: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useFactions", () => ({
  useFactions: () => ({ data: [] }),
}));

vi.mock("@/hooks/useUnits", () => ({
  useUnits: () => ({ data: [] }),
}));

vi.mock("@/hooks/usePaints", () => ({
  usePaints: () => ({ data: [] }),
  PAINTS_KEY: ["paints"],
}));

// PaintSheet (stacked inside RecipeFormSheet)
vi.mock("@/features/paints/PaintSheet", () => ({
  PaintSheet: () => null,
}));

// RecipeStepList renders RecipeStepRow which uses dnd-kit
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  closestCenter: vi.fn(),
  PointerSensor: class {},
  KeyboardSensor: class {},
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
  DragOverlay: () => null,
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  verticalListSortingStrategy: {},
  sortableKeyboardCoordinates: {},
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
  arrayMove: vi.fn((arr: unknown[]) => arr),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => "" } },
}));

// PaintCombobox inside each step row
vi.mock("@/features/recipes/PaintCombobox", () => ({
  PaintCombobox: () => <div data-testid="paint-combobox" />,
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { RecipeFormSheet } from "@/features/recipes/RecipeFormSheet";
import type { PaintingRecipe } from "@/types/recipe";
import type { RecipeStep } from "@/types/recipePaint";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRecipe(id = 1): PaintingRecipe {
  return {
    id,
    name: "Test Recipe",
    faction_id: null,
    unit_id: null,
    area: null,
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
    style: null,
    surface: null,
    effect: null,
    difficulty: null,
    estimated_minutes: null,
    result_photo_path: null,
    notes: null,
    created_at: "2026-01-01 00:00:00",
    updated_at: "2026-01-01 00:00:00",
  };
}

function makeStep(time: number | null, overrides: Partial<RecipeStep> = {}): RecipeStep {
  return {
    id: 1,
    recipe_id: 1,
    paint_id: 1,
    step_name: "Test step",
    order_index: 0,
    notes: null,
    painting_phase: null,
    tool: null,
    technique: null,
    dilution: null,
    time_estimate_minutes: time,
    created_at: "2026-01-01 00:00:00",
    ...overrides,
  };
}

function renderSheet(recipe: PaintingRecipe, steps: RecipeStep[]) {
  mockExistingSteps.mockReturnValue({ data: steps });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={qc}>
      <RecipeFormSheet open={true} recipe={recipe} onClose={onClose} />
    </QueryClientProvider>
  );
  return { onClose };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RecipeFormSheet — STEP-04 formatMinutes time sum display", () => {
  describe("formatMinutes(0) — no steps with time", () => {
    it("does not show any time text next to Recipe Steps when all times are null", async () => {
      renderSheet(makeRecipe(), [makeStep(null)]);
      // Allow the useEffect to fire and set steps state
      await waitFor(() => {
        expect(screen.getByText("Recipe Steps")).toBeInTheDocument();
      });
      // Should NOT render a time-sum span — no time set
      expect(screen.queryByText(/~\d/)).toBeNull();
    });
  });

  describe("formatMinutes(30) — under 1 hour", () => {
    it("shows '~30 min' when total step time is 30 minutes", async () => {
      renderSheet(makeRecipe(), [makeStep(30)]);
      await waitFor(() => {
        expect(screen.getByText("~30 min")).toBeInTheDocument();
      });
    });
  });

  describe("formatMinutes(60) — exactly 1 hour", () => {
    it("shows '~1h' when total step time is 60 minutes", async () => {
      renderSheet(makeRecipe(), [makeStep(60)]);
      await waitFor(() => {
        expect(screen.getByText("~1h")).toBeInTheDocument();
      });
    });
  });

  describe("formatMinutes(90) — 1 hour 30 min", () => {
    it("shows '~1h 30min' when total step time is 90 minutes", async () => {
      renderSheet(makeRecipe(), [makeStep(90)]);
      await waitFor(() => {
        expect(screen.getByText("~1h 30min")).toBeInTheDocument();
      });
    });
  });

  describe("formatMinutes — sums multiple steps", () => {
    it("shows '~45 min' when two steps sum to 45 minutes", async () => {
      renderSheet(makeRecipe(), [
        makeStep(15, { id: 1, order_index: 0 }),
        makeStep(30, { id: 2, order_index: 1 }),
      ]);
      await waitFor(() => {
        expect(screen.getByText("~45 min")).toBeInTheDocument();
      });
    });

    it("shows '~2h' when total is 120 minutes (two 60-min steps)", async () => {
      renderSheet(makeRecipe(), [
        makeStep(60, { id: 1, order_index: 0 }),
        makeStep(60, { id: 2, order_index: 1 }),
      ]);
      await waitFor(() => {
        expect(screen.getByText("~2h")).toBeInTheDocument();
      });
    });
  });
});
