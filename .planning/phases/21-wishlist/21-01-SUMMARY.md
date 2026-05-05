---
phase: 21-wishlist
plan: 01
subsystem: database
tags: [sqlite, react-query, zod, tauri-plugin-sql, wishlist]

# Dependency graph
requires:
  - phase: 21-wishlist
    provides: "Phase 21 context, Wave 0 test stubs (wishlistQueries.test.ts), wishlist research/pitfalls"
provides:
  - "wishlist_items SQLite table via migration 009"
  - "CRUD query module: getWishlistItems, createWishlistItem, updateWishlistItem, deleteWishlistItem"
  - "React Query hooks: useWishlistItems, useCreateWishlistItem, useUpdateWishlistItem, useDeleteWishlistItem"
  - "Zod schema: wishlistItemSchema + WishlistItemFormValues type"
  - "TypeScript types: WishlistItem, CreateWishlistItemInput, UpdateWishlistItemInput"
  - "8 SQL contract tests all green"
affects: [21-02, 21-03, dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Full-replacement UPDATE (no COALESCE) for nullable fields — matches battle_logs pattern"
    - "No updated_at column — matches battle_logs pattern"
    - "ON DELETE CASCADE from wishlist_items.faction_id to factions.id"
    - "Zod schema without .default() — buildDefaultValues() deferred to Sheet component"
    - "Dashboard-stats invalidation on all wishlist mutations for forward compatibility"

key-files:
  created:
    - src-tauri/migrations/009_wishlist.sql
    - src/types/wishlistItem.ts
    - src/db/queries/wishlistItems.ts
    - src/hooks/useWishlistItems.ts
    - src/features/wishlist/wishlistItemSchema.ts
  modified:
    - src-tauri/src/lib.rs
    - tests/wishlist/wishlistQueries.test.ts

key-decisions:
  - "No updated_at column on wishlist_items — tracks only creation time, matches battle_logs precedent"
  - "estimated_cost_pence nullable INTEGER — optional field per WISH-01"
  - "Full-replacement UPDATE with no COALESCE — allows clearing cost/notes to null"
  - "dashboard-stats invalidation on all mutations — forward-compat for when Dashboard displays wishlist totals"

patterns-established:
  - "wishlist query pattern: ORDER BY created_at DESC"
  - "Zod nullable field pattern: z.number().int().min(0).nullable() for pence values"

requirements-completed: [WISH-01, WISH-02, WISH-03, WISH-04]

# Metrics
duration: 6min
completed: 2026-05-05
---

# Phase 21 Plan 01: Wishlist Data Layer Summary

**SQLite migration 009 + CRUD queries + React Query hooks + Zod schema for wishlist_items — 8 SQL contract tests green**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-05T16:35:27Z
- **Completed:** 2026-05-05T16:41:39Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Migration 009 creates wishlist_items table with faction FK (ON DELETE CASCADE), nullable estimated_cost_pence and notes, no updated_at
- 4 CRUD query functions with positional $N params and full-replacement UPDATE (no COALESCE)
- React Query hooks with WISHLIST_ITEMS_KEY + dashboard-stats forward-compat invalidation
- Zod schema without .default() for react-hook-form zodResolver compatibility
- 8 SQL contract tests all passing; full suite 569 passed, 0 failed

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration and register in Rust** - `7d2edb6` (feat)
2. **Task 2: Create TypeScript types, query module, hook module, and Zod schema** - `04cf8a0` (feat)
3. **Task 3: Activate Wave 0 SQL contract test stubs** - `3940ef9` (test)

## Files Created/Modified
- `src-tauri/migrations/009_wishlist.sql` - wishlist_items table DDL with FK cascade and nullable columns
- `src-tauri/src/lib.rs` - Migration version 9 registered in get_migrations() vec
- `src/types/wishlistItem.ts` - WishlistItem interface + CreateWishlistItemInput + UpdateWishlistItemInput
- `src/db/queries/wishlistItems.ts` - CRUD functions using positional $N params, full-replacement UPDATE
- `src/hooks/useWishlistItems.ts` - WISHLIST_ITEMS_KEY + 4 React Query hooks with invalidation
- `src/features/wishlist/wishlistItemSchema.ts` - Zod schema without .default(), WishlistItemFormValues type
- `tests/wishlist/wishlistQueries.test.ts` - 8 SQL contract tests activated from Wave 0 stubs

## Decisions Made
- No updated_at column on wishlist_items — matches battle_logs precedent, only creation time tracked
- estimated_cost_pence stored as nullable INTEGER (pence) — matches existing integer pence discipline
- Full-replacement UPDATE with no COALESCE — allows clearing cost/notes back to null
- invalidate dashboard-stats on all mutations for forward compatibility with future Dashboard wishlist widget
- Zod schema uses .nullable() not .optional() — distinct semantics; form submits explicit null, not undefined

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Complete data layer ready for Wave 2 (UI) consumption
- Wave 2 (21-02) can immediately use useWishlistItems, useCreateWishlistItem, useUpdateWishlistItem, useDeleteWishlistItem
- WishlistItemFormValues type available for Sheet form in 21-02
- WishlistPage test stubs in tests/wishlist/WishlistPage.test.tsx still skipped — waiting for 21-02 UI

## Self-Check: PASSED

All 6 created files verified present. All 3 task commits (7d2edb6, 04cf8a0, 3940ef9) verified in git log. pnpm build exits 0. 8/8 wishlist tests pass.

---
*Phase: 21-wishlist*
*Completed: 2026-05-05*
