---
phase: 66
slug: army-list-validation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-13
---

# Phase 66 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x + React Testing Library 16 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test -- tests/lib/computeUnitWarnings.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/lib/computeUnitWarnings.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 66-01-01 | 01 | 1 | LV-01 | — | N/A | unit | `pnpm test -- tests/lib/computeUnitWarnings.test.ts` | ❌ W0 | ⬜ pending |
| 66-01-02 | 01 | 1 | LV-01 | — | N/A | unit | `pnpm test -- tests/lib/computeUnitWarnings.test.ts` | ❌ W0 | ⬜ pending |
| 66-01-03 | 01 | 1 | LV-03 | — | N/A | unit | `pnpm test -- tests/lib/computeUnitWarnings.test.ts` | ❌ W0 | ⬜ pending |
| 66-01-04 | 01 | 1 | LV-04 | — | N/A | unit | `pnpm test -- tests/lib/computeUnitWarnings.test.ts` | ❌ W0 | ⬜ pending |
| 66-02-01 | 02 | 1 | LV-02 | — | N/A | manual | N/A — Tauri SQLite bridge | N/A | ⬜ pending |
| 66-03-01 | 03 | 2 | LV-01, LV-04 | — | N/A | manual | N/A — UI integration | N/A | ⬜ pending |
| 66-03-02 | 03 | 2 | LV-02, LV-03 | — | N/A | manual | N/A — UI integration | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/lib/computeUnitWarnings.test.ts` — stubs for LV-01 (hard/soft warning classification, points exceeded logic), LV-03 (role coverage counts), LV-04 (ownership percentage)

*Existing test infrastructure (vitest.config.ts, tests/setup.ts) covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tactical role persists and loads via SQLite | LV-02 | Tauri SQLite bridge not available in jsdom | Assign role in UI, refresh, verify role persists |
| Warning icons render with correct severity | LV-01 | Visual UI verification | Add unit with hard/soft warnings, verify AlertTriangle/Info icons appear |
| Health summary panel displays all 5 stats | LV-04 | Visual UI verification | Open army list detail, verify points/owned/ready/freshness/warnings display |
| Role coverage pills render with gap styling | LV-03 | Visual UI verification | Assign roles to some units, verify covered/gap pill styling |
| Points exceeded turns red | LV-01 | Visual UI verification | Set points_limit below total, verify destructive color |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
