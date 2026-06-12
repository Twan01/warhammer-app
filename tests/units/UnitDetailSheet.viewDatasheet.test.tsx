/**
 * NAV-02 — UnitDetailSheet "View Datasheet" button conditional rendering.
 *
 * Behaviors:
 *   - linked unit (udb_unit_id set)   → "View Datasheet" button is present
 *   - unlinked unit (udb_unit_id null) → "View Datasheet" button is absent
 *   - clicking the button deep-links to /unit-database with the unit's
 *     udb_unit_id as a search param (WR-01)
 *
 * Mirrors tests/enrichment/UnitDetailSheet.enrichment.test.tsx for mocking/setup.
 */
import { vi, describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Unit } from "@/types/unit";

vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));
vi.mock("@tauri-apps/plugin-fs", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  BaseDirectory: { AppData: "AppData" },
}));

const navigateMock = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("@/hooks/useFactions", () => ({
  useFactions: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/hooks/useRecipes", () => ({
  useRecipes: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/hooks/useUnits", () => ({
  useUpdateUnit: () => ({ mutate: vi.fn(), isPending: false }),
  UNITS_KEY: ["units"],
}));

vi.mock("@/hooks/useCurrencyPreference", () => ({
  useCurrencyPreference: () => ({ locale: "en-GB", currency: "GBP" }),
}));

vi.mock("@/features/units/PlaybookTab", () => ({
  PlaybookTab: () => <div data-testid="playbook-tab-stub" />,
}));

vi.mock("@/features/units/JournalTab", () => ({
  JournalTab: () => <div data-testid="journal-tab-stub" />,
}));

vi.mock("@/features/units/PaintingPipeline", () => ({
  PaintingPipeline: () => <div data-testid="painting-pipeline-stub" />,
}));

vi.mock("@/features/units/AppliedRecipesTab", () => ({
  AppliedRecipesTab: () => <div data-testid="applied-recipes-tab-stub" />,
}));

vi.mock("@/features/recipes/ApplyRecipeDialog", () => ({
  ApplyRecipeDialog: () => <div data-testid="apply-recipe-dialog-stub" />,
}));

import { UnitDetailSheet } from "@/features/units/UnitDetailSheet";

function makeUnit(over: Partial<Unit> = {}): Unit {
  return {
    id: 1,
    faction_id: 1,
    name: "Tactical Squad",
    category: "Troops",
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
    status_assembly_override: 0 as 0 | 1,
    status_basing_override: 0 as 0 | 1,
    status_varnished_override: 0 as 0 | 1,
    udb_unit_id: null,
    created_at: "2026-05-04",
    updated_at: "2026-05-04",
    ...over,
  };
}

function renderSheet(unit: Unit) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <UnitDetailSheet
        open={true}
        unit={unit}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onPhotoClick={vi.fn()}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  navigateMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("UnitDetailSheet — NAV-02: View Datasheet button", () => {
  it("renders 'View Datasheet' button when unit.udb_unit_id is set", () => {
    renderSheet(makeUnit({ udb_unit_id: "SM_TACTICAL_SQUAD" }));
    expect(screen.getByRole("button", { name: /view datasheet/i })).toBeInTheDocument();
  });

  it("does NOT render 'View Datasheet' button when unit.udb_unit_id is null", () => {
    renderSheet(makeUnit({ udb_unit_id: null }));
    expect(screen.queryByRole("button", { name: /view datasheet/i })).not.toBeInTheDocument();
  });

  it("deep-links to /unit-database with udbUnitId search param on click (WR-01)", async () => {
    const user = userEvent.setup();
    renderSheet(makeUnit({ udb_unit_id: "SM_TACTICAL_SQUAD" }));

    await user.click(screen.getByRole("button", { name: /view datasheet/i }));

    expect(navigateMock).toHaveBeenCalledWith({
      to: "/unit-database",
      search: { udbUnitId: "SM_TACTICAL_SQUAD" },
    });
  });
});
