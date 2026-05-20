---
phase: 88-polish-test-coverage
reviewed: 2026-05-20T14:30:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - tests/painting-mode/SectionNavigator.test.tsx
  - tests/painting-mode/PaintingSessionSheet.test.tsx
  - tests/painting-mode/PaintingModeView.integration.test.tsx
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 88: Code Review Report

**Reviewed:** 2026-05-20T14:30:00Z
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Phase 88 adds test coverage for painting mode features: optional section navigation (TS-04), paintless step behavior (TS-05), missing paint warnings (TS-06), and session prefill context (TS-07). No production code was changed.

The test infrastructure is sound -- factory helpers are well-typed against the real interfaces, mock shapes match production hook return types, and assertions target the correct DOM elements (verified against source). However, two tests have structural issues that could mask regressions or produce false passes, and two describe blocks add near-duplicate coverage without exercising meaningfully different code paths.

## Warnings

### WR-01: Non-null assertions on DOM queries risk unhelpful test failures

**File:** `tests/painting-mode/SectionNavigator.test.tsx:95,195`
**Issue:** Both `screen.getByText("...").closest("button")!` calls use the TypeScript non-null assertion operator. If the component's DOM structure changes (e.g., the step text is no longer nested inside a `<button>`), the test will throw a raw `TypeError: Cannot read properties of null` instead of a descriptive assertion failure. This makes debugging test regressions harder and can mislead developers into thinking the test setup is broken rather than the component structure.
**Fix:** Replace the non-null assertion with an explicit assertion that produces a clear failure message:
```tsx
const stepButton = screen.getByText("Drybrush edges").closest("button");
expect(stepButton).not.toBeNull();
await user.click(stepButton!);
```
Or use `within()` from RTL to scope the query to the expected container.

### WR-02: TS-06 "banner absent when all paints are owned" relies on implicit mock state

**File:** `tests/painting-mode/PaintingModeView.integration.test.tsx:284-291`
**Issue:** This test calls `renderView()` with no overrides, relying entirely on `setDefaultMocks()` to provide `owned: 1` paints. The test's correctness is coupled to a shared setup function 120 lines away, with no local assertion or comment that verifies the precondition (all paints owned). If `setDefaultMocks` is later modified (e.g., to add a third paint with `owned: 0` for a new test), this test silently becomes a false pass -- it would still assert banner absence, but the banner would now be present and the test would fail for the wrong reason, or worse, someone might "fix" the default mocks and break this test's intent.
**Fix:** Make the precondition explicit by setting mock return values locally in the test:
```tsx
it("banner absent when all paints are owned", () => {
  mockUsePaints.mockReturnValue({
    data: [
      makePaint({ id: 10, name: "Abaddon Black", owned: 1 }),
      makePaint({ id: 20, name: "Nuln Oil", owned: 1 }),
    ],
    isLoading: false,
  });
  renderView();
  expect(
    screen.queryByText(/Some paints are not in your inventory/),
  ).not.toBeInTheDocument();
});
```

## Info

### IN-01: TS-07 describe block duplicates existing SL-01 test coverage

**File:** `tests/painting-mode/PaintingSessionSheet.test.tsx:111-145`
**Issue:** The TS-07 describe block ("session prefill context") contains two tests that exercise the exact same code paths as existing SL-01 tests. The first test (line 112) renders four context props and asserts they appear in the DOM -- identical to the SL-01 test at line 37, just with different string values. The second test (line 129) asserts sectionName=null omits the section label -- identical to line 46. Since the component renders props via simple JSX interpolation (`{unitName}`, `{recipeName}`, etc.), varying the string values does not exercise any additional branch. These tests pass for the same reason the existing ones pass and would fail for the same reason.
**Fix:** Consider removing the TS-07 block or repurposing it to test an edge case not yet covered (e.g., very long prop strings causing layout issues, or special characters in names).

### IN-02: TS-04 tests do not verify any optional-section-specific behavior

**File:** `tests/painting-mode/SectionNavigator.test.tsx:178-211`
**Issue:** The TS-04 describe block ("optional sections") contains two tests: (1) clicking a step inside an optional section calls `goToStep`, and (2) a completed optional section shows a check icon. However, both behaviors are identical to non-optional sections -- the component's click handler and completion icon logic do not branch on the `optional` flag. The existing tests at lines 89-98 (goToStep on click) and 127-137 (section-complete icon) already cover these paths. The only optional-specific rendering is the "Optional" badge, which is already tested at line 100-106. These TS-04 tests would pass even if the `optional` flag were removed from the test data.
**Fix:** If the intent is to verify optional sections work end-to-end, add a test for a behavior that actually differs for optional sections (e.g., skip-section UX if it exists, or verify the Optional badge renders alongside the completion icon in a completed optional section).

---

_Reviewed: 2026-05-20T14:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
