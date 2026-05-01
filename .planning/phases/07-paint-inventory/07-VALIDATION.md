---
phase: 7
slug: paint-inventory
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-01
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green + manual smoke test (add paint, apply each filter, toggle owned, click recipe badge, verify navigation to `/recipes?paintId=X`)
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 7-01-01 | 01 | 1 | PINV-02 | Unit (Zustand) | `npm test -- -t "paintInventoryFilters"` | ❌ W0 | ⬜ pending |
| 7-01-02 | 01 | 1 | PINV-03 | Unit (Zustand) | `npm test -- -t "paintInventoryFilters"` | ❌ W0 | ⬜ pending |
| 7-01-03 | 01 | 1 | PINV-04 | Unit (Zustand) | `npm test -- -t "paintInventoryFilters"` | ❌ W0 | ⬜ pending |
| 7-02-01 | 02 | 1 | PINV-05 | Unit (mock DB) | `npm test -- -t "recipePaints"` | ❌ W0 | ⬜ pending |
| 7-03-01 | 03 | 2 | PINV-01 | Manual | manual smoke test | N/A | ⬜ pending |
| 7-03-02 | 03 | 2 | PINV-06 | Manual | manual smoke test | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/paint-inventory/paintInventoryFilters.test.ts` — Zustand store unit tests: initial state, `toggleBrand`/`toggleType`/`toggleColorFamily` add/remove behavior, `toggleRunningLow`/`toggleWishlist` flip behavior, filter function returns only matching `running_low === 1` / `wishlist === 1` paints, `clearAll` resets all five fields to defaults. Follows exact structure of `tests/collection/collectionFilters.test.ts`.
- [ ] `tests/paint-inventory/recipePaintQuery.test.ts` — mocks `getDb()`, asserts `getRecipeIdsByPaintId(5)` calls `db.select` with `"SELECT DISTINCT recipe_id FROM recipe_paints WHERE paint_id = $1"` and `[5]`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PaintsPage renders filterable table with all columns | PINV-01 | Tauri IPC (`tauri-plugin-sql`) cannot be mocked in jsdom without significant infrastructure | Launch app, navigate to Paints, verify color swatch, recipe badge, brand/type columns all render |
| Inline owned toggle with optimistic update + rollback | PINV-06 | Requires live DB and Tauri IPC | Toggle owned on a paint row; verify badge flips immediately; verify DB persists after re-navigation |
| Brand/type/color-family filter dropdowns | PINV-02 | UI interaction requires live mount | Apply each filter combination, verify table narrows; navigate away and back, verify filters reset |
| Running Low preset view | PINV-03 | UI interaction + live DB data | Click Running Low; verify only `running_low=1` paints shown |
| Wishlist preset view | PINV-04 | UI interaction + live DB data | Click Wishlist; verify only `wishlist=1` paints shown |
| Recipe badge navigates to `/recipes?paintId=X` | PINV-05 | Cross-page navigation with search params | Click a badge with count > 0; verify Recipes page opens pre-filtered to that paint |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
