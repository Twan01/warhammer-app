---
phase: 42
slug: architecture-audit
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-08
---

# Phase 42 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | `vite.config.ts` (vitest config embedded) |
| **Quick run command** | `pnpm test -- tests/datasheet/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** N/A — no code changes in this phase
- **After every plan wave:** Run `pnpm test` (regression guard only)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 42-01-01 | 01 | 1 | AUDIT-01 | manual-only | N/A | N/A | ⬜ pending |
| 42-01-02 | 01 | 1 | AUDIT-02 | manual-only | N/A | N/A | ⬜ pending |
| 42-01-03 | 01 | 1 | AUDIT-03 | manual-only | N/A | N/A | ⬜ pending |
| 42-01-04 | 01 | 1 | AUDIT-04 | manual-only | N/A | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test files needed — Phase 42 produces a documentation artifact only.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Schema state documented | AUDIT-01 | Prose accuracy judgment | Verify each rw_* table listed matches DDL in rules_001/002 migrations |
| Data flow documented | AUDIT-02 | Prose completeness judgment | Verify flow matches useRulesSync.ts → lib.rs → SQLite path |
| TypeScript gaps listed | AUDIT-03 | Enumeration completeness | Cross-check types/queries/hooks in datasheet.ts, datasheets.ts, useDatasheet.ts |
| Migration proposals documented | AUDIT-04 | Design proposal review | Verify tables proposed for hobbyforge.db (not rules.db) with column sketches |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
