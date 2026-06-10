---
phase: 121
slug: settings-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-10
---

# Phase 121 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 (jsdom) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test -- tests/settings/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/settings/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 121-01-01 | 01 | 1 | INF-01 | — | N/A | unit | `pnpm test -- tests/settings/migration044.test.ts` | ❌ W0 | ⬜ pending |
| 121-01-02 | 01 | 1 | INF-02 | — | N/A | unit | `pnpm test -- tests/settings/useAppSettings.test.ts` | ❌ W0 | ⬜ pending |
| 121-02-01 | 02 | 1 | INF-03 | — | N/A | component | `pnpm test -- tests/settings/SettingsPage.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/settings/migration044.test.ts` — verify migration SQL file exists and lib.rs registers version 44
- [ ] `tests/settings/useAppSettings.test.ts` — verify hook exports KEY, useQuery, and mutation with invalidation
- [ ] `tests/settings/SettingsPage.test.tsx` — verify page renders h1, 3 tabs, default active tab

*Existing Vitest infrastructure covers all framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Settings persist across app restarts | INF-02 | Requires Tauri IPC + actual SQLite write/read cycle | 1. Open app 2. Write a setting via dev tools 3. Close and reopen 4. Verify setting persists |
| Migration runs on fresh install | INF-01 | Requires clean database file | 1. Delete hobbyforge.db 2. Launch app 3. Verify app_settings table exists |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
