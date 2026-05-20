---
phase: 85
slug: core-execution-ui
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-19
---

# Phase 85 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 (jsdom) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test -- tests/painting-mode/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~4s (painting-mode), ~30s (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/painting-mode/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 85-01-01 | 01 | 1 | PR-01, PR-02, PR-03 | unit | `pnpm test -- tests/painting-mode/StepMetadataRow.test.tsx tests/painting-mode/PaintReadinessBanner.test.tsx` | ✅ | ✅ green |
| 85-01-02 | 01 | 1 | PR-01, PR-02, PR-03 | unit | `pnpm test -- tests/painting-mode/PaintReadinessBanner.test.tsx` | ✅ | ✅ green |
| 85-02-01 | 02 | 1 | SP-01, SP-02, SP-03, SP-04 | unit | `pnpm test -- tests/painting-mode/SectionNavigator.test.tsx` | ✅ | ✅ green |
| 85-02-02 | 02 | 1 | SP-01, SP-02, SP-03, SP-04 | unit | `pnpm test -- tests/painting-mode/SectionNavigator.test.tsx` | ✅ | ✅ green |
| 85-03-01 | 03 | 2 | SE-01, SE-02, SE-03, SE-04, SE-05, PX-01 | unit+integration | `pnpm test -- tests/painting-mode/StepFocalView.test.tsx tests/painting-mode/PaintingModeView.test.tsx` | ✅ | ✅ green |
| 85-03-02 | 03 | 2 | SE-01, SE-02, SE-03, SE-04, SE-05, PX-01 | unit+integration | `pnpm test -- tests/painting-mode/StepFocalView.test.tsx tests/painting-mode/PaintingModeView.test.tsx` | ✅ | ✅ green |

---

## Requirement Coverage Detail

| Requirement | Description | Test File(s) | Test Count | Status |
|-------------|-------------|--------------|------------|--------|
| PR-01 | Missing paints listed in dismissible amber banner | PaintReadinessBanner.test.tsx, PaintingModeView.test.tsx | 3 | ✅ COVERED |
| PR-02 | Banner can be dismissed, stays hidden | PaintReadinessBanner.test.tsx | 1 | ✅ COVERED |
| PR-03 | Paintless steps produce no false warnings | PaintReadinessBanner.test.tsx, PaintingModeView.test.tsx | 2 | ✅ COVERED |
| SP-01 | Section shows completed/total step counts | SectionNavigator.test.tsx | 1 | ✅ COVERED |
| SP-02 | Current section visually highlighted | SectionNavigator.test.tsx | 1 | ✅ COVERED |
| SP-03 | Jump to any step by click | SectionNavigator.test.tsx | 1 | ✅ COVERED |
| SP-04 | Optional sections display badge | SectionNavigator.test.tsx | 1 | ✅ COVERED |
| SE-01 | Step detail: paint swatch, technique, tool, dilution, time | StepFocalView.test.tsx | 4 | ✅ COVERED |
| SE-02 | Mark done with single click | StepFocalView.test.tsx | 2 | ✅ COVERED |
| SE-03 | Forward/backward navigation with disabled states | StepFocalView.test.tsx | 4 | ✅ COVERED |
| SE-04 | Position indicator with section name | StepFocalView.test.tsx | 2 | ✅ COVERED |
| SE-05 | Reference photo display/collapse | StepFocalView.test.tsx | 2 | ✅ COVERED |
| PX-01 | Distraction-free full-height layout, loading/empty states | PaintingModeView.test.tsx | 3 | ✅ COVERED |

---

## Test Files Summary

| File | Tests | Framework | Covers |
|------|-------|-----------|--------|
| tests/painting-mode/StepMetadataRow.test.tsx | 6 | Vitest + RTL | PR-01 (metadata display) |
| tests/painting-mode/PaintReadinessBanner.test.tsx | 5 | Vitest + RTL | PR-01, PR-02, PR-03 |
| tests/painting-mode/SectionNavigator.test.tsx | 6 | Vitest + RTL | SP-01, SP-02, SP-03, SP-04 |
| tests/painting-mode/StepFocalView.test.tsx | 14 | Vitest + RTL | SE-01, SE-02, SE-03, SE-04, SE-05 |
| tests/painting-mode/PaintingModeView.test.tsx | 5 | Vitest + RTL | PX-01, PR-01, PR-03 |
| tests/painting-mode/paintingModeState.test.ts | 13 | Vitest | Phase 84 state hook |
| tests/painting-mode/completeStepWithSession.test.ts | 5 | Vitest | Phase 84 mutation |
| tests/painting-mode/useCompleteStep.test.ts | 6 | Vitest | Phase 84 hook |
| **Total** | **60** | | |

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-19

---

## Validation Audit 2026-05-19

| Metric | Count |
|--------|-------|
| Requirements audited | 13 |
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Total test files | 8 |
| Total test cases | 60 |
