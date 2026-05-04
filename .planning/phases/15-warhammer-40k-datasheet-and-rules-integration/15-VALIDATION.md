---
phase: 15
slug: warhammer-40k-datasheet-and-rules-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-04
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (already installed) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test tests/datasheet/ --reporter=verbose` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test tests/datasheet/ --reporter=verbose`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|----------|-----------|-------------------|-------------|--------|
| 15-00-01 | 00 | 0 | Wave 0 stub: csvParse | unit stub | `pnpm test tests/datasheet/csvParse.test.ts -x` | ❌ W0 | ⬜ pending |
| 15-00-02 | 00 | 0 | Wave 0 stub: stripHtml | unit stub | `pnpm test tests/datasheet/stripHtml.test.ts -x` | ❌ W0 | ⬜ pending |
| 15-00-03 | 00 | 0 | Wave 0 stub: migration | content stub | `pnpm test tests/datasheet/migration.test.ts -x` | ❌ W0 | ⬜ pending |
| 15-00-04 | 00 | 0 | Wave 0 stub: datasheetQueries | unit stub | `pnpm test tests/datasheet/datasheetQueries.test.ts -x` | ❌ W0 | ⬜ pending |
| 15-00-05 | 00 | 0 | Wave 0 stub: useDatasheet hook | unit stub | `pnpm test tests/datasheet/useDatasheet.test.tsx -x` | ❌ W0 | ⬜ pending |
| 15-00-06 | 00 | 0 | Wave 0 stub: DatasheetPicker | component stub | `pnpm test tests/datasheet/DatasheetPicker.test.tsx -x` | ❌ W0 | ⬜ pending |
| 15-00-07 | 00 | 0 | Wave 0 stub: DatasheetImportDialog | component stub | `pnpm test tests/datasheet/DatasheetImportDialog.test.tsx -x` | ❌ W0 | ⬜ pending |
| 15-01-01 | 01 | 1 | CSV parse (pipe-delimited + trailing pipe) | unit | `pnpm test tests/datasheet/csvParse.test.ts -x` | ❌ W0 | ⬜ pending |
| 15-01-02 | 01 | 1 | HTML strip + entity decode | unit | `pnpm test tests/datasheet/stripHtml.test.ts -x` | ❌ W0 | ⬜ pending |
| 15-01-03 | 01 | 1 | rules.db migration schema | content | `pnpm test tests/datasheet/migration.test.ts -x` | ❌ W0 | ⬜ pending |
| 15-02-01 | 02 | 1 | datasheets query module functions | unit | `pnpm test tests/datasheet/datasheetQueries.test.ts -x` | ❌ W0 | ⬜ pending |
| 15-02-02 | 02 | 1 | useDatasheet hook | unit | `pnpm test tests/datasheet/useDatasheet.test.tsx -x` | ❌ W0 | ⬜ pending |
| 15-03-01 | 03 | 2 | DatasheetPicker render + search | component | `pnpm test tests/datasheet/DatasheetPicker.test.tsx -x` | ❌ W0 | ⬜ pending |
| 15-03-02 | 03 | 2 | DatasheetImportDialog conflict render | component | `pnpm test tests/datasheet/DatasheetImportDialog.test.tsx -x` | ❌ W0 | ⬜ pending |
| 15-03-03 | 03 | 2 | PlaybookTab with datasheet sections | component | `pnpm test tests/collection/PlaybookTab.test.tsx -x` | ✅ exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/datasheet/csvParse.test.ts` — pipe-delimited parse + trailing pipe handling stubs
- [ ] `tests/datasheet/stripHtml.test.ts` — HTML tag stripping + entity decode stubs
- [ ] `tests/datasheet/migration.test.ts` — rules_001_schema.sql content assertions (mirrors migration005.test.ts pattern)
- [ ] `tests/datasheet/datasheetQueries.test.ts` — stub tests for query functions (getDatasheetsByFaction, getDatasheetById, etc.)
- [ ] `tests/datasheet/useDatasheet.test.tsx` — stub tests for hook
- [ ] `tests/datasheet/DatasheetPicker.test.tsx` — stub render tests for picker component
- [ ] `tests/datasheet/DatasheetImportDialog.test.tsx` — stub render tests for conflict review dialog

*`tests/collection/PlaybookTab.test.tsx` already exists — extend in the plan that adds new sections.*

---

## Manual-Only Verifications

| Behavior | Why Manual | Test Instructions |
|----------|------------|-------------------|
| Wahapedia sync button fires HTTP request and populates rules.db | Requires live network + Tauri runtime | Click "Sync Datasheets" button → verify datasheet picker becomes populated with 40K units |
| DatasheetPicker auto-appears on first Playbook open (empty stats + DB populated) | Requires Tauri runtime + populated rules.db | Open Playbook tab for a unit with no stats → confirm picker appears without clicking a button |
| Stats imported correctly into PlaybookTab form fields | Requires Tauri runtime + rules.db | Pick a known unit (e.g. Intercessors) → verify M/T/Sv/W/Ld/OC match Wahapedia values |
| Conflict review dialog shows on re-import when stats exist | Requires Tauri runtime + rules.db | Enter a stat manually → trigger re-import → verify dialog appears with conflict |
| Abilities organized into Core / Faction / Unit sub-groups | Requires Tauri runtime + rules.db | Import a unit with all three ability types → verify collapsible sections labeled correctly |
| Sources section shows publication name | Requires Tauri runtime + rules.db | Import a unit → verify Sources section shows e.g. "Codex: Space Marines 10th Ed." |
| Last synced date updates after re-sync | Requires Tauri runtime | Re-sync → verify "Last synced: [today]" appears in PlaybookTab |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
