---
phase: 92
slug: leader-attachment
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-21
audited: 2026-05-22
---

# Phase 92 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x + React Testing Library 16 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/army-lists/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/army-lists/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 92-01-01 | 01 | 1 | LDR-02 | T-92-01 | N/A | unit | `pnpm test -- tests/army-lists/groupUnitsWithLeaders.test.tsx` | ✅ | ✅ green |
| 92-01-02 | 01 | 1 | LDR-02 | T-92-02 | N/A | unit | `pnpm build` | ✅ | ✅ green |
| 92-02-01 | 02 | 2 | LDR-01 | T-92-03 | N/A | unit | `pnpm test -- tests/army-lists/LeaderAttachmentSheet.test.tsx` | ✅ | ✅ green |
| 92-02-02 | 02 | 2 | LDR-02 | T-92-05 | Preventive validation: disable Attach when target already led | unit | `pnpm test -- tests/army-lists/ -x` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Test Coverage Detail

### groupUnitsWithLeaders.test.tsx (7 tests — LDR-02)
1. No attachments — units unchanged, all isIndentedLeader=false
2. Single leader-target pair reorders correctly
3. Multiple leader-target pairs grouped correctly
4. Orphaned leader (target missing) dropped from output
5. Empty array returns empty array
6. Ghost units (unit_id=null) with attachment grouped correctly
7. Input array immutability verified

### LeaderAttachmentSheet.test.tsx (8 tests — LDR-01, LDR-02)
1. Renders sheet title with unit name when open
2. Shows valid target units with Attach Leader buttons
3. Shows disabled Attach button with tooltip when target already has a leader
4. Shows Detach Leader button when leader is already attached
5. Calls setLeaderAttachment.mutate on Attach click
6. Calls clearLeaderAttachment.mutate on Detach click
7. Shows empty state message when no valid targets in list
8. Shows no faction guard when faction is not set

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual grouping renders correctly (indent + left border) | LDR-02 | CSS visual layout not testable via jsdom | Open army list with attached leader, verify indent and border accent appear |
| Leader row reorders to appear after target | LDR-02 | DOM order testable but visual position depends on CSS | Verify leader row visually appears immediately below target unit |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-22

---

## Validation Audit 2026-05-22

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 4 tasks have automated verification via existing test files (15 tests total across 2 test files). No gaps to fill.
