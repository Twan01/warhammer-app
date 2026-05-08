---
phase: 15
slug: warhammer-40k-datasheet-and-rules-integration
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-04
audited: 2026-05-04
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
| **Estimated runtime** | ~35 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test tests/datasheet/ --reporter=verbose`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~35 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|----------|-----------|-------------------|-------------|--------|
| 15-00-01 | 00 | 0 | CSV parse stubs | unit | `pnpm test tests/datasheet/csvParse.test.ts -x` | ✅ | ✅ green |
| 15-00-02 | 00 | 0 | stripHtml stubs | unit | `pnpm test tests/datasheet/stripHtml.test.ts -x` | ✅ | ✅ green |
| 15-00-03 | 00 | 0 | migration stubs | content | `pnpm test tests/datasheet/migration.test.ts -x` | ✅ | ✅ green |
| 15-00-04 | 00 | 0 | datasheetQueries stubs | unit | `pnpm test tests/datasheet/datasheetQueries.test.ts -x` | ✅ | ✅ green |
| 15-00-05 | 00 | 0 | useDatasheet hook stubs | unit | `pnpm test tests/datasheet/useDatasheet.test.tsx -x` | ✅ | ✅ green |
| 15-00-06 | 00 | 0 | DatasheetPicker stubs | component | `pnpm test tests/datasheet/DatasheetPicker.test.tsx -x` | ✅ | ✅ green |
| 15-00-07 | 00 | 0 | DatasheetImportDialog stubs | component | `pnpm test tests/datasheet/DatasheetImportDialog.test.tsx -x` | ✅ | ✅ green |
| 15-01-01 | 01 | 1 | CSV parse (pipe-delimited + trailing pipe) | unit | `pnpm test tests/datasheet/csvParse.test.ts -x` | ✅ | ✅ green |
| 15-01-02 | 01 | 1 | HTML strip + entity decode | unit | `pnpm test tests/datasheet/stripHtml.test.ts -x` | ✅ | ✅ green |
| 15-01-03 | 01 | 1 | rules.db migration schema | content | `pnpm test tests/datasheet/migration.test.ts -x` | ✅ | ✅ green |
| 15-02-01 | 02 | 1 | datasheets query module functions | unit | `pnpm test tests/datasheet/datasheetQueries.test.ts -x` | ✅ | ✅ green |
| 15-02-02 | 02 | 1 | useDatasheet hook | unit | `pnpm test tests/datasheet/useDatasheet.test.tsx -x` | ✅ | ✅ green |
| 15-03-01 | 03 | 2 | DatasheetPicker render + search | component | `pnpm test tests/datasheet/DatasheetPicker.test.tsx -x` | ✅ | ✅ green |
| 15-03-02 | 03 | 2 | DatasheetImportDialog conflict render | component | `pnpm test tests/datasheet/DatasheetImportDialog.test.tsx -x` | ✅ | ✅ green |
| 15-03-03 | 03 | 2 | PlaybookTab with datasheet sections | component | `pnpm test tests/collection/PlaybookTab.test.tsx -x` | ✅ | ✅ green |
| G-1 | 05 | — | resolveWahapediaFactionIdByName: 3-branch SQL match | unit | `pnpm test tests/datasheet/datasheetQueries.test.ts -x` | ✅ | ✅ green |
| G-2 | 05 | — | searchAllDatasheets: 2-char guard + LIKE fallback | unit | `pnpm test tests/datasheet/datasheetQueries.test.ts -x` | ✅ | ✅ green |
| G-3 | 05 | — | useWahapediaFactionId hook | unit | `pnpm test tests/datasheet/useDatasheet.test.tsx -x` | ✅ | ✅ green |
| G-4a | 05 | — | getFullDatasheet returns wargear field (rules_002) | unit | `pnpm test tests/datasheet/datasheetQueries.test.ts -x` | ✅ | ✅ green |
| G-4b | 05 | — | rules_002_wargear_abilities.sql: 5 tables, additive-only | content | `pnpm test tests/datasheet/migration.test.ts -x` | ✅ | ✅ green |
| G-5 | 05 | — | WargearTable / Weapons section renders in PlaybookTab | component | `pnpm test tests/collection/PlaybookTab.test.tsx -x` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

All 7 Wave 0 stubs created and passing. ✅

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
| Wargear weapons display in Playbook tab after sync | Requires live Tauri runtime + rules.db | After sync, navigate to any unit and verify Weapons section shows ranged/melee stat rows |

---

## Validation Sign-Off

- [x] All tasks have automated verify or manual-only justification
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 35s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ✅ 2026-05-04

---

## Validation Audit 2026-05-04
| Metric | Count |
|--------|-------|
| Gaps found | 6 |
| Resolved | 6 |
| Escalated | 0 |
