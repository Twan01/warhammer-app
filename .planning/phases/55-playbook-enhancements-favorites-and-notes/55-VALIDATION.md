---
phase: 55
slug: playbook-enhancements-favorites-and-notes
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-11
audited: 2026-05-11
---

# Phase 55 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | vite.config.ts (vitest section) |
| **Quick run command** | `pnpm test -- tests/rules-hub/ tests/collection/PlaybookTab.test.tsx` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/rules-hub/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 55-01-01 | 01 | 1 | PLAY-01 | unit | `pnpm test -- tests/rules-hub/RuleAnnotationControls.test.tsx` | ✅ | ✅ green |
| 55-01-02 | 01 | 1 | PLAY-02 | unit | `pnpm test -- tests/rules-hub/RuleAnnotationControls.test.tsx` | ✅ | ✅ green |
| 55-01-03 | 01 | 1 | PLAY-03 | unit | `pnpm test -- tests/rules-hub/RuleNoteEditor.test.tsx` | ✅ | ✅ green |
| 55-01-04 | 01 | 1 | PLAY-01 | unit | `pnpm test -- tests/rules-hub/StratagemCard.test.tsx` | ✅ | ✅ green |
| 55-01-05 | 01 | 1 | PLAY-04 | unit | `pnpm test -- tests/rules-hub/StratagemCard.test.tsx` | ✅ | ✅ green |
| 55-01-06 | 01 | 1 | PLAY-01,02,04 | unit | `pnpm test -- tests/rules-hub/SharedAbilityCard.test.tsx` | ✅ | ✅ green |
| 55-01-07 | 01 | 1 | PLAY-01,02,04 | unit | `pnpm test -- tests/rules-hub/DetachmentCard.test.tsx` | ✅ | ✅ green |
| 55-02-01 | 02 | 2 | PLAY-01,02,04 | integration | `pnpm test -- tests/collection/PlaybookTab.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Gaps Filled by Nyquist Audit (2026-05-11)

### SharedAbilityCard — new annotation tests (8 tests added)
- Shows filled yellow star when favorite prop is non-null (PLAY-01)
- Shows outline star when favorite prop is null (PLAY-01)
- Shows filled blue flag when favorite.is_reminder === 1 (PLAY-02)
- Applies border-l-primary and bg-primary/5 when favorite is non-null (PLAY-04)
- Does NOT apply annotation classes when both favorite and note are null (PLAY-04)
- Shows StickyNote indicator when note prop is non-null (PLAY-03)
- Applies annotation styling when only note is non-null (PLAY-04)

### DetachmentCard — new annotation tests (6 tests added)
- Applies border-l-primary when favoritesMap has matching entry (PLAY-04)
- Does NOT apply annotation classes when both maps are empty (PLAY-04)
- Shows star and flag buttons for each ability when expanded (PLAY-01, PLAY-02)
- Shows filled yellow star for ability when it is in the favoritesMap (PLAY-01)
- Shows filled blue flag for ability when is_reminder === 1 (PLAY-02)
- Shows StickyNote indicator for ability when it is in the notesMap (PLAY-03)

### PlaybookTab — new annotation tests (12 tests added to tests/collection/PlaybookTab.test.tsx)
- StratagemEntry: star button visible (PLAY-01)
- StratagemEntry: flag button visible (PLAY-02)
- StratagemEntry: filled yellow star when in favorites (PLAY-01)
- StratagemEntry: border-l-primary when annotated (PLAY-04)
- DetachmentAbilityRow: star button visible (PLAY-01)
- DetachmentAbilityRow: flag button visible (PLAY-02)
- DetachmentAbilityRow: filled yellow star when in favorites (PLAY-01)
- DetachmentAbilityRow: border-l-primary when annotated (PLAY-04)
- ExtendedAbilityEntry (shared abilities): star button visible (PLAY-01)
- ExtendedAbilityEntry: flag button visible (PLAY-02)
- ExtendedAbilityEntry: filled yellow star when in favorites (PLAY-01)
- ExtendedAbilityEntry: border-l-primary when annotated (PLAY-04)
- ExtendedAbilityEntry: StickyNote indicator when note exists (PLAY-03)

---

## Wave 0 Requirements

- [x] `tests/rules-hub/RuleAnnotationControls.test.tsx` — PLAY-01, PLAY-02
- [x] `tests/rules-hub/RuleNoteEditor.test.tsx` — PLAY-03
- [x] `tests/rules-hub/StratagemCard.test.tsx` — annotation prop coverage for PLAY-01, PLAY-04
- [x] `tests/rules-hub/SharedAbilityCard.test.tsx` — annotation prop coverage added
- [x] `tests/rules-hub/DetachmentCard.test.tsx` — annotation prop coverage added
- [x] `tests/collection/PlaybookTab.test.tsx` — PlaybookTab annotation integration tests added

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual distinction (border + bg tint) renders correctly in dark theme | PLAY-04 | CSS visual appearance | Open PlaybookTab and RulesHubPage, favorite a rule, verify left border and background tint visible |
| Debounced auto-save fires after typing stops | PLAY-03 | Timing-dependent behavior | Type in note textarea, wait 500ms, verify toast or DB write occurs |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete — all gaps filled by Nyquist audit 2026-05-11
