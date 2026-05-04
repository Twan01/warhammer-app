---
phase: 25
slug: design-foundation
status: compliant
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-04
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for Phase 25: Design Foundation.
> Reconstructed from SUMMARY artifacts on 2026-05-04. All gaps filled by gsd-nyquist-auditor.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/design-foundation/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~30 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/design-foundation/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 25-01-T1 | 01 | 1 | DSFD-01 | unit (fs read) | `pnpm test -- tests/design-foundation/designTokens.test.ts` | ✅ | ✅ green |
| 25-01-T2 | 01 | 1 | DSFD-02 | unit (RTL) | `pnpm test -- tests/design-foundation/PageHeader.test.tsx` | ✅ | ✅ green |
| 25-01-T3 | 01 | 1 | DSFD-04 | unit (RTL) | `pnpm test -- tests/design-foundation/StatusBadge.test.tsx` | ✅ | ✅ green |
| 25-01-T4 | 01 | 1 | DSFD-03 | unit (RTL) | `pnpm test -- tests/design-foundation/StatCard.test.tsx` | ✅ | ✅ green |
| 25-02-T1 | 02 | 2 | DSFD-02 | manual (smoke) | — | — | ✅ approved |
| 25-02-T2 | 02 | 2 | DSFD-02 | manual (smoke) | — | — | ✅ approved |
| 25-02-T3 | 02 | 2 | DSFD-02 | manual (smoke) | — | — | ✅ approved |
| 25-02-T4 | 02 | 2 | DSFD-02 | manual (checkpoint) | — | — | ✅ approved |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No Wave 0 stubs needed — Phase 25 components are pure React with no Tauri/SQLite calls.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| All 9 pages show PageHeader with correct title, subtitle, separator, and right-slot actions | DSFD-02 | Cross-page wiring best verified visually in the running app | `pnpm tauri dev` → navigate all 9 sidebar pages, confirm against smoke test table in 25-02-PLAN.md Task 4 |
| CSS token runtime resolution (`bg-forge-black`, `bg-panel-elevated`, `bg-battle-gold`) | DSFD-01 | CSS custom property resolution cannot be verified in jsdom | Open DevTools → Computed panel → verify `--forge-black` resolves to `hsl(240 10% 3.9%)` in dark mode |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or are recorded as manual-only
- [x] Sampling continuity: all 4 automated tasks in Wave 1 covered back-to-back
- [x] No Wave 0 stubs needed — infrastructure existed
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-04

---

## Validation Audit 2026-05-04
| Metric | Count |
|--------|-------|
| Gaps found | 4 |
| Resolved | 4 |
| Escalated | 0 |
