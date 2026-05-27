/**
 * Phase 88-02 -- PaintingModeView integration tests.
 *
 * TS-05: paintless steps do not trigger PaintReadinessBanner
 * TS-06: missing paint warning fires/suppresses correctly with specific names
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ReactNode } from "react";
import type { RecipeStep } from "@/types/recipePaint";
import type { RecipeSection } from "@/types/recipeSection";
import type { Paint } from "@/types/paint";

// ---------------------------------------------------------------------------
// Mocks (same 6 as PaintingModeView.test.tsx per D-18)
// ---------------------------------------------------------------------------

const mockUsePaints = vi.fn();
const mockUseRecipeSections = vi.fn();
const mockOnMarkDone = vi.fn();

vi.mock("@/hooks/usePaints", () => ({
  usePaints: (...args: unknown[]) => mockUsePaints(...args),
}));

vi.mock("@/hooks/useRecipeSections", () => ({
  useRecipeSections: (...args: unknown[]) => mockUseRecipeSections(...args),
}));

vi.mock("@tauri-apps/api/path", () => ({
  appDataDir: vi.fn().mockResolvedValue("/app/data"),
  join: vi.fn().mockImplementation((...parts: string[]) =>
    Promise.resolve(parts.join("/")),
  ),
}));

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: (path: string) => `asset://${path}`,
}));

vi.mock("@/features/recipes/recipeSteps", () => ({
  isPaintMissing: (paint: Paint | null | undefined) => {
    if (!paint) return true;
    return paint.owned !== 1;
  },
}));

vi.mock("@/lib/dates", () => ({
  todayISO: () => "2026-05-20",
}));

import { PaintingModeView } from "@/features/painting-mode/PaintingModeView";

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function makeStep(overrides: Partial<RecipeStep> = {}): RecipeStep {
  return {
    id: 1,
    recipe_id: 10,
    paint_id: 10,
    step_name: "Apply base coat",
    order_index: 0,
    notes: null,
    painting_phase: "basecoat",
    tool: "Size 1 brush",
    technique: "brush",
    dilution: "thin",
    time_estimate_minutes: 15,
    step_photo_path: null,
    alt_paint_id: null,
    section_id: 100,
    created_at: "2026-01-01",
    ...overrides,
  };
}

function makeSection(overrides: Partial<RecipeSection> = {}): RecipeSection {
  return {
    id: 100,
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
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...overrides,
  };
}

function makePaint(overrides: Partial<Paint> = {}): Paint {
  return {
    id: 10,
    brand: "Citadel",
    name: "Abaddon Black",
    paint_type: "Base",
    color_family: null,
    hex_color: "#231f20",
    owned: 1,
    quantity: null,
    running_low: 0,
    wishlist: 0,
    notes: null,
    purchase_price_pence: null,
    purchase_date: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...overrides,
  };
}

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <TooltipProvider>{children}</TooltipProvider>
      </QueryClientProvider>
    );
  };
}

// Default painting mode state used by tests
let defaultState: ReturnType<typeof import("@/hooks/usePaintingModeState").usePaintingModeState>;

function renderView(stateOverride?: Partial<typeof defaultState>) {
  const state = { ...defaultState, ...stateOverride };
  return render(
    <PaintingModeView state={state} onMarkDone={mockOnMarkDone} onMarkDoneWithSession={vi.fn()} recipeId={10} isMutating={false} />,
    { wrapper: createWrapper() },
  );
}

// ---------------------------------------------------------------------------
// Default mock returns
// ---------------------------------------------------------------------------

function setDefaultMocks() {
  const step1 = makeStep({ id: 1, step_name: "Apply base coat", paint_id: 10, section_id: 100, order_index: 0 });
  const step2 = makeStep({ id: 2, step_name: "Apply shade wash", paint_id: 20, section_id: 100, order_index: 1 });

  defaultState = {
    orderedSteps: [step1, step2],
    currentStepId: 1,
    currentIndex: 0,
    completedSet: new Set<number>(),
    isLoading: false,
    canGoPrev: false,
    canGoNext: true,
    goPrev: vi.fn(),
    goNext: vi.fn(),
    goToStep: vi.fn(),
    sectionProgressMap: new Map([[100, { completed: 0, total: 2, name: "Basecoat" }]]),
  };

  mockUsePaints.mockReturnValue({
    data: [
      makePaint({ id: 10, name: "Abaddon Black", owned: 1 }),
      makePaint({ id: 20, name: "Nuln Oil", paint_type: "Shade", owned: 1 }),
    ],
    isLoading: false,
  });

  mockUseRecipeSections.mockReturnValue({
    data: [makeSection()],
    isLoading: false,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TS-05: paintless steps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDefaultMocks();
  });

  it("paintless steps do not trigger PaintReadinessBanner", () => {
    mockUsePaints.mockReturnValue({ data: [], isLoading: false });

    renderView({
      orderedSteps: [
        makeStep({ id: 1, paint_id: null, step_name: "Varnish coat", order_index: 0 }),
        makeStep({ id: 2, paint_id: null, step_name: "Dry brush texture", order_index: 1 }),
      ],
      currentStepId: 1,
      currentIndex: 0,
      sectionProgressMap: new Map([[100, { completed: 0, total: 2, name: "Basecoat" }]]),
    });

    expect(
      screen.queryByText(/Some paints are not in your inventory/),
    ).not.toBeInTheDocument();
  });

  it("paintless step renders without paint swatch in StepFocalView", () => {
    mockUsePaints.mockReturnValue({ data: [], isLoading: false });

    renderView({
      orderedSteps: [
        makeStep({ id: 1, paint_id: null, step_name: "Varnish coat", section_id: 100, order_index: 0 }),
      ],
      currentStepId: 1,
      currentIndex: 0,
      canGoNext: false,
      sectionProgressMap: new Map([[100, { completed: 0, total: 1, name: "Basecoat" }]]),
    });

    expect(screen.getByTestId("step-name")).toHaveTextContent("Varnish coat");
  });

  it("mixed painted and paintless steps -- banner only reports actually missing paints", () => {
    mockUsePaints.mockReturnValue({
      data: [
        makePaint({ id: 10, name: "Abaddon Black", brand: "Citadel", owned: 1 }),
        makePaint({ id: 30, name: "Mephiston Red", brand: "Citadel", owned: 0 }),
      ],
      isLoading: false,
    });

    renderView({
      orderedSteps: [
        makeStep({ id: 1, paint_id: 10, step_name: "Base coat", section_id: 100, order_index: 0 }),
        makeStep({ id: 2, paint_id: null, step_name: "Varnish coat", section_id: 100, order_index: 1 }),
        makeStep({ id: 3, paint_id: 30, step_name: "Red layer", section_id: 100, order_index: 2 }),
      ],
      currentStepId: 1,
      currentIndex: 0,
      canGoNext: true,
      sectionProgressMap: new Map([[100, { completed: 0, total: 3, name: "Basecoat" }]]),
    });

    // Banner should be present because paint id=30 is unowned
    expect(
      screen.getByText(/Some paints are not in your inventory/),
    ).toBeInTheDocument();

    // Unowned paint should be listed
    expect(screen.getByText(/Citadel Mephiston Red/)).toBeInTheDocument();

    // Owned paint should NOT be listed in the banner
    expect(screen.queryByText(/Citadel Abaddon Black/)).not.toBeInTheDocument();
  });
});

describe("TS-06: missing paint warning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDefaultMocks();
  });

  it("banner renders and lists specific unowned paint names", () => {
    mockUsePaints.mockReturnValue({
      data: [
        makePaint({ id: 10, name: "Abaddon Black", brand: "Citadel", owned: 0 }),
        makePaint({ id: 20, name: "Nuln Oil", brand: "Citadel", owned: 0 }),
      ],
      isLoading: false,
    });

    renderView();

    expect(
      screen.getByText(/Some paints are not in your inventory/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Citadel Abaddon Black/)).toBeInTheDocument();
    expect(screen.getByText(/Citadel Nuln Oil/)).toBeInTheDocument();
  });

  it("banner absent when all paints are owned", () => {
    // setDefaultMocks already sets all paints owned: 1
    renderView();

    expect(
      screen.queryByText(/Some paints are not in your inventory/),
    ).not.toBeInTheDocument();
  });

  it("banner absent when only paintless steps exist and no paints returned", () => {
    mockUsePaints.mockReturnValue({ data: [], isLoading: false });

    renderView({
      orderedSteps: [
        makeStep({ id: 1, paint_id: null, step_name: "Dry brush", order_index: 0 }),
        makeStep({ id: 2, paint_id: null, step_name: "Apply wash", order_index: 1 }),
      ],
      currentStepId: 1,
      currentIndex: 0,
      sectionProgressMap: new Map([[100, { completed: 0, total: 2, name: "Basecoat" }]]),
    });

    expect(
      screen.queryByText(/Some paints are not in your inventory/),
    ).not.toBeInTheDocument();
  });
});
