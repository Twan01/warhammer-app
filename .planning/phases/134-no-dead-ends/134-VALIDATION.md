---
phase: 134
slug: no-dead-ends
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-17
validated: 2026-06-17
---

# Phase 134 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 (jsdom) |
| **Config file** | `vite.config.ts` / `tests/setup.ts` (existing) |
| **Quick run command** | `pnpm test -- tests/rules-hub tests/units` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~30–60 seconds |

Type/build gate (HON-02-style "compile cleanly"): `pnpm build` (tsc `noUnusedLocals`/`noUnusedParameters` + vite).

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- <touched test dir>`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite + `pnpm build` must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 134-01 | 01 | 1 | HON-03 | — | Shared Abilities tab renders real `udb_detachment_abilities` for a faction with data; honest empty state when none | unit | `pnpm test -- tests/rules-hub/RulesHubSharedAbilities.test.tsx` | ✅ | ✅ green (3/3) |
| 134-02 | 02 | 1 | HON-04 | — | "Link unit" never disabled; unmapped faction → CollectionFactionLinkDialog persists `wahapedia_faction_id`; browse-all picker path | unit | `pnpm test -- tests/units/PlaybookStatsLinkUnit.test.tsx tests/units/CollectionFactionLinkDialog.test.tsx tests/units/DatasheetPicker.test.tsx` | ✅ | ✅ green (22/22) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/rules-hub/RulesHubSharedAbilities.test.tsx` — HON-03: tab shows real abilities + empty state (mock `useDetachmentAbilities`)
- [x] `tests/units/PlaybookStatsLinkUnit.test.tsx` — HON-04: button enabled when faction unmapped; opens link flow
- [x] `tests/units/CollectionFactionLinkDialog.test.tsx` — HON-04: persists selected canonical faction id (asserts STRING id, not Number/NaN)
- [x] `tests/units/DatasheetPicker.test.tsx` — HON-04: browse-all path (2-char prompt; `useUdbSearch` when `factionId` undefined)
- [x] Reuse existing `tests/setup.ts` fixtures (Tauri SQL mocked; ResizeObserver/scrollIntoView polyfilled)

*Existing infrastructure (Vitest + RTL + jsdom) covers all phase requirements — no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live re-resolution after mapping a faction (datasheet/abilities light up without manual refresh) | HON-04 | Requires real query-invalidation across React Query + live DB in `pnpm tauri dev` | In the running app, open a unit whose collection faction is unmapped, click "Link unit", map the faction, confirm the picker opens scoped and the Shared/Detachment abilities populate |
| Shared Abilities tab visual parity with Stratagems/Detachments tabs | HON-03 | Visual/interaction check | Open Rules Hub → Shared Abilities for several factions; confirm card layout, favorites/notes, empty state read honestly |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-06-17 — all requirements automated and green

---

## Validation Audit 2026-06-17

Both phase requirements were already covered by Wave-0 tests created during execution
(plans 134-01 and 134-02). Audit re-ran all four test files: 25/25 green. No gaps to fill.

| Metric | Count |
|--------|-------|
| Requirements | 2 (HON-03, HON-04) |
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Tests verified green | 25 (4 files) |

**Coverage:** HON-03 → `RulesHubSharedAbilities.test.tsx` (3) · HON-04 →
`PlaybookStatsLinkUnit.test.tsx` (6) + `CollectionFactionLinkDialog.test.tsx` (9) +
`DatasheetPicker.test.tsx` (7). All faction-link/browse-all/empty-state behaviors
have automated verification; only live React-Query re-resolution remains manual-only
(documented above — not automatable in jsdom).
