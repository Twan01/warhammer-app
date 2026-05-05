---
phase: 21
slug: wishlist
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-05
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `pnpm test -- tests/wishlist/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/wishlist/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 21-00-01 | 00 | 0 | WISH-01..04 | stub | `pnpm test -- tests/wishlist/wishlistQueries.test.ts` | ❌ W0 | ⬜ pending |
| 21-00-02 | 00 | 0 | WISH-01..04 | stub | `pnpm test -- tests/wishlist/WishlistPage.test.tsx` | ❌ W0 | ⬜ pending |
| 21-01-01 | 01 | 1 | WISH-01 | unit | `pnpm test -- tests/wishlist/wishlistQueries.test.ts` | ❌ W0 | ⬜ pending |
| 21-01-02 | 01 | 1 | WISH-02 | unit | `pnpm test -- tests/wishlist/wishlistQueries.test.ts` | ❌ W0 | ⬜ pending |
| 21-01-03 | 01 | 1 | WISH-03 | unit | `pnpm test -- tests/wishlist/wishlistQueries.test.ts` | ❌ W0 | ⬜ pending |
| 21-01-04 | 01 | 1 | WISH-04 | unit | `pnpm test -- tests/wishlist/wishlistQueries.test.ts` | ❌ W0 | ⬜ pending |
| 21-02-01 | 02 | 2 | WISH-01 | component | `pnpm test -- tests/wishlist/WishlistPage.test.tsx` | ❌ W0 | ⬜ pending |
| 21-02-02 | 02 | 2 | WISH-02 | component | `pnpm test -- tests/wishlist/WishlistPage.test.tsx` | ❌ W0 | ⬜ pending |
| 21-02-03 | 02 | 2 | WISH-03 | component | `pnpm test -- tests/wishlist/WishlistPage.test.tsx` | ❌ W0 | ⬜ pending |
| 21-02-04 | 02 | 2 | WISH-04 | component | `pnpm test -- tests/wishlist/WishlistPage.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/wishlist/wishlistQueries.test.ts` — SQL contract stubs for WISH-01..04 (createWishlistItem, getWishlistItems, deleteWishlistItem, notes nullable)
- [ ] `tests/wishlist/WishlistPage.test.tsx` — Component integration stubs for WISH-01..04 (form save, list render, delete, notes visible)
- [ ] No new framework install needed — Vitest + RTL already configured

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Wishlist page accessible via sidebar | WISH-02 | Navigation integration | Click "Wishlist" in sidebar MANAGEMENT group → page renders |
| Currency formatting display | WISH-01 | Visual verification | Add item with estimated_cost → formatted as £X.XX on row |
| Data persists across restart | WISH-01 | SQLite persistence | Add item → close app → reopen → item still present |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
