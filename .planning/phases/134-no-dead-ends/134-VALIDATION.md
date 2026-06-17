---
phase: 134
slug: no-dead-ends
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-17
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
| 134-01-xx | 01 | 1 | HON-03 | — | Shared Abilities tab renders real `udb_detachment_abilities` for a faction with data; honest empty state when none | unit | `pnpm test -- tests/rules-hub` | ❌ W0 | ⬜ pending |
| 134-02-xx | 02 | 1 | HON-04 | — | "Link unit" never disabled; unmapped faction → CollectionFactionLinkDialog persists `wahapedia_faction_id`; browse-all picker path | unit | `pnpm test -- tests/units` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/rules-hub/RulesHubSharedAbilities.test.tsx` — HON-03: tab shows real abilities + empty state (mock `useDetachmentAbilities`)
- [ ] `tests/units/PlaybookStatsLinkUnit.test.tsx` — HON-04: button enabled when faction unmapped; opens link flow
- [ ] `tests/units/CollectionFactionLinkDialog.test.tsx` — HON-04: persists selected canonical faction id
- [ ] Reuse existing `tests/setup.ts` fixtures (Tauri SQL mocked; ResizeObserver/scrollIntoView polyfilled)

*Existing infrastructure (Vitest + RTL + jsdom) covers all phase requirements — no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live re-resolution after mapping a faction (datasheet/abilities light up without manual refresh) | HON-04 | Requires real query-invalidation across React Query + live DB in `pnpm tauri dev` | In the running app, open a unit whose collection faction is unmapped, click "Link unit", map the faction, confirm the picker opens scoped and the Shared/Detachment abilities populate |
| Shared Abilities tab visual parity with Stratagems/Detachments tabs | HON-03 | Visual/interaction check | Open Rules Hub → Shared Abilities for several factions; confirm card layout, favorites/notes, empty state read honestly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
