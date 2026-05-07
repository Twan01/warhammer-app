import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { Unit } from "@/types/unit";

/**
 * PROJ-03 — LogSessionSheet defaultUnitId prop pre-populates the unit picker.
 */

// Mock useUnits / useUpdateUnit so no SQLite dependency
const useUnitsMock = vi.fn();
vi.mock("@/hooks/useUnits", () => ({
  useUnits: () => useUnitsMock(),
  useUpdateUnit: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  UNITS_KEY: ["units"],
}));

// Mock useCreatePaintingSession so no SQLite dependency
vi.mock("@/hooks/useJournalSessions", () => ({
  useCreatePaintingSession: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeletePaintingSession: vi.fn(),
  PAINTING_SESSIONS_KEY: (id: number) => ["painting-sessions", id],
}));

// Mock useRecipes
const useRecipesMock = vi.fn();
vi.mock("@/hooks/useRecipes", () => ({
  useRecipes: () => useRecipesMock(),
}));

// Mock useRecipePaints
const useRecipePaintsMock = vi.fn();
vi.mock("@/hooks/useRecipePaints", () => ({
  useRecipePaints: (recipeId: number | undefined) => useRecipePaintsMock(recipeId),
}));

// Mock useFactions
vi.mock("@/hooks/useFactions", () => ({
  useFactions: () => ({ data: [{ id: 1, name: "Space Marines" }] }),
}));

// Mock todayISO to return a stable date
vi.mock("@/lib/dates", () => ({
  todayISO: () => "2026-05-05",
  relativeTime: vi.fn(),
  formatCurrency: vi.fn(),
}));

import { LogSessionSheet } from "@/features/dashboard/LogSessionSheet";

function u(over: Partial<Unit> = {}): Unit {
  return {
    id: 1,
    faction_id: 1,
    name: "Space Marines",
    category: null,
    unit_type: null,
    model_count: null,
    owned_count: null,
    points: null,
    status_assembly: 0,
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

function Wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const units: Unit[] = [
  u({ id: 1, name: "Space Marines" }),
  u({ id: 42, name: "Tau Crisis Suits" }),
  u({ id: 99, name: "Necron Warriors" }),
];

const recipes = [
  { id: 1, name: "Blue Armor Recipe", faction_id: 1 },
  { id: 2, name: "Gold Trim Recipe", faction_id: 1 },
];

beforeEach(() => {
  vi.clearAllMocks();
  useUnitsMock.mockReturnValue({ data: units, isLoading: false });
  useRecipesMock.mockReturnValue({ data: recipes, isLoading: false });
  useRecipePaintsMock.mockReturnValue({ data: [], isLoading: false });
});

describe("LogSessionSheet defaultUnitId", () => {
  it("pre-selects the unit when defaultUnitId is provided", () => {
    render(
      <Wrapper>
        <LogSessionSheet open={true} onClose={() => {}} defaultUnitId={42} />
      </Wrapper>
    );

    // The Select value span shows the unit name for id 42.
    // getAllByText because shadcn Select also renders a hidden <option> with the same text.
    const matches = screen.getAllByText("Tau Crisis Suits");
    expect(matches.length).toBeGreaterThan(0);
  });

  it("form resets with new defaultUnitId when sheet reopens for different unit — Pitfall 4", () => {
    const { rerender } = render(
      <Wrapper>
        <LogSessionSheet open={true} onClose={() => {}} defaultUnitId={42} />
      </Wrapper>
    );

    // First open: unit 42 selected
    expect(screen.getAllByText("Tau Crisis Suits").length).toBeGreaterThan(0);

    // Reopen for unit 1
    rerender(
      <Wrapper>
        <LogSessionSheet open={true} onClose={() => {}} defaultUnitId={1} />
      </Wrapper>
    );

    expect(screen.getAllByText("Space Marines").length).toBeGreaterThan(0);
  });

  it("unit picker remains editable even when defaultUnitId is set", () => {
    render(
      <Wrapper>
        <LogSessionSheet open={true} onClose={() => {}} defaultUnitId={42} />
      </Wrapper>
    );

    // Two comboboxes now (unit + new_status); get the Unit one by its accessible name
    // or by grabbing all comboboxes and checking the first is not disabled.
    const triggers = screen.getAllByRole("combobox");
    expect(triggers[0]).not.toBeDisabled();
  });

  it("renders normally when defaultUnitId is undefined", () => {
    render(
      <Wrapper>
        <LogSessionSheet open={true} onClose={() => {}} />
      </Wrapper>
    );

    // Should show the placeholder when no defaultUnitId provided
    expect(screen.getByText("Select a unit")).toBeDefined();
  });
});

describe("LogSessionSheet — INTEG-01 (recipe/step selectors)", () => {
  it("renders a Recipe combobox when recipes are available", () => {
    render(
      <Wrapper>
        <LogSessionSheet open={true} onClose={() => {}} />
      </Wrapper>
    );
    expect(screen.getByText("Recipe")).toBeInTheDocument();
    // getAllByText because shadcn Select renders text in both trigger and hidden option.
    expect(screen.getAllByText("No recipe").length).toBeGreaterThan(0);
  });

  it("does not render Step selector when no recipe is selected", () => {
    render(
      <Wrapper>
        <LogSessionSheet open={true} onClose={() => {}} />
      </Wrapper>
    );
    expect(screen.queryByText("Recipe Step")).not.toBeInTheDocument();
  });

  it("form resets recipe_id and recipe_step_id to null on each open", () => {
    const { rerender } = render(
      <Wrapper>
        <LogSessionSheet open={false} onClose={() => {}} />
      </Wrapper>
    );
    rerender(
      <Wrapper>
        <LogSessionSheet open={true} onClose={() => {}} />
      </Wrapper>
    );
    // "No recipe" should be shown (default selection), not a specific recipe name.
    // getAllByText because shadcn Select renders text in both trigger and hidden option.
    const matches = screen.getAllByText("No recipe");
    expect(matches.length).toBeGreaterThan(0);
  });
});
