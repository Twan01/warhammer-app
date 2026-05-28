/**
 * SCP-01/SCP-03: RecipeFormSheet pre-fill behavior.
 *
 * Verifies:
 * - Form pre-fills faction_id when defaultFactionId prop is provided
 * - Form pre-fills unit_id when defaultUnitId prop is provided
 * - No pre-fill when default props are absent (current behavior preserved)
 * - Pre-filled fields remain editable (not disabled)
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/hooks/useFactions", () => ({
  useFactions: () => ({
    data: [
      { id: 10, name: "Ultramarines" },
      { id: 20, name: "Tau Empire" },
    ],
  }),
}));

vi.mock("@/hooks/useUnits", () => ({
  useUnits: () => ({
    data: [
      {
        id: 1, name: "Intercessors", faction_id: 10, quantity: 5,
        painting_status: "Not Started", basing_status: "Not Started",
        assembly_status: "Not Started", created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      {
        id: 2, name: "Crisis Suits", faction_id: 20, quantity: 3,
        painting_status: "Not Started", basing_status: "Not Started",
        assembly_status: "Not Started", created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
    ],
  }),
}));

vi.mock("@/hooks/usePaints", () => ({
  usePaints: () => ({ data: [] }),
}));

vi.mock("@/hooks/useRecipePaints", () => ({
  useRecipePaints: () => ({ data: [] }),
  RECIPE_PAINTS_KEY: () => ["recipe-paints"],
  STEP_COUNTS_KEY: ["step-counts"],
  RECIPE_AVAILABILITY_KEY: ["recipe-availability"],
  RECIPE_SWATCH_KEY: ["recipe-swatch"],
}));

vi.mock("@/hooks/useRecipeSections", () => ({
  useRecipeSections: () => ({ data: [] }),
  RECIPE_SECTIONS_KEY: () => ["recipe-sections"],
  SECTION_COUNTS_KEY: ["section-counts"],
}));

vi.mock("@/hooks/useRecipes", () => ({
  RECIPES_KEY: ["recipes"],
  RECIPE_KEY: (id: number) => ["recipes", id],
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  BaseDirectory: { AppData: 0 },
}));

vi.mock("@/db/queries/recipes", () => ({
  saveRecipeGraph: vi.fn(),
}));

// PaintSheet is rendered inside RecipeFormSheet for inline paint creation;
// mock it to avoid needing full paint hook mocks
vi.mock("@/features/paints/PaintSheet", () => ({
  PaintSheet: () => null,
}));

import { RecipeFormSheet } from "@/features/recipes/RecipeFormSheet";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SCP-01/SCP-03: RecipeFormSheet pre-fill", () => {
  it("pre-fills faction when defaultFactionId is provided", () => {
    render(
      <RecipeFormSheet
        open={true}
        recipe={null}
        onClose={vi.fn()}
        defaultFactionId={10}
      />,
      { wrapper: createWrapper() },
    );

    // The faction Select trigger should display the faction name
    const factionTriggers = screen.getAllByRole("combobox");
    // faction_id is the first Select in the form (after the text input for name)
    const factionTrigger = factionTriggers[0];
    expect(factionTrigger).toHaveTextContent("Ultramarines");
  });

  it("pre-fills unit when defaultUnitId is provided", () => {
    render(
      <RecipeFormSheet
        open={true}
        recipe={null}
        onClose={vi.fn()}
        defaultFactionId={10}
        defaultUnitId={1}
      />,
      { wrapper: createWrapper() },
    );

    const triggers = screen.getAllByRole("combobox");
    // unit_id is the second Select in the form
    const unitTrigger = triggers[1];
    expect(unitTrigger).toHaveTextContent("Intercessors");
  });

  it("does not pre-fill when default props are absent", () => {
    render(
      <RecipeFormSheet
        open={true}
        recipe={null}
        onClose={vi.fn()}
      />,
      { wrapper: createWrapper() },
    );

    const triggers = screen.getAllByRole("combobox");
    const factionTrigger = triggers[0];
    // When no default, the select shows "No faction" (value="none" is the default)
    expect(factionTrigger).toHaveTextContent("No faction");
  });

  it("pre-filled faction is editable (not disabled)", () => {
    render(
      <RecipeFormSheet
        open={true}
        recipe={null}
        onClose={vi.fn()}
        defaultFactionId={10}
      />,
      { wrapper: createWrapper() },
    );

    const triggers = screen.getAllByRole("combobox");
    const factionTrigger = triggers[0];
    expect(factionTrigger).not.toBeDisabled();
    expect(factionTrigger).not.toHaveAttribute("aria-disabled", "true");
  });
});
