# Phase 88: Polish + Test Coverage - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-20
**Phase:** 88-polish-test-coverage
**Areas discussed:** test organization, optional section navigation, integration test approach, session prefill test level
**Mode:** --auto (all decisions auto-selected)

---

## Test Organization

| Option | Description | Selected |
|--------|-------------|----------|
| Augment existing + new integration file | Add to existing test files where component already tested; create one new integration test for cross-component scenarios | ✓ |
| All new files | Create separate Phase 88 test files for each requirement | |
| All in existing files | Force all tests into existing files even for integration scenarios | |

**User's choice:** [auto] Augment existing files + one new integration file
**Notes:** TS-04 and TS-07 naturally extend existing component tests. TS-05 and TS-06 test interactions between PaintingModeView, PaintReadinessBanner, and StepFocalView — these need an integration test file.

---

## Optional Section Navigation (TS-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Badge + navigation click | Verify badge renders AND clicking step in optional section triggers goToStep | ✓ |
| Badge only | Just verify visual distinction (already partially covered) | |
| Full navigation matrix | Test every navigation path through optional sections | |

**User's choice:** [auto] Badge + navigation click (recommended default)
**Notes:** Success criterion requires both "visually distinct" AND "do not break navigation." Badge test exists; navigation test is the gap.

---

## Integration Test Approach (TS-05, TS-06)

| Option | Description | Selected |
|--------|-------------|----------|
| Mock hooks, render PaintingModeView | Mock usePaints/useRecipeSections + Tauri APIs, test component directly | ✓ |
| Test at page level | Mock at PaintingModePage level including routing | |
| Unit test only | Test isPaintMissing and banner separately, no integration | |

**User's choice:** [auto] Mock hooks, render PaintingModeView directly (recommended default)
**Notes:** PaintingModeView is the natural integration boundary. State prop can be constructed directly. Avoids routing complexity.

---

## Session Prefill Test Level (TS-07)

| Option | Description | Selected |
|--------|-------------|----------|
| Sheet level — verify props rendered | Test PaintingSessionSheet with explicit value assertions | ✓ |
| Page level — verify prop passing | Test PaintingModePage passes correct props to sheet | |
| Both levels | Full integration chain from page to sheet | |

**User's choice:** [auto] Sheet level (recommended default)
**Notes:** PaintingSessionSheet is a pure component receiving props. Existing tests cover basic prefill — augment with explicit four-value matching.

---

## Claude's Discretion

- Exact assertion messages and test descriptions
- Whether to extract shared factory helpers into a shared file
- Order of test cases within describe blocks
- Whether to add additional edge case tests beyond TS-04/05/06/07

## Deferred Ideas

None — discussion stayed within phase scope.
