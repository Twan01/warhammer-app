# Phase 88: Polish + Test Coverage - Pattern Map

**Mapped:** 2026-05-20
**Files analyzed:** 3 (1 new, 2 modified)
**Analogs found:** 3 / 3

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `tests/painting-mode/PaintingModeView.integration.test.tsx` | test | request-response | `tests/painting-mode/PaintingModeView.test.tsx` | exact |
| `tests/painting-mode/SectionNavigator.test.tsx` (augment) | test | request-response | Self (existing file) | exact |
| `tests/painting-mode/PaintingSessionSheet.test.tsx` (augment) | test | request-response | Self (existing file) | exact |

## Pattern Assignments

### `tests/painting-mode/PaintingModeView.integration.test.tsx` (NEW — test, integration)

**Analog:** `tests/painting-mode/PaintingModeView.test.tsx` (the exact template to copy)

**Imports pattern** (lines 1-16):
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ReactNode } from "react";
import type { RecipeStep } from "@/types/recipePaint";
import type { RecipeSection } from "@/types/recipeSection";
import type { Paint } from "@/types/paint";
```

**Mock setup pattern** (lines 20-54) — copy this block exactly:
```typescript
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
  todayISO: () => "2026-05-19",
}));
```

**Factory helpers pattern** (lines 62-121) — copy `makeStep`, `makeSection`, `makePaint` from analog:
```typescript
function makeStep(overrides: Partial<RecipeStep> = {}): RecipeStep {
  return {
    id: 1, recipe_id: 10, paint_id: 10, step_name: "Apply base coat",
    order_index: 0, notes: null, painting_phase: "basecoat",
    tool: "Size 1 brush", technique: "brush", dilution: "thin",
    time_estimate_minutes: 15, step_photo_path: null, alt_paint_id: null,
    section_id: 100, created_at: "2026-01-01",
    ...overrides,
  };
}

function makeSection(overrides: Partial<RecipeSection> = {}): RecipeSection {
  return {
    id: 100, recipe_id: 10, name: "Basecoat", surface: null,
    optional: 0, order_index: 0, notes: null, section_type: null,
    technique: null, execution_mode: null, applies_to: null,
    created_at: "2026-01-01", updated_at: "2026-01-01",
    ...overrides,
  };
}

function makePaint(overrides: Partial<Paint> = {}): Paint {
  return {
    id: 10, brand: "Citadel", name: "Abaddon Black", paint_type: "Base",
    color_family: null, hex_color: "#231f20", owned: 1, quantity: null,
    running_low: 0, wishlist: 0, notes: null, purchase_price_pence: null,
    purchase_date: null, created_at: "2026-01-01", updated_at: "2026-01-01",
    ...overrides,
  };
}
```

**Wrapper + render helper pattern** (lines 123-145):
```typescript
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

let defaultState: ReturnType<typeof import("@/hooks/usePaintingModeState").usePaintingModeState>;

function renderView(stateOverride?: Partial<typeof defaultState>) {
  const state = { ...defaultState, ...stateOverride };
  return render(
    <PaintingModeView state={state} onMarkDone={mockOnMarkDone} onMarkDoneWithSession={vi.fn()} recipeId={10} isMutating={false} />,
    { wrapper: createWrapper() },
  );
}
```

**Default mock setup pattern** (lines 151-181):
```typescript
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
```

**Banner assertion pattern** (lines 239-259):
```typescript
// Positive: banner appears when missing paints
mockUsePaints.mockReturnValue({
  data: [makePaint({ id: 10, name: "Abaddon Black", owned: 0 })],
  isLoading: false,
});
renderView();
expect(screen.getByText(/Some paints are not in your inventory/)).toBeInTheDocument();

// Negative: banner absent when all owned
renderView(); // defaults have owned: 1
expect(screen.queryByText(/Some paints are not in your inventory/)).not.toBeInTheDocument();
```

---

### `tests/painting-mode/SectionNavigator.test.tsx` (AUGMENT — test, unit)

**Analog:** Self — the existing file IS the pattern.

**Render helper pattern** (lines 48-71):
```typescript
function renderNavigator(overrides: Partial<Parameters<typeof SectionNavigator>[0]> = {}) {
  const props = {
    sections: defaultSections,
    orderedSteps: defaultSteps,
    completedSet: new Set<number>(),
    currentStepId: 1 as number | null,
    sectionProgressMap: defaultProgressMap,
    goToStep: vi.fn(),
    ...overrides,
  };
  return { ...render(<SectionNavigator {...props} />), goToStep: props.goToStep };
}
```

**Navigation test pattern** (lines 89-98) — the template for TS-04 navigation tests:
```typescript
it("calls goToStep when step item clicked", async () => {
  const user = userEvent.setup();
  const { goToStep } = renderNavigator({ currentStepId: 1 });

  const stepButton = screen.getByText("Layer highlight").closest("button")!;
  await user.click(stepButton);

  expect(goToStep).toHaveBeenCalledWith(2);
});
```

**Optional badge test pattern** (lines 100-106) — already exists, TS-04 extends this:
```typescript
it("renders Optional badge for optional sections", () => {
  renderNavigator({
    sections: [makeSection({ id: 1, name: "Weathering", optional: 1 })],
  });
  expect(screen.getByText("Optional")).toBeInTheDocument();
});
```

**Section completion icon pattern** (lines 127-137) — template for optional section completion test:
```typescript
it("renders Check icon when all steps in section are complete", () => {
  renderNavigator({
    sectionProgressMap: new Map([
      [1, { completed: 2, total: 2, name: "Basecoat" }],
    ]),
  });
  expect(screen.getByTestId("section-complete")).toBeInTheDocument();
  expect(screen.queryByText("2/2")).not.toBeInTheDocument();
});
```

**Collapsible pitfall:** Set `currentStepId` to a step ID inside the optional section so the collapsible opens and steps are visible to RTL queries.

---

### `tests/painting-mode/PaintingSessionSheet.test.tsx` (AUGMENT — test, unit)

**Analog:** Self — the existing file IS the pattern.

**Default props pattern** (lines 22-31):
```typescript
const defaultProps = {
  open: true,
  onClose: vi.fn(),
  unitName: "Intercessors",
  recipeName: "Ultramarines Scheme",
  stepName: "Apply base coat",
  sectionName: "Basecoat",
  onSubmit: vi.fn(),
  isPending: false,
};
```

**Prefill assertion pattern** (lines 37-44) — TS-07 extends this with explicit value matching:
```typescript
it("renders prefilled context block", () => {
  render(<PaintingSessionSheet {...defaultProps} />);
  expect(screen.getByText("Intercessors")).toBeInTheDocument();
  expect(screen.getByText("Ultramarines Scheme")).toBeInTheDocument();
  expect(screen.getByText("Apply base coat")).toBeInTheDocument();
  expect(screen.getByText("Basecoat")).toBeInTheDocument();
});
```

**Null sectionName pattern** (lines 46-51):
```typescript
it("omits sectionName when null", () => {
  render(<PaintingSessionSheet {...defaultProps} sectionName={null} />);
  expect(screen.getByText("Intercessors")).toBeInTheDocument();
  expect(screen.queryByText("Basecoat")).not.toBeInTheDocument();
});
```

**TS-07 extension approach:** Use different prop values (not the defaults) to prove the component renders dynamic values rather than hardcoded strings. Example:
```typescript
render(<PaintingSessionSheet {...defaultProps} unitName="Blood Angels Intercessors" recipeName="Flesh Tearers Scheme" />);
expect(screen.getByText("Blood Angels Intercessors")).toBeInTheDocument();
```

---

## Shared Patterns

### Factory Helpers (all test files)
**Source:** `tests/painting-mode/PaintingModeView.test.tsx` lines 62-121
**Apply to:** New integration test file (copy verbatim)
**Pattern:** `makeStep()`, `makeSection()`, `makePaint()` each accept `Partial<Type>` overrides spread onto defaults.

### Hook Mocking (integration tests)
**Source:** `tests/painting-mode/PaintingModeView.test.tsx` lines 20-54
**Apply to:** `PaintingModeView.integration.test.tsx`
**Pattern:** Top-level `const mockUseXxx = vi.fn()` + `vi.mock("@/hooks/useXxx", () => ({ useXxx: (...args) => mockUseXxx(...args) }))`. Mock functions are called in `beforeEach` via `setDefaultMocks()`.

### QueryClient Wrapper (integration tests)
**Source:** `tests/painting-mode/PaintingModeView.test.tsx` lines 123-134
**Apply to:** `PaintingModeView.integration.test.tsx`
**Pattern:** `createWrapper()` returns a component wrapping children in `QueryClientProvider` + `TooltipProvider`. New `QueryClient` per call with `retry: false`.

### Tauri API Mocks (integration tests)
**Source:** `tests/painting-mode/PaintingModeView.test.tsx` lines 33-42
**Apply to:** `PaintingModeView.integration.test.tsx`
**Pattern:** `vi.mock("@tauri-apps/api/path")` with stubs for `appDataDir` and `join`; `vi.mock("@tauri-apps/api/core")` with `convertFileSrc` returning `asset://` prefix.

### Describe Block Naming (augmented files)
**Source:** `tests/painting-mode/SectionNavigator.test.tsx` line 126
**Apply to:** Both augmented files
**Pattern:** New requirement tests go in `describe("TS-XX: descriptive name", () => { ... })` blocks at the end of the file, inside or after the existing top-level describe.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| -- | -- | -- | All files have exact analogs |

## Metadata

**Analog search scope:** `tests/painting-mode/`
**Files scanned:** 11 test files
**Pattern extraction date:** 2026-05-20
