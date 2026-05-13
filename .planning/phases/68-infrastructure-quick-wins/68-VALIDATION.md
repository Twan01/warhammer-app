---
phase: 68
slug: infrastructure-quick-wins
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-13
---

# Phase 68 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.5 |
| **Config file** | `vite.config.ts` (includes Vitest config) |
| **Quick run command** | `pnpm test -- tests/painting/recipeSections.test.ts tests/painting/duplicateRecipe.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/painting/recipeSections.test.ts tests/painting/duplicateRecipe.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 68-01-01 | 01 | 1 | REC-03 | — | N/A | unit | `pnpm test -- tests/painting/recipeSections.test.ts` | Needs update | pending |
| 68-01-02 | 01 | 1 | REC-05 | — | N/A | unit | `pnpm test -- tests/painting/recipeSections.test.ts` | Wave 0 | pending |
| 68-01-03 | 01 | 1 | REC-05 | — | N/A | unit | `pnpm test -- tests/painting/duplicateRecipe.test.ts` | Needs update | pending |
| 68-01-04 | 01 | 1 | MIG-01 | — | N/A | manual | N/A — verification checklist | Documented | pending |
| 68-01-05 | 01 | 1 | MIG-02 | — | N/A | manual | N/A — smoke test | Manual only | pending |
| 68-01-06 | 01 | 1 | VER-01 | — | N/A | manual | `pnpm build` | Manual verify | pending |

*Status: pending*

---

## Wave 0 Requirements

- [ ] New test in `tests/painting/recipeSections.test.ts` covering section-aware ORDER BY in `getRecipePaintsByRecipe` (REC-05)

*Existing infrastructure covers all other phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Fresh install creates all tables | MIG-02 | Requires app data directory deletion + Tauri launch | Delete app data dir, launch app, verify all tables exist |
| Version numbers match | VER-01 | Simple string comparison in config files | Check package.json and tauri.conf.json show same version |
| All migrations registered | MIG-01 | Verification is code audit, not runtime test | Count Migration entries in lib.rs matches SQL file count |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
