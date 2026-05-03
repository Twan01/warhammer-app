---
phase: 13
slug: hobby-journal
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-03
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm vitest run tests/hobby-journal/` |
| **Full suite command** | `pnpm vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run tests/hobby-journal/`
- **After every plan wave:** Run `pnpm vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| JOUR-01 | Wave 0 | 0 | JOUR-01 | unit | `pnpm vitest run tests/hobby-journal/paintingSessionQueries.test.ts` | ❌ Wave 0 | ⬜ pending |
| JOUR-02 | Wave 0 | 0 | JOUR-02 | unit | `pnpm vitest run tests/hobby-journal/paintingSessionQueries.test.ts` | ❌ Wave 0 | ⬜ pending |
| JOUR-03 | Wave 0 | 0 | JOUR-03 | unit | `pnpm vitest run tests/hobby-journal/useJournalSessions.test.ts` | ❌ Wave 0 | ⬜ pending |
| JOUR-04 | Wave 0 | 0 | JOUR-04 | unit | `pnpm vitest run tests/hobby-journal/unitPhotoQueries.test.ts` | ❌ Wave 0 | ⬜ pending |
| JOUR-05 | Wave 0 | 0 | JOUR-05 | integration | `pnpm vitest run tests/hobby-journal/JournalTab.test.tsx` | ❌ Wave 0 | ⬜ pending |
| JOUR-06 | Wave 0 | 0 | JOUR-06 | unit | `pnpm vitest run tests/hobby-journal/unitPhotoQueries.test.ts` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/hobby-journal/paintingSessionQueries.test.ts` — stubs for JOUR-01 (createSession SQL), JOUR-02 (getSessionsByUnit ORDER BY)
- [ ] `tests/hobby-journal/useJournalSessions.test.ts` — stub for JOUR-03 (optimistic delete rollback)
- [ ] `tests/hobby-journal/unitPhotoQueries.test.ts` — stubs for JOUR-04 (createUnitPhoto stage_label), JOUR-06 (getPhotosByUnit file_path list)
- [ ] `tests/hobby-journal/JournalTab.test.tsx` — stub for JOUR-05 (render skeleton/grid states)
- [ ] `tests/hobby-journal/migration005.test.ts` — verifies SQL in 005_hobby_journal.sql is well-formed

All stubs use `vi.mock("@/db/client", ...)` pattern — no real DB connection. Tauri plugin calls (readFile, writeFile, open, convertFileSrc) mocked at hook/component boundary.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Native file picker opens, image file selected, thumbnail appears | JOUR-04 | tauri-plugin-dialog cannot be triggered from jsdom | 1. Open unit detail sheet → Journal tab. 2. Click "Attach Photo". 3. Select an image file in the OS dialog. 4. Verify thumbnail appears in the 3-col grid with correct stage label. |
| Clicking thumbnail opens full-size sibling Dialog | JOUR-05 | DOM interaction in Tauri webview; sibling portal not testable in jsdom | 1. Open Journal tab with at least one photo. 2. Click a thumbnail. 3. Verify full-size Dialog appears with stage label + caption. |
| Photo files deleted from disk on unit delete | JOUR-06 | File system state not checkable from jsdom | 1. Attach a photo to a unit. Note the file in AppData. 2. Delete the unit. 3. Verify the file no longer exists on disk. |
| Asset protocol serves photos (no silent 404) | JOUR-04 | Requires live Tauri webview with asset protocol enabled | 1. Attach a photo. 2. Open DevTools network tab. 3. Verify asset:// URL returns 200, not blocked or 404. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
