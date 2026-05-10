---
phase: 52
slug: schema-data-layer-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-10
---

# Phase 52 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 52-01-01 | 01 | 1 | SC-1 | integration | `pnpm tauri dev` (manual migration check) | N/A | ⬜ pending |
| 52-01-02 | 01 | 1 | SC-2 | unit | `pnpm build` (TS type check) | ✅ | ⬜ pending |
| 52-02-01 | 02 | 1 | SC-3 | unit | `pnpm test -- tests/db/queries` | ❌ W0 | ⬜ pending |
| 52-02-02 | 02 | 1 | SC-4 | unit | `pnpm test -- tests/hooks` | ❌ W0 | ⬜ pending |
| 52-03-01 | 03 | 2 | ARMY-06 | manual | Review `.planning/points-import-design.md` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/db/queries/rulesFavorites.test.ts` — stubs for favorites CRUD
- [ ] `tests/db/queries/rulesNotes.test.ts` — stubs for notes CRUD
- [ ] `tests/hooks/useRulesFavorites.test.ts` — stubs for favorites hooks
- [ ] `tests/hooks/useRulesNotes.test.ts` — stubs for notes hooks

*Existing infrastructure covers TypeScript type checking and migration validation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Migration 019 runs on app start | SC-1 | SQLite migration requires Tauri runtime | Launch `pnpm tauri dev`, check console for migration errors |
| Points import design doc quality | ARMY-06 | Document review, not code | Read `.planning/points-import-design.md`, verify all 5 sections present |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
