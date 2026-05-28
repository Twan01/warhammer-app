/**
 * Phase 17 — UnitDetailSheet Details tab enrichment display tests (ENRCH-04).
 *
 * Verifies that the Undercoat read-only row renders correctly in the Details tab.
 * Lore Notes was merged into Notes (migration 036) and is no longer a separate field.
 */
import { vi, describe, it, expect, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Unit } from "@/types/unit";

vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));
vi.mock("@tauri-apps/plugin-fs", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  BaseDirectory: { AppData: "AppData" },
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
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

vi.mock("@/features/units/PlaybookTab", () => ({
  PlaybookTab: () => <div data-testid="playbook-tab-stub" />,
}));

vi.mock("@/features/units/JournalTab", () => ({
  JournalTab: () => <div data-testid="journal-tab-stub" />,
}));

vi.mock("@/features/units/PaintingPipeline", () => ({
  PaintingPipeline: () => <div data-testid="painting-pipeline-stub" />,
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
    undercoat: null, status_assembly_override: 0 as 0 | 1, status_basing_override: 0 as 0 | 1, status_varnished_override: 0 as 0 | 1,
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
    </QueryClientProvider>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("UnitDetailSheet — enrichment display", () => {
  it("renders Undercoat value when unit.undercoat is set", () => {
    renderSheet(makeUnit({ undercoat: "Chaos Black" }));
    expect(screen.getByText("Undercoat")).toBeInTheDocument();
    expect(screen.getByText("Chaos Black")).toBeInTheDocument();
  });

  it("does not render Undercoat row when unit.undercoat is null", () => {
    renderSheet(makeUnit({ undercoat: null }));
    expect(screen.queryByText("Undercoat")).toBeNull();
  });

  it("renders Notes content when unit.notes is set", () => {
    const noteContent = "Veterans of the Siege of Vraks.";
    renderSheet(makeUnit({ notes: noteContent }));
    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(screen.getByText(noteContent)).toBeInTheDocument();
  });

  it("does not render Notes section when unit.notes is null", () => {
    renderSheet(makeUnit({ notes: null }));
    expect(screen.queryByText("Notes")).toBeNull();
  });

  it("renders painting pipeline stepper", () => {
    renderSheet(makeUnit());
    expect(screen.getByTestId("painting-pipeline-stub")).toBeInTheDocument();
  });
});
