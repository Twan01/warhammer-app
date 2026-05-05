---
phase: 21-wishlist
verified: 2026-05-05T19:05:00Z
status: passed
score: 5/5 must-haves verified
---

# Phase 21: Wishlist Verification Report

**Phase Goal:** Users can maintain a running list of models they want to buy — with name, faction, optional estimated cost, and notes — on a dedicated Wishlist page before the items exist in their collection
**Verified:** 2026-05-05T19:05:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can navigate to /wishlist via sidebar and see the Wishlist page | VERIFIED | `wishlistRoute` at `/wishlist` in `router.tsx` line 85+112; Wishlist entry in `MANAGEMENT_NAV` in `AppSidebar.tsx` line 51 |
| 2 | User can add a new wishlist item with name, faction, optional cost, and optional notes | VERIFIED | `WishlistItemSheet.tsx` implements create/edit form with all 4 fields; `buildDefaultValues` + `zodResolver`; `useCreateWishlistItem` mutation wired |
| 3 | User can view all wishlist items in a row list showing name, faction, cost, notes, date | VERIFIED | `WishlistItemRow.tsx` renders name, factionName, `formatCurrency(estimated_cost_pence)`, notes (truncated), dateLabel; total summary bar in `WishlistPage.tsx` |
| 4 | User can delete a wishlist item and it disappears immediately | VERIFIED | `WishlistItemDeleteDialog.tsx` calls `useDeleteWishlistItem().mutateAsync(item.id)`; cache invalidated via `WISHLIST_ITEMS_KEY` |
| 5 | Page shows total estimated cost summary when items exist | VERIFIED | `totalPence` useMemo in `WishlistPage.tsx` line 41-44; `formatCurrency(totalPence)` rendered in summary bar line 90 |

**Score:** 5/5 truths verified

---

### Required Artifacts

#### Wave 1 — Data Layer (Plan 21-01)

| Artifact | Status | Evidence |
|----------|--------|----------|
| `src-tauri/migrations/009_wishlist.sql` | VERIFIED | Exists. Contains `CREATE TABLE IF NOT EXISTS wishlist_items` with `faction_id REFERENCES factions(id) ON DELETE CASCADE`, nullable `estimated_cost_pence INTEGER`, nullable `notes TEXT`, no `updated_at` |
| `src-tauri/src/lib.rs` | VERIFIED | Contains `version: 9`, `description: "wishlist"`, `include_str!("../migrations/009_wishlist.sql")` (lines 56-58) |
| `src/types/wishlistItem.ts` | VERIFIED | Exports `WishlistItem`, `CreateWishlistItemInput`, `UpdateWishlistItemInput`; no `updated_at` column |
| `src/db/queries/wishlistItems.ts` | VERIFIED | Exports all 4 CRUD functions; imports `getDb` from `@/db/client`; uses positional `$N` params; full-replacement UPDATE (no COALESCE); `ORDER BY created_at DESC` |
| `src/hooks/useWishlistItems.ts` | VERIFIED | Exports `WISHLIST_ITEMS_KEY`, `useWishlistItems`, `useCreateWishlistItem`, `useUpdateWishlistItem`, `useDeleteWishlistItem`; invalidates both `WISHLIST_ITEMS_KEY` and `["dashboard-stats"]` |
| `src/features/wishlist/wishlistItemSchema.ts` | VERIFIED | Exports `wishlistItemSchema` and `WishlistItemFormValues`; no `.default()` calls; uses `.nullable()` for optional fields |

#### Wave 2 — UI Layer (Plan 21-02)

| Artifact | Status | Evidence |
|----------|--------|----------|
| `src/features/wishlist/WishlistPage.tsx` | VERIFIED | 124 lines. Imports `useWishlistItems`. Contains `formatCurrency(totalPence)`. `WishlistItemSheet` and `WishlistItemDeleteDialog` as sibling portals at page root. Loading skeletons, error state, empty state, item list all implemented. |
| `src/features/wishlist/WishlistItemRow.tsx` | VERIFIED | 95 lines. Contains `group-hover:visible` pattern. Contains `e.stopPropagation()` on both Edit and Delete handlers. Renders name, factionName, `formatCurrency`, notes with `title` attr, dateLabel. |
| `src/features/wishlist/WishlistItemSheet.tsx` | VERIFIED | 232 lines. Contains `buildDefaultValues` function. Contains `useEffect` form reset (belt-and-braces). Contains `Math.round` for pence conversion. All 4 fields implemented (name, faction Select, cost input, notes textarea). |
| `src/features/wishlist/WishlistItemDeleteDialog.tsx` | VERIFIED | 65 lines. Contains `useDeleteWishlistItem`. Uses `Dialog` (not AlertDialog). Contains `variant="destructive"`. `mutateAsync(item.id)` called on confirm. |
| `src/features/wishlist/WishlistEmptyState.tsx` | VERIFIED | 22 lines. Contains `"Your wishlist is empty"`. Heart icon. `onAdd` callback wired to Button. |
| `src/app/wishlist/page.tsx` | VERIFIED | Barrel re-export: `export { WishlistPage } from "@/features/wishlist/WishlistPage"` |
| `src/app/router.tsx` | VERIFIED | `wishlistRoute` defined at `/wishlist`, imported from `./wishlist/page`, added to `routeTree.addChildren` array |
| `src/components/common/AppSidebar.tsx` | VERIFIED | `Heart` imported from lucide-react; `{ to: "/wishlist", label: "Wishlist", icon: Heart }` in `MANAGEMENT_NAV` |

#### Wave 0 — Test Stubs (Plan 21-00, activated in 21-01/02)

| Artifact | Status | Evidence |
|----------|--------|----------|
| `tests/wishlist/wishlistQueries.test.ts` | VERIFIED | 95 lines. 8 live tests (zero `it.skip`). All imports real. `vi.mock("@/db/client")`. All 8 tests pass. |
| `tests/wishlist/WishlistPage.test.tsx` | VERIFIED | 249 lines. 8 live tests (zero `it.skip`). Mocks `@/hooks/useWishlistItems` and `@/hooks/useFactions`. All 8 tests pass. |

---

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `WishlistPage.tsx` | `useWishlistItems.ts` | `import { useWishlistItems }` | VERIFIED — line 5 of WishlistPage.tsx |
| `WishlistItemSheet.tsx` | `useWishlistItems.ts` | `import { useCreateWishlistItem, useUpdateWishlistItem }` | VERIFIED — line 30 of WishlistItemSheet.tsx |
| `WishlistItemDeleteDialog.tsx` | `useWishlistItems.ts` | `import { useDeleteWishlistItem }` | VERIFIED — line 11 of WishlistItemDeleteDialog.tsx |
| `useWishlistItems.ts` | `wishlistItems.ts` | `import { getWishlistItems, createWishlistItem, updateWishlistItem, deleteWishlistItem }` | VERIFIED — lines 2-7 of useWishlistItems.ts |
| `wishlistItems.ts` | `client.ts` | `import { getDb } from "@/db/client"` | VERIFIED — line 1 of wishlistItems.ts |
| `WishlistPage.tsx` | `formatCurrency.ts` | `import { formatCurrency }` | VERIFIED — line 7 of WishlistPage.tsx |
| `AppSidebar.tsx` | `/wishlist` | MANAGEMENT_NAV entry | VERIFIED — line 51 of AppSidebar.tsx |
| `router.tsx` | `WishlistPage` | `import { WishlistPage } from "./wishlist/page"` | VERIFIED — line 21 of router.tsx; route registered line 112 |

All 8 key links verified. No broken connections.

---

### Requirements Coverage

| Requirement | Description | Plan(s) | Status | Evidence |
|-------------|-------------|---------|--------|----------|
| WISH-01 | User can add a wishlist item with name, faction, and optional estimated cost in pence | 21-01, 21-02 | SATISFIED | `WishlistItemSheet.tsx` creates items via `useCreateWishlistItem`; name + faction required, cost optional nullable; pence stored via `Math.round(pounds * 100)`; test "renders Sheet form with name, faction, cost, notes fields on Add click" passes |
| WISH-02 | User can view all wishlist items on a dedicated page | 21-01, 21-02 | SATISFIED | `WishlistPage.tsx` renders all items via `useWishlistItems`; `WishlistItemRow` shows name/faction/cost/notes/date; summary bar shows count + total; test "renders rows with name, faction name, estimated cost, notes, date" passes |
| WISH-03 | User can delete a wishlist item | 21-01, 21-02 | SATISFIED | `WishlistItemDeleteDialog.tsx` calls `deleteWishlistItem` via `useDeleteWishlistItem`; cache invalidated immediately; test "removes item from list after confirm" verifies `mockDeleteMutateAsync` called with item id |
| WISH-04 | User can add optional notes to a wishlist item | 21-01, 21-02 | SATISFIED | `notes TEXT` nullable column in migration 009; `notes: z.string().max(2000).nullable()` in schema; textarea rendered in Sheet; `WishlistItemRow` displays notes truncated with `title` attr for hover; test "displays notes text (truncated) on row for items with notes" passes |

All 4 requirements SATISFIED. No orphaned requirements found — WISH-01..04 are the only requirement IDs declared in REQUIREMENTS.md for Phase 21, and all 3 plans claim them.

---

### Anti-Patterns Found

None. Scan results:

- Zero `TODO/FIXME/PLACEHOLDER` comments in feature files (only benign `placeholder=""` HTML attributes in form inputs)
- Zero `it.skip` in test files — all stubs activated
- Zero stub implementations (`return null`, `return {}`, empty arrow functions in handlers)
- All form handlers connect to real mutations
- Currency conversion is real (`Math.round(pounds * 100)`, not hardcoded)
- DELETE actually calls `mutateAsync(item.id)`, not just `console.log`

---

### Human Verification Required

The following behaviors cannot be verified programmatically and warrant manual spot-check on first use:

**1. Wishlist sidebar navigation**
- Test: Launch the app, look at the sidebar MANAGEMENT_NAV group
- Expected: "Wishlist" entry with Heart icon is visible; clicking it navigates to /wishlist
- Why human: CSS visibility (`group-hover:visible` etc.) and sidebar collapse state not testable in jsdom

**2. Currency input feel (pounds/pence conversion)**
- Test: Open "Add Item" sheet, type "35.00" in the Estimated Cost field, save, reopen the item
- Expected: Field shows "35.00" (£35.00), saved in DB as 3500 pence, displayed in row as "£35.00"
- Why human: Real number input behavior and floating-point rounding edge cases not fully captured in mocks

**3. Faction ON DELETE CASCADE**
- Test: Add a wishlist item for a faction, delete that faction, check wishlist
- Expected: Wishlist item is automatically removed (cascade)
- Why human: Requires the Tauri SQLite runtime; cannot verify cascade in jsdom mock environment

---

### Test Suite Result

```
Tests:  16 wishlist tests passed (8 SQL contract + 8 component integration)
Skips:  0 (all Wave 0 stubs activated)
Suite:  603 total tests passed across 91 files
```

---

## Summary

Phase 21 goal is fully achieved. All observable truths hold, all artifacts are substantive and wired, all key links confirmed in source, all 4 WISH requirements satisfied with test evidence. No stubs, no placeholders, no broken connections detected. The Wishlist feature is production-complete with a working data layer (migration 009, CRUD queries, React Query hooks, Zod schema) and a full UI layer (Page, Row, Sheet, DeleteDialog, EmptyState, route, sidebar entry).

---

_Verified: 2026-05-05T19:05:00Z_
_Verifier: Claude (gsd-verifier)_
