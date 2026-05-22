---
phase: 94
slug: list-export
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-21
---

# Phase 94 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x + React Testing Library 16 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test -- tests/lib/exportArmyList.test.ts tests/army-lists/PrintPreviewDialog.test.tsx` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 94-01-01 | 01 | 1 | EXP-01 | T-94-01 | slugify strips path traversal chars | unit | `pnpm test -- tests/lib/exportArmyList.test.ts` | ✅ | ✅ green |
| 94-01-02 | 01 | 1 | EXP-03 | — | N/A | unit | `pnpm test -- tests/lib/exportArmyList.test.ts` | ✅ | ✅ green |
| 94-02-01 | 02 | 2 | EXP-02 | — | N/A | integration | `pnpm test -- tests/army-lists/PrintPreviewDialog.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/lib/exportArmyList.test.ts` — 28 tests for EXP-01, EXP-03 (pure formatting logic, created by Plan 01 Task 2)
- [x] `tests/army-lists/PrintPreviewDialog.test.tsx` — 6 tests for EXP-02 (print preview rendering, created by Plan 02 Task 1)

*All Wave 0 test files exist and pass.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Print dialog opens with correct content | EXP-02 | window.print() requires real browser/webview | Open army list > Export > Print > Verify print preview shows correct layout > Print dialog opens |
| PDF file saves to disk with correct content | EXP-04 | jsPDF output requires Tauri file system | Open army list > Export > Save as PDF > Choose location > Verify PDF opens and shows correct content |
| Clipboard text pastes correctly in Discord | EXP-01 | Clipboard requires real Tauri runtime | Open army list > Export > Copy to Clipboard > Paste in Discord/Notepad > Verify format |
| JSON file saves with correct schema | EXP-03 | File dialog requires Tauri runtime | Open army list > Export > Save as JSON > Open file > Verify format and version fields |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-21

---

## Validation Audit 2026-05-22

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

**Test coverage:** 34 tests across 2 files (28 unit + 6 integration), all green.
**Threat T-94-01:** Explicitly tested — `slugify("My List../test")` → `"my-list-test"`.
**Auditor verdict:** No gaps. Phase is Nyquist-compliant.
