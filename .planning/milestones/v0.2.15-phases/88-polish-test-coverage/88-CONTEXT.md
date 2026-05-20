# Phase 88: Polish + Test Coverage - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Automated test coverage for Painting Mode edge cases: optional sections rendering and navigation, paintless steps displaying without false warnings, missing paint warning accuracy, and session prefill value correctness. No new features, no new UI, no new data operations — purely verification of existing behavior through tests.

Requirements in scope: TS-04, TS-05, TS-06, TS-07

</domain>

<decisions>
## Implementation Decisions

### Test Organization (TS-04 through TS-07)
- **D-01:** Augment existing test files where the component under test already has a test file, plus one new integration test file for `PaintingModeView`-level scenarios
- **D-02:** TS-04 (optional sections + navigation) — add tests to `tests/painting-mode/SectionNavigator.test.tsx` in a new `describe("TS-04: optional sections")` block
- **D-03:** TS-05 (paintless steps) and TS-06 (missing paint warning) — create `tests/painting-mode/PaintingModeView.integration.test.tsx` since these test interactions between PaintingModeView, PaintReadinessBanner, and StepFocalView
- **D-04:** TS-07 (session prefill) — augment `tests/painting-mode/PaintingSessionSheet.test.tsx` in a new `describe("TS-07: session prefill context")` block

### TS-04: Optional Sections (SectionNavigator)
- **D-05:** Test that optional sections render the "Optional" badge (already exists — verify it still passes)
- **D-06:** Test that clicking a step INSIDE an optional section calls `goToStep` with the correct step ID — this verifies navigation is not broken by the optional flag
- **D-07:** Test that optional sections with all steps complete show the green check icon (same as required sections) — no special completion behavior for optional

### TS-05: Paintless Steps (Integration)
- **D-08:** Mock `usePaints` to return an empty array and `useRecipeSections` to return sections. Render `PaintingModeView` with a state containing steps where `paint_id = null`
- **D-09:** Assert that `PaintReadinessBanner` does NOT render (no missing paints reported) and that StepFocalView shows the "(no paint)" text instead of a paint swatch
- **D-10:** Test a mixed scenario: steps with paints + paintless steps — banner only reports actually missing paints, not paintless steps

### TS-06: Missing Paint Warning (Integration)
- **D-11:** Mock `usePaints` to return paints where some have `owned: 0`. Render `PaintingModeView` with steps referencing those paints
- **D-12:** Assert `PaintReadinessBanner` renders with the unowned paint names listed
- **D-13:** Test the "all owned" scenario: same paints but with `owned: 1` — assert banner does NOT render
- **D-14:** The `isPaintMissing` function from `src/features/recipes/recipeSteps.ts` determines "missing" — tests should use real owned/unowned values to validate the full chain

### TS-07: Session Prefill Values (PaintingSessionSheet)
- **D-15:** Test that the sheet renders all four context values: unitName, recipeName, sectionName, stepName — each matching the exact strings passed as props
- **D-16:** Test the null sectionName case: unsectioned steps should show unit, recipe, and step but omit section
- **D-17:** Existing tests already cover basic prefill rendering — augment with explicit value-matching assertions that confirm the displayed text matches prop values exactly

### Mock Strategy
- **D-18:** For PaintingModeView integration tests, mock: `@tauri-apps/api/path` (appDataDir, join), `@tauri-apps/api/core` (convertFileSrc), `@/hooks/usePaints`, `@/hooks/useRecipeSections`. Pass a pre-built `usePaintingModeState` return value as the `state` prop directly (no need to mock the hook since it's a prop)
- **D-19:** Follow the existing test patterns in `tests/painting-mode/` — factory helpers (`makeStep`, `makePaint`, `makeSection`), `vi.mock` for hooks, render-and-assert with RTL

### Claude's Discretion
- Exact assertion messages and test descriptions
- Whether to extract shared factory helpers into a `tests/painting-mode/helpers.ts` file (only if duplication is excessive)
- Order of test cases within describe blocks
- Whether to add any additional edge case tests beyond the four TS requirements

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — TS-04, TS-05, TS-06, TS-07 requirement definitions
- `.planning/ROADMAP.md` — Phase 88 goal, success criteria

### Components Under Test
- `src/features/painting-mode/SectionNavigator.tsx` — Optional section rendering, navigation via goToStep
- `src/features/painting-mode/PaintingModeView.tsx` — Integration root: paint readiness banner, step focal view composition
- `src/features/painting-mode/StepFocalView.tsx` — Paintless step display, "(no paint)" text
- `src/features/painting-mode/PaintReadinessBanner.tsx` — Missing paint warning banner
- `src/features/painting-mode/PaintingSessionSheet.tsx` — Session prefill context display

### Existing Test Files (augment these)
- `tests/painting-mode/SectionNavigator.test.tsx` — Has optional badge test; needs navigation-in-optional-section test
- `tests/painting-mode/PaintingSessionSheet.test.tsx` — Has prefill tests; needs explicit value-matching assertions
- `tests/painting-mode/StepFocalView.test.tsx` — Has paintless step unit test (reference for factory helpers)
- `tests/painting-mode/PaintReadinessBanner.test.tsx` — Has empty/non-empty tests (reference)
- `tests/painting-mode/PaintingModeView.test.tsx` — Existing view tests (check for overlap before adding integration file)

### Key Dependencies
- `src/features/recipes/recipeSteps.ts` — `isPaintMissing()` function used by PaintingModeView to determine missing paints
- `src/hooks/usePaints.ts` — Paint data hook (mocked in integration tests)
- `src/hooks/useRecipeSections.ts` — Section data hook (mocked in integration tests)
- `src/hooks/usePaintingModeState.ts` — Navigation state hook (passed as prop, not mocked)

### Prior Phase Decisions
- `.planning/phases/85-core-execution-ui/85-CONTEXT.md` — D-16 paintless steps, D-15 missing paint banner
- `.planning/phases/87-session-integration-entry-points/87-CONTEXT.md` — D-02 session prefill

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Factory helpers in existing tests: `makeStep()`, `makePaint()`, `makeSection()` — consistent across all test files, can be reused or extracted
- `renderNavigator()` helper in SectionNavigator.test.tsx — already handles default props with override pattern
- `renderFocalView()` helper in StepFocalView.test.tsx — same pattern for focal view
- `isPaintMissing(paint)` in recipeSteps.ts — the actual function that determines "missing" status (checks `owned` field)

### Established Patterns
- All painting-mode tests live in `tests/painting-mode/` directory (cross-cutting constraint D-09 from Phase 84)
- Tests follow the test pattern from `tests/painting/recipeAssignments.test.ts` (constraint D-11 from Phase 84)
- Hook mocking uses `vi.mock("@/hooks/useXxx")` with `vi.mocked()` for type-safe mock returns
- Tauri API mocking: `vi.mock("@tauri-apps/api/path")` and `vi.mock("@tauri-apps/api/core")`

### Integration Points
- PaintingModeView.tsx is the natural integration boundary: it composes SectionNavigator + StepFocalView + PaintReadinessBanner
- The `state` prop (from usePaintingModeState) provides all step/navigation data — can be constructed directly in tests
- PaintingSessionSheet is a standalone component that receives props — pure component testing

</code_context>

<specifics>
## Specific Ideas

No specific requirements — tests follow existing patterns and verify already-implemented behavior.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 88-Polish + Test Coverage*
*Context gathered: 2026-05-20*
