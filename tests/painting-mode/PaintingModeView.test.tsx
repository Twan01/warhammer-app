/**
 * Phase 85-03 -- PaintingModeView integration tests.
 *
 * Mocks all hooks at module level. Verifies root composition:
 * loading skeleton, empty state, split-panel layout, paint readiness banner.
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
// Mocks
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

// Avoid import errors for sub-component external deps
vi.mock("@/features/recipes/recipeSteps", () => ({
  isPaintMissing: (paint: Paint | null | undefined) => {
    if (!paint) return true;
    return paint.owned !== 1;
  },
}));

vi.mock("@/lib/dates", () => ({
  todayISO: () => "2026-05-19",
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
    <PaintingModeView state={state} onMarkDone={mockOnMarkDone} recipeId={10} isMutating={false} />,
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

describe("PaintingModeView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDefaultMocks();
  });

  it("renders loading skeleton when hook returns isLoading (PX-01)", () => {
    renderView({
      orderedSteps: [],
      currentStepId: null,
      currentIndex: -1,
      completedSet: new Set(),
      isLoading: true,
      canGoPrev: false,
      canGoNext: false,
      goPrev: vi.fn(),
      goNext: vi.fn(),
      goToStep: vi.fn(),
      sectionProgressMap: new Map(),
    });

    // Skeleton elements should be present
    const skeletons = document.querySelectorAll("[class*='animate-pulse'], [data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders empty state message when orderedSteps is empty", () => {
    renderView({
      orderedSteps: [],
      currentStepId: null,
      currentIndex: -1,
      completedSet: new Set(),
      isLoading: false,
      canGoPrev: false,
      canGoNext: false,
      goPrev: vi.fn(),
      goNext: vi.fn(),
      goToStep: vi.fn(),
      sectionProgressMap: new Map(),
    });

    expect(screen.getByText("No steps in this recipe")).toBeInTheDocument();
  });

  it("renders split-panel layout with SectionNavigator and StepFocalView", () => {
    renderView();
    // StepFocalView renders the step name
    expect(screen.getByTestId("step-name")).toHaveTextContent("Apply base coat");
    // SectionNavigator renders the section name
    expect(screen.getByText("Basecoat")).toBeInTheDocument();
  });

  it("renders PaintReadinessBanner when missing paints exist", () => {
    mockUsePaints.mockReturnValue({
      data: [
        makePaint({ id: 10, name: "Abaddon Black", owned: 0 }),
        makePaint({ id: 20, name: "Nuln Oil", owned: 1 }),
      ],
      isLoading: false,
    });

    renderView();
    expect(
      screen.getByText(/Some paints are not in your inventory/),
    ).toBeInTheDocument();
  });

  it("does not render banner when all paints are owned", () => {
    renderView();
    expect(
      screen.queryByText(/Some paints are not in your inventory/),
    ).not.toBeInTheDocument();
  });
});
