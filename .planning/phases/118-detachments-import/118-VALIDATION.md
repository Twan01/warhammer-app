---
phase: 118
slug: detachments-import
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-04
---

# Phase 118 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | `vitest.config.ts` |
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

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 118-01-01 | 01 | 1 | DET-01 | — | N/A | integration | `pnpm build:udb` | ✅ | ⬜ pending |
| 118-01-02 | 01 | 1 | DET-02 | — | N/A | integration | `pnpm build:udb` | ✅ | ⬜ pending |
| 118-01-03 | 01 | 1 | DET-01, DET-02 | — | N/A | build | `pnpm build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. The build pipeline (`pnpm build:udb`) validates CSV parsing and JSON output. TypeScript strict mode validates type correctness. The Rust build validates importer struct changes.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Detachment records queryable by faction_id | DET-01 | Requires running app with real DB | Build, launch app, check DB with SQLite CLI |
| Stable across re-imports (no AUTOINCREMENT drift) | DET-01 | Requires two consecutive imports | Run `pnpm build:udb` twice, compare detachment IDs |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
