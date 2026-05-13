/**
 * AR-02 -- ApplyRecipeDialog tests.
 * Covers: searchable recipe list, preview after selection, create mutation, reset on reopen.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplyRecipeDialog } from "@/features/recipes/ApplyRecipeDialog";
import type { PaintingRecipe } from "@/types/recipe";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockRecipes: PaintingRecipe[] = [
  {
    id: 1, name: "Ultramarine Blue", faction_id: 10, unit_id: null,
    area: null, primer: null, basecoat: null, shade: null, layer: null,
    highlight: null, glaze_filter: null, weathering: null, technical: null,
    basing: null, notes: null, tutorial_link: null, style: null, surface: null,
    effect: null, difficulty: null, estimated_minutes: null, result_photo_path: null,
    created_at: "2026-01-01", updated_at: "2026-01-01",
  },
  {
    id: 2, name: "Blood Red Armor", faction_id: null, unit_id: null,
    area: null, primer: null, basecoat: null, shade: null, layer: null,
    highlight: null, glaze_filter: null, weathering: null, technical: null,
    basing: null, notes: null, tutorial_link: null, style: null, surface: null,
    effect: null, difficulty: null, estimated_minutes: null, result_photo_path: null,
    created_at: "2026-01-01", updated_at: "2026-01-01",
  },
];

const mockCreateMutate = vi.fn();

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/hooks/useRecipes", () => ({
  useRecipes: () => ({ data: mockRecipes }),
}));

vi.mock("@/hooks/useFactions", () => ({
  useFactions: () => ({ data: [{ id: 10, name: "Ultramarines", color_theme: "#0047AB" }] }),
}));

vi.mock("@/hooks/useRecipeSections", () => ({
  useRecipeSections: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/hooks/useRecipePaints", () => ({
  useRecipePaints: () => ({ data: [] }),
}));

vi.mock("@/hooks/usePaints", () => ({
  usePaints: () => ({ data: [] }),
}));

vi.mock("@/hooks/useRecipeAssignments", () => ({
  useCreateAssignment: () => ({ mutate: mockCreateMutate, isPending: false }),
}));

vi.mock("@/features/recipes/SectionedTimeline", () => ({
  SectionedTimeline: () => <div data-testid="sectioned-timeline" />,
}));

vi.mock("@/features/recipes/RecipeStepTimeline", () => ({
  RecipeStepTimeline: () => <div data-testid="step-timeline" />,
}));

// Tauri mocks
vi.mock("@tauri-apps/api/path", () => ({
  appDataDir: vi.fn().mockResolvedValue("/mock/app/data"),
  join: vi.fn().mockImplementation((...parts: string[]) => parts.join("/")),
}));
vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: vi.fn().mockImplementation((path: string) => `asset://${path}`),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ApplyRecipeDialog", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders searchable recipe list", () => {
    render(
      <ApplyRecipeDialog open={true} unitId={1} onClose={mockOnClose} />,
    );

    expect(screen.getByText("Ultramarine Blue")).toBeInTheDocument();
    expect(screen.getByText("Blood Red Armor")).toBeInTheDocument();
  });

  it("shows preview after selecting recipe", async () => {
    const user = userEvent.setup();

    render(
      <ApplyRecipeDialog open={true} unitId={1} onClose={mockOnClose} />,
    );

    // Click to select a recipe
    await user.click(screen.getByText("Ultramarine Blue"));

    // Preview should show (RecipeStepTimeline since sections is empty)
    expect(screen.getByTestId("step-timeline")).toBeInTheDocument();
    expect(screen.getByText("Apply Recipe", { selector: "button" })).toBeInTheDocument();
  });

  it("calls createAssignment on confirm", async () => {
    const user = userEvent.setup();

    render(
      <ApplyRecipeDialog open={true} unitId={5} onClose={mockOnClose} />,
    );

    // Select recipe
    await user.click(screen.getByText("Blood Red Armor"));

    // Click confirm
    const confirmBtn = screen.getByText("Apply Recipe", { selector: "button" });
    await user.click(confirmBtn);

    expect(mockCreateMutate).toHaveBeenCalledWith(
      { unit_id: 5, recipe_id: 2 },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  it("resets selection when dialog reopens", async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <ApplyRecipeDialog open={true} unitId={1} onClose={mockOnClose} />,
    );

    // Select a recipe to go to preview
    await user.click(screen.getByText("Ultramarine Blue"));
    expect(screen.getByTestId("step-timeline")).toBeInTheDocument();

    // Close and reopen
    rerender(<ApplyRecipeDialog open={false} unitId={1} onClose={mockOnClose} />);
    rerender(<ApplyRecipeDialog open={true} unitId={1} onClose={mockOnClose} />);

    // Should be back on picker, not preview
    expect(screen.getByText("Ultramarine Blue")).toBeInTheDocument();
    expect(screen.getByText("Blood Red Armor")).toBeInTheDocument();
    expect(screen.queryByTestId("step-timeline")).not.toBeInTheDocument();
  });
});
