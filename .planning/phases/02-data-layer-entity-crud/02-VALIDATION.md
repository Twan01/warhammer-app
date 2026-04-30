---
phase: 2
slug: data-layer-entity-crud
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-30
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no test config files or test directories detected |
| **Config file** | None — Tauri IPC bridge prevents unit testing of DB queries outside running app |
| **Quick run command** | Manual: launch app (`cargo tauri dev`), smoke-test affected feature |
| **Full suite command** | Manual: verify all 5 Phase 2 success criteria from ROADMAP |
| **Estimated runtime** | ~5 minutes manual checklist |

**Justification:** All DB behavior requires the Tauri IPC bridge which only exists in the running app. There is no practical way to unit-test `db.execute()` / `db.select()` calls in a Node.js/Vitest environment without mocking the entire Tauri plugin. Manual human-verify is the correct quality gate for this phase.

---

## Sampling Rate

- **After every task commit:** Manual smoke test — launch app, verify the affected feature works (create/edit/delete the relevant entity)
- **After every plan wave:** Full success criteria checklist from ROADMAP Phase 2 goals
- **Before `/gsd:verify-work`:** All 5 success criteria must be TRUE
- **Max feedback latency:** One app restart cycle per task

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | DATA-03, DATA-04, DATA-05 | manual | Launch app — no panic on start | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | DATA-02 | manual | Create faction + unit → delete faction → FK toast | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | SEED-01..06 | manual | First launch — 4 factions appear in list | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | DATA-06 | manual | TypeScript compiles without errors (`tsc --noEmit`) | ❌ W0 | ⬜ pending |
| 02-02-03 | 02 | 1 | DATA-07, DATA-08, DATA-09 | manual | Mutations update list without page reload | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 2 | FACT-01, FACT-04 | manual | Create faction → appears in list | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 2 | FACT-02 | manual | Edit faction → changes persist after restart | ❌ W0 | ⬜ pending |
| 02-03-03 | 03 | 2 | FACT-03 | manual | Delete faction with units → FK toast; delete empty faction → removed | ❌ W0 | ⬜ pending |
| 02-03-04 | 03 | 2 | FACT-05 | manual | Faction list rows show 4px color-theme left border | ❌ W0 | ⬜ pending |
| 02-04-01 | 04 | 3 | UNIT-01..06 | manual | Create unit with all fields → persists after restart | ❌ W0 | ⬜ pending |
| 02-04-02 | 04 | 3 | PAINT-01, PAINT-02 | manual | Create/edit/delete paint; FK blocks delete if in recipe | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src-tauri/migrations/` directory — must be created in Plan 02-01 (no test stubs needed, directory is the artifact)
- [ ] TypeScript compile check (`tsc --noEmit`) — verifiable via CLI, confirms DATA-06 type correctness

*No test framework installation needed — manual verification is the documented approach for this Tauri phase.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| All 10 tables exist in schema | DATA-03 | Requires running SQLite in Tauri WebView | App startup → DevTools console → `SELECT name FROM sqlite_master WHERE type='table'` |
| `model_instances` table absent | DATA-04 | Same — requires running SQLite | Verify table list does NOT contain `model_instances` |
| Migrations run once, idempotent | DATA-05 | Requires app restart cycle | Delete DB file → restart app twice → no errors either time |
| FK blocks faction delete | FACT-03, DATA-02 | Requires Tauri IPC + running DB | Create faction + unit → attempt delete faction → observe "Cannot delete faction" toast |
| FK blocks paint delete | PAINT-02 | Same | Create paint + link to recipe → attempt delete paint → observe FK toast |
| Seed data loads on first launch | SEED-01..06 | Requires fresh DB | Wipe DB file → restart → 4 factions appear, sample units and paints present |
| `PAINTING_STATUS_ORDER` drives select | UNIT-06 | UI interaction | Open unit sheet → `painting_status` dropdown shows statuses in PAINTING_STATUS_ORDER order |

---

## Validation Sign-Off

- [ ] All tasks have manual verify instructions documented above
- [ ] Sampling continuity: manual smoke test after every task commit
- [ ] Wave 0 covers directory creation (`src-tauri/migrations/`) and TypeScript compile check
- [ ] No watch-mode flags
- [ ] Feedback latency: one app restart cycle (< 2 minutes)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
