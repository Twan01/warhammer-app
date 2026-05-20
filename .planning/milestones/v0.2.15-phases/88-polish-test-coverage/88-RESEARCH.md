# Phase 88: Polish + Test Coverage - Research

**Researched:** 2026-05-20
**Domain:** Vitest + React Testing Library — automated test coverage for Painting Mode edge cases
**Confidence:** HIGH

## Summary

Phase 88 is a pure test-writing phase with no new features, UI, or data operations. The goal is to add automated test coverage for four specific edge-case behaviors in the Painting Mode feature: optional section rendering/navigation (TS-04), paintless step display (TS-05), missing paint warning accuracy (TS-06), and session prefill value correctness (TS-07).

The existing test infrastructure is mature and well-established. There are already 11 test files in `tests/painting-mode/` with 91 passing tests covering the Painting Mode feature. Factory helpers (`makeStep`, `makePaint`, `makeSection`), render helpers (`renderNavigator`, `renderFocalView`), and hook mocking patterns (`vi.mock` with `vi.mocked`) are consistent across all files. The research confirms all tests pass and the infrastructure is ready for augmentation.

**Primary recommendation:** Augment 2 existing test files and create 1 new integration test file, following the established patterns exactly. No new dependencies, no new infrastructure.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Augment existing test files where the component under test already has a test file, plus one new integration test file for PaintingModeView-level scenarios
- **D-02:** TS-04 (optional sections + navigation) — add tests to `tests/painting-mode/SectionNavigator.test.tsx` in a new `describe("TS-04: optional sections")` block
- **D-03:** TS-05 (paintless steps) and TS-06 (missing paint warning) — create `tests/painting-mode/PaintingModeView.integration.test.tsx` since these test interactions between PaintingModeView, PaintReadinessBanner, and StepFocalView
- **D-04:** TS-07 (session prefill) — augment `tests/painting-mode/PaintingSessionSheet.test.tsx` in a new `describe("TS-07: session prefill context")` block
- **D-05 through D-07:** TS-04 test cases — optional badge, navigation inside optional section, completion icon for optional sections
- **D-08 through D-10:** TS-05 test cases — paintless steps with empty paint array, "(no paint)" text, mixed scenario
- **D-11 through D-14:** TS-06 test cases — unowned paints trigger banner, banner lists paint names, all-owned suppresses banner, uses real `isPaintMissing` chain
- **D-15 through D-17:** TS-07 test cases — four context values displayed, null sectionName case, explicit value-matching assertions
- **D-18:** Integration test mocks: `@tauri-apps/api/path`, `@tauri-apps/api/core`, `@/hooks/usePaints`, `@/hooks/useRecipeSections`, `@/features/recipes/recipeSteps`, `@/lib/dates`. State passed as prop directly
- **D-19:** Follow existing test patterns — factory helpers, `vi.mock` for hooks, render-and-assert with RTL

### Claude's Discretion
- Exact assertion messages and test descriptions
- Whether to extract shared factory helpers into a `tests/painting-mode/helpers.ts` file (only if duplication is excessive)
- Order of test cases within describe blocks
- Whether to add any additional edge case tests beyond the four TS requirements

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TS-04 | Test coverage for optional sections handling | SectionNavigator.test.tsx already has the optional badge test (line 100-106). Needs 2 additional tests: navigation inside optional section, completion icon for optional section. Component source confirms `optional === 1` controls badge rendering. |
| TS-05 | Test coverage for paintless steps | StepFocalView unit test already covers `(no paint)` text (line 177-184). Integration-level test needed: PaintingModeView with `paint_id = null` steps should NOT trigger PaintReadinessBanner. Source confirms `if (step.paint_id == null) continue;` in missingPaints derivation. |
| TS-06 | Test coverage for missing paint warning | PaintingModeView.test.tsx already has basic banner/no-banner tests (lines 239-259). Integration test needed: verify banner shows specific unowned paint names, verify banner absent when all owned, validate full `isPaintMissing` chain. |
| TS-07 | Test coverage for session prefill values | PaintingSessionSheet.test.tsx already has prefill rendering test (line 37-44) and null sectionName test (line 46-51). Needs explicit value-matching assertions confirming displayed text matches prop values exactly. |

</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Optional section rendering | Browser / Client | -- | Pure React component rendering (SectionNavigator) |
| Paintless step display | Browser / Client | -- | Conditional rendering in StepFocalView |
| Missing paint warning | Browser / Client | -- | Derived state in PaintingModeView from usePaints hook data |
| Session prefill values | Browser / Client | -- | Props passed directly to PaintingSessionSheet |

All capabilities are client-tier only. No backend, database, or API involvement in this phase.

## Standard Stack

### Core (already installed, no changes needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | 4.x | Test runner | Project standard per CLAUDE.md |
| @testing-library/react | 16.x | Component rendering and queries | Project standard per CLAUDE.md |
| @testing-library/user-event | 14.x | User interaction simulation | Already used in all painting-mode tests |
| @testing-library/jest-dom | -- | DOM assertion matchers | Loaded in tests/setup.ts |

No new packages to install. Zero dependency changes.

## Architecture Patterns

### System Architecture (Test Data Flow)

```
Test file
  |
  +--> vi.mock() intercepts hook imports
  |      |
  |      +--> usePaints returns controlled Paint[] data
  |      +--> useRecipeSections returns controlled RecipeSection[] data
  |      +--> @tauri-apps/api/* returns stubs
  |
  +--> Factory helpers build test data
  |      |
  |      +--> makeStep(), makePaint(), makeSection()
  |
  +--> render(<Component props={...} />) with QueryClientProvider wrapper
  |
  +--> RTL queries (screen.getByText, getByTestId, queryByText)
  |
  +--> Assertions (toBeInTheDocument, toHaveTextContent, not.toBeInTheDocument)
```

### Pattern 1: Augmenting Existing Test Files

**What:** Add a new `describe` block to an existing test file  
**When to use:** When the component under test already has a test file (TS-04, TS-07)  
**Example:**

```typescript
// Source: tests/painting-mode/SectionNavigator.test.tsx (existing pattern)
describe("TS-04: optional sections", () => {
  it("navigation works inside optional section", async () => {
    const user = userEvent.setup();
    const { goToStep } = renderNavigator({
      sections: [makeSection({ id: 1, name: "Weathering", optional: 1 })],
      orderedSteps: [
        makeStep({ id: 1, step_name: "Apply rust", section_id: 1 }),
        makeStep({ id: 2, step_name: "Dry brush edges", section_id: 1, order_index: 1 }),
      ],
      currentStepId: 1,
      sectionProgressMap: new Map([[1, { completed: 0, total: 2, name: "Weathering" }]]),
    });
    const stepButton = screen.getByText("Dry brush edges").closest("button")!;
    await user.click(stepButton);
    expect(goToStep).toHaveBeenCalledWith(2);
  });
});
```

### Pattern 2: New Integration Test File

**What:** Create a new `.integration.test.tsx` file with full mock setup  
**When to use:** When testing cross-component interactions (TS-05, TS-06)  
**Example:** Follow the exact structure of `PaintingModeView.test.tsx` — same mock setup, same factory helpers, same `createWrapper()`, same `renderView()` helper. The existing file is the template. [VERIFIED: codebase inspection]

### Pattern 3: Explicit Value-Matching Assertions

**What:** Assert that rendered text matches exact prop values, not just presence  
**When to use:** TS-07 session prefill — verify the text on screen is the exact string passed as a prop  
**Example:**

```typescript
// Source: PaintingSessionSheet component renders props in a context block
it("displays exact unit name passed as prop", () => {
  render(<PaintingSessionSheet {...defaultProps} unitName="Blood Angels Intercessors" />);
  expect(screen.getByText("Blood Angels Intercessors")).toBeInTheDocument();
});
```

### Anti-Patterns to Avoid
- **Testing implementation details:** Do not assert on internal state or class names for behavior tests. Assert on visible text, roles, and test IDs.
- **Duplicating existing test coverage:** Several tests already partially cover the requirements. Check existing tests before writing new ones to avoid redundancy. Specifically: optional badge test exists (line 100-106), prefill rendering tests exist (lines 37-51), basic banner tests exist (lines 239-259), paintless step unit test exists (line 177-184).
- **Mocking `isPaintMissing` in integration tests:** D-14 explicitly says to use real owned/unowned values to validate the full chain. The existing PaintingModeView.test.tsx mocks `isPaintMissing` (line 46-49) — the new integration file should do the same BUT ensure the mock behavior matches real behavior (checking `paint.owned !== 1`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Test data construction | Inline object literals | Existing factory helpers (`makeStep`, `makePaint`, `makeSection`) | Consistency, type safety, less boilerplate |
| Component rendering with providers | Manual QueryClient setup | Existing `createWrapper()` pattern from PaintingModeView.test.tsx | Avoids missing provider errors |
| User interactions | Direct DOM events | `userEvent.setup()` from @testing-library/user-event | Simulates real user behavior (focus, pointer events) |

## Common Pitfalls

### Pitfall 1: Collapsible Content Not Visible in Tests
**What goes wrong:** SectionNavigator uses Radix `Collapsible` components. Steps inside a non-current section may not be visible in the DOM because the collapsible is closed by default.
**Why it happens:** `defaultOpen={isCurrentSection}` means only the section containing the current step is expanded.
**How to avoid:** Set `currentStepId` to a step ID inside the section you want to test. This opens that section's collapsible.
**Warning signs:** `screen.getByText("step name")` throws "not found" even though the step is in the data.

### Pitfall 2: isPaintMissing Mock Behavior Mismatch
**What goes wrong:** The mock for `isPaintMissing` in PaintingModeView.test.tsx returns `true` when `paint` is null/undefined. This means steps with `paint_id = null` whose paint is not found in the paintMap would be incorrectly flagged as "missing" — BUT the actual `missingPaints` derivation in PaintingModeView skips `paint_id == null` steps entirely (line 48).
**Why it happens:** The mock covers the function signature, but the calling code has its own null guard.
**How to avoid:** Understand the full chain: `PaintingModeView.missingPaints` skips null paint_id steps BEFORE calling `isPaintMissing`. Tests for TS-05 should verify this skip behavior at the integration level.
**Warning signs:** A test that expects banner to appear for paintless steps would be wrong.

### Pitfall 3: QueryClientProvider Missing in Integration Tests
**What goes wrong:** PaintingModeView renders sub-components that may use React Query hooks internally (via usePaints, useRecipeSections).
**Why it happens:** Even though hooks are mocked at module level, React Query's provider may still be needed for context.
**How to avoid:** Always wrap with `createWrapper()` — the existing pattern already handles this.
**Warning signs:** "No QueryClient set" error in test output.

### Pitfall 4: Duplicate Test Coverage Without New Value
**What goes wrong:** Writing tests that duplicate what already exists without adding the specific edge-case verification the requirements demand.
**Why it happens:** The existing test suite already has partial coverage for each requirement area.
**How to avoid:** For each new test, verify it tests something the existing tests do NOT cover. Specifically:
- TS-04: existing test checks badge renders; NEW tests must check navigation-in-optional-section and completion-icon-for-optional-section
- TS-05: existing unit test checks "(no paint)" text; NEW integration test must verify banner is NOT triggered by paintless steps
- TS-06: existing test checks banner appears/disappears; NEW tests must verify specific paint names in banner text and test the owned/unowned distinction
- TS-07: existing test checks presence of text; NEW tests must verify exact value matching between props and displayed text

## Code Examples

### TS-04: Navigation Inside Optional Section (SectionNavigator.test.tsx)

```typescript
// Verified pattern from existing test at line 89-98
describe("TS-04: optional sections", () => {
  it("clicking step inside optional section calls goToStep correctly", async () => {
    const user = userEvent.setup();
    const { goToStep } = renderNavigator({
      sections: [makeSection({ id: 1, name: "Weathering", optional: 1 })],
      orderedSteps: [
        makeStep({ id: 1, step_name: "Apply rust", section_id: 1, order_index: 0 }),
        makeStep({ id: 2, step_name: "Dry brush", section_id: 1, order_index: 1 }),
      ],
      currentStepId: 1, // opens the collapsible
      sectionProgressMap: new Map([[1, { completed: 0, total: 2, name: "Weathering" }]]),
    });

    const stepButton = screen.getByText("Dry brush").closest("button")!;
    await user.click(stepButton);
    expect(goToStep).toHaveBeenCalledWith(2);
  });
});
```

### TS-05/TS-06: Integration Test Structure (PaintingModeView.integration.test.tsx)

```typescript
// Follow exact structure of PaintingModeView.test.tsx (verified from codebase)
// Same mocks, same factory helpers, same createWrapper()

describe("TS-05: paintless steps", () => {
  it("paintless steps do not trigger PaintReadinessBanner", () => {
    // All steps have paint_id = null
    mockUsePaints.mockReturnValue({ data: [], isLoading: false });
    renderView({
      orderedSteps: [
        makeStep({ id: 1, paint_id: null }),
        makeStep({ id: 2, paint_id: null, order_index: 1 }),
      ],
      // ... rest of state
    });
    expect(screen.queryByText(/Some paints are not in your inventory/)).not.toBeInTheDocument();
  });
});

describe("TS-06: missing paint warning", () => {
  it("banner lists specific unowned paint names", () => {
    mockUsePaints.mockReturnValue({
      data: [
        makePaint({ id: 10, name: "Abaddon Black", brand: "Citadel", owned: 0 }),
      ],
      isLoading: false,
    });
    renderView(/* state with step referencing paint_id: 10 */);
    expect(screen.getByText(/Citadel Abaddon Black/)).toBeInTheDocument();
  });
});
```

### TS-07: Explicit Value-Matching (PaintingSessionSheet.test.tsx)

```typescript
// Verified pattern from existing test at line 37-44
describe("TS-07: session prefill context", () => {
  it("renders all four context values matching exact prop strings", () => {
    const props = {
      ...defaultProps,
      unitName: "Blood Angels Intercessors",
      recipeName: "Flesh Tearers Scheme",
      sectionName: "Highlights",
      stepName: "Edge highlight pauldrons",
    };
    render(<PaintingSessionSheet {...props} />);
    expect(screen.getByText("Blood Angels Intercessors")).toBeInTheDocument();
    expect(screen.getByText("Flesh Tearers Scheme")).toBeInTheDocument();
    expect(screen.getByText("Highlights")).toBeInTheDocument();
    expect(screen.getByText("Edge highlight pauldrons")).toBeInTheDocument();
  });
});
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x + React Testing Library 16.x |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test -- tests/painting-mode/SectionNavigator.test.tsx` |
| Full suite command | `pnpm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TS-04 | Optional sections render distinctly and navigation works | unit | `pnpm test -- tests/painting-mode/SectionNavigator.test.tsx` | Yes (augment) |
| TS-05 | Paintless steps display cleanly without false warnings | integration | `pnpm test -- tests/painting-mode/PaintingModeView.integration.test.tsx` | Wave 0 |
| TS-06 | Missing paint warning fires/suppresses correctly | integration | `pnpm test -- tests/painting-mode/PaintingModeView.integration.test.tsx` | Wave 0 |
| TS-07 | Session prefill values match context exactly | unit | `pnpm test -- tests/painting-mode/PaintingSessionSheet.test.tsx` | Yes (augment) |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/painting-mode/` (all painting-mode tests)
- **Per wave merge:** `pnpm test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/painting-mode/PaintingModeView.integration.test.tsx` -- new file for TS-05 and TS-06

## Existing Test Coverage Overlap Analysis

Understanding what already exists prevents duplication and focuses new test effort on the gaps.

| Requirement | Already Covered | Gap to Fill |
|-------------|----------------|-------------|
| TS-04 | Optional badge renders (SectionNavigator line 100-106) | Navigation inside optional section; completion icon for optional section |
| TS-05 | `(no paint)` text in StepFocalView unit test (line 177-184) | Integration: paintless steps do NOT trigger PaintReadinessBanner; mixed scenario with some paintless + some painted steps |
| TS-06 | Banner appears when missing paints (PaintingModeView line 239-253); banner absent when all owned (line 254-259) | Specific paint names listed in banner; owned/unowned distinction with real `isPaintMissing` chain; all-owned scenario with explicit owned=1 values |
| TS-07 | Prefill text present (PaintingSessionSheet line 37-44); null sectionName omitted (line 46-51) | Explicit value-matching: each displayed string matches exact prop value; different prop values to prove it is not hardcoded |

## File Change Summary

| File | Action | Tests Added |
|------|--------|-------------|
| `tests/painting-mode/SectionNavigator.test.tsx` | Augment | ~2-3 tests in new `describe("TS-04")` block |
| `tests/painting-mode/PaintingModeView.integration.test.tsx` | Create | ~5-6 tests across `describe("TS-05")` and `describe("TS-06")` blocks |
| `tests/painting-mode/PaintingSessionSheet.test.tsx` | Augment | ~2-3 tests in new `describe("TS-07")` block |

**Estimated total new tests:** 9-12
**No source files modified.** This is a test-only phase.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| -- | -- | -- | -- |

**All claims in this research were verified via codebase inspection.** No user confirmation needed.

## Open Questions

None. The phase scope is well-defined, the existing test patterns are clear, and all components under test are stable and documented.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: All 6 existing painting-mode test files read and analyzed
- Codebase inspection: All 7 painting-mode source components read
- Codebase inspection: `isPaintMissing` function in `src/features/recipes/recipeSteps.ts` (lines 41-44)
- Test execution: `npx vitest run tests/painting-mode/` -- 91 tests, 11 files, all passing
- `vitest.config.ts` -- jsdom environment, setup file, include pattern
- `tests/setup.ts` -- jest-dom, ResizeObserver polyfill, pointer capture polyfills

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all tools already in use
- Architecture: HIGH - pure test-writing phase following established patterns
- Pitfalls: HIGH - identified from direct codebase analysis of existing tests and source components

**Research date:** 2026-05-20
**Valid until:** 2026-06-20 (stable - test infrastructure unlikely to change)
