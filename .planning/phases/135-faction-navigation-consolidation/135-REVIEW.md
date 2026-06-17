---
phase: 135-faction-navigation-consolidation
reviewed: 2026-06-17T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - src-tauri/migrations/048_consolidate_factions.sql
  - src-tauri/src/lib.rs
  - src/app/router.tsx
  - src/app/settings/page.tsx
  - src/components/common/AppSidebar.tsx
  - tests/data-layer/migration048.test.ts
  - tests/navigation/AppSidebar.nav01.test.tsx
  - tests/performance/lazyRoutes.test.ts
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 135: Code Review Report

**Reviewed:** 2026-06-17
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Phase 135 consolidates duplicate collection factions via the data-loss-critical migration
`048_consolidate_factions.sql` and removes the standalone `/factions` navigation
destination (folding faction management into Settings -> Factions). The navigation
changes (router, sidebar, settings page) are clean and well-tested. The migration is
mostly well-constructed and correctly orders the FK re-points before the DELETE, scopes
the `app_settings` UPDATE to `key='default_faction_id'`, and avoids `BEGIN/COMMIT` and
`PRAGMA foreign_keys` as required.

However, the migration contains **one BLOCKER**: the survivor-selection subqueries are
not deterministic when **three or more** rows share the same `wahapedia_faction_id`.
Every re-point subquery uses `LIMIT 1` with no `ORDER BY`, so a mid-chain duplicate (a row
that is itself slated for deletion) can be chosen as the "survivor" target. Combined with
the DELETE step — which removes every row that has *any* lower-id sibling — this can
re-point a dependent to a row that is then deleted, producing exactly the dangling FK /
RESTRICT failure the migration was written to prevent. The accompanying test only exercises
the two-row case, so this defect is not caught.

## Critical Issues

### CR-01: Non-deterministic survivor selection corrupts data with 3+ duplicate factions

**File:** `src-tauri/migrations/048_consolidate_factions.sql:32-134`

**Issue:**
The survivor of a duplicate group is documented as "the lowest id among rows sharing the
same non-NULL `wahapedia_faction_id`" (lines 20-21). But the re-point subqueries do not
encode "lowest" — they encode "*any* lower id". For each dependent row, the survivor
subquery is:

```sql
SELECT f_sur.id
FROM   factions f_sur
JOIN   factions f_dup ON f_dup.wahapedia_faction_id = f_sur.wahapedia_faction_id
                     AND f_sur.id < f_dup.id
WHERE  f_dup.id = units.faction_id
LIMIT 1
```

Consider three factions sharing key `'SM'` with ids `1, 2, 3` (id 1 is the true survivor):

- For a dependent under `f_dup.id = 3`, the join `f_sur.id < 3` matches **both** `f_sur.id = 1`
  and `f_sur.id = 2`. `LIMIT 1` with **no `ORDER BY`** returns one of them in
  SQLite-unspecified order — it may return `id = 2`.
- The DELETE (lines 127-134) removes every row that has *any* lower-id sibling, i.e. both
  `id = 2` and `id = 3`.

So a `units` row originally under faction 3 can be re-pointed to faction **2**, which is then
deleted. Because `units.faction_id` is `ON DELETE RESTRICT` (verified in
`001_core_schema.sql:22`), one of two failure modes occurs:

1. With FK enforcement effectively off inside the plugin-sql migration transaction (as the
   header comment at lines 27-30 asserts), the DELETE succeeds and leaves a **dangling
   `units.faction_id`** pointing at a non-existent faction — silent data corruption that the
   app's later `PRAGMA foreign_keys = ON` connections will trip over.
2. If FK enforcement is actually active for any reason, the DELETE is **blocked by RESTRICT**
   and the entire migration aborts/panics on startup — a hard launch failure.

The same non-determinism affects the `painting_recipes`, `army_lists`, `wishlist_items`, and
`app_settings.default_faction_id` re-points: a SET NULL / CASCADE dependent can be re-pointed
to a row that is subsequently deleted, re-introducing the silent link loss / row loss the
migration was designed to prevent.

The migration test (`tests/data-layer/migration048.test.ts`) only seeds **one** survivor and
**one** duplicate, so the `f_sur.id < f_dup.id` join has exactly one match and `LIMIT 1` is
incidentally deterministic. The 3+ case is never exercised.

**Fix:**
Pin the survivor to the true minimum id for the group in every re-point subquery and in the
DELETE's complement. Replace `f_sur.id < f_dup.id ... LIMIT 1` with an explicit "min id for
this key" lookup. For example, for Step 1:

```sql
-- Step 1: Re-point units.faction_id to the LOWEST-id survivor for its key
UPDATE units
SET faction_id = (
  SELECT MIN(f2.id)
  FROM   factions f2
  JOIN   factions f_cur ON f_cur.id = units.faction_id
  WHERE  f2.wahapedia_faction_id = f_cur.wahapedia_faction_id
    AND  f_cur.wahapedia_faction_id IS NOT NULL
)
WHERE faction_id IN (
  SELECT f_dup.id
  FROM   factions f_dup
  WHERE  f_dup.wahapedia_faction_id IS NOT NULL
    AND  f_dup.id > (
      SELECT MIN(f3.id) FROM factions f3
      WHERE f3.wahapedia_faction_id = f_dup.wahapedia_faction_id
    )
);
```

Apply the same `MIN(id)`-anchored pattern to Steps 2-5 (use `CAST(MIN(f2.id) AS TEXT)` for
the `app_settings` value) and to the Step 6 DELETE predicate. Then add a regression test that
seeds **three** rows for one key with dependents under both the middle and highest ids, and
asserts every dependent re-points to the single lowest id and that exactly two faction rows
are deleted.

## Warnings

### WR-01: Migration test asserts zero behavior for the 3+ duplicate path

**File:** `tests/data-layer/migration048.test.ts:46-239`

**Issue:**
The "zero-data-loss proof" only constructs a 2-row duplicate group (one survivor, one
duplicate). The header comment claims a proof of the safety contract, but the most dangerous
real-world scenario — a user who created three or more factions mapping to the same canonical
id — is untested. This is the exact case where CR-01 manifests. A test claiming to be a
data-loss proof that omits the multi-duplicate path gives false confidence.

**Fix:**
Add a second data-transformation test that seeds ids for one key across three rows, places
dependents on each of the four FK surfaces under both the middle and highest duplicate, and
asserts (a) all dependents point at the lowest id, (b) row counts on every dependent table are
unchanged, and (c) exactly `N-1` faction rows were deleted per group.

### WR-02: Step 7 normalized backfill can recreate duplicates the migration just removed

**File:** `src-tauri/migrations/048_consolidate_factions.sql:136-147`

**Issue:**
Step 7 backfills still-NULL `wahapedia_faction_id` by normalized name match, copied from
migration 046. It runs *after* the consolidation/DELETE. If two distinct user factions have
names that normalize to the same canonical key (e.g. "T'au Empire" and "Tau Empire", both
normalizing to `tauempire`) and both were NULL before Step 7, Step 7 will assign them the
**same** `wahapedia_faction_id`, immediately re-creating a duplicate group that Steps 1-6 will
not revisit (they already ran). The post-migration invariant the test asserts at lines 226-236
("no duplicates remain") would then be violated on real data even though it passes for the
test's seeded scenario.

**Fix:**
Either run the backfill (Step 7) *before* the consolidation steps so newly-linked rows are
included in the merge, or re-run the consolidation DELETE/re-point logic after the backfill.
Reordering Step 7 to the top is the simpler fix and matches the original 046 intent. Confirm
the invariant test still holds when two NULL factions normalize to the same key.

### WR-03: Survivor row's own `updated_at` not bumped; merged-in dependents leave stale metadata

**File:** `src-tauri/migrations/048_consolidate_factions.sql:32-134`

**Issue:**
When dependents are re-pointed onto the survivor faction, neither the survivor's
`factions.updated_at` nor the re-pointed dependents' `updated_at` columns are touched (only
`app_settings.updated_at` is bumped at line 116). React Query / UI caches keyed on
`updated_at`, and any "recently changed" surfacing, will not reflect that the survivor faction
absorbed new units/recipes/lists. This is a data-freshness inconsistency rather than loss, but
it can make the consolidated faction appear unchanged in views that sort or badge by recency.

**Fix:**
Add `SET ..., updated_at = datetime('now')` to the survivor faction (or to the re-pointed
dependent rows where those tables carry an `updated_at`) so downstream freshness logic
reflects the merge. Confirm which dependent tables have an `updated_at` column before
applying.

### WR-04: `default_faction_id` may point at a deleted faction when the value was a non-survivor non-duplicate edge

**File:** `src-tauri/migrations/048_consolidate_factions.sql:107-124`

**Issue:**
Step 5 only re-points `default_faction_id` when its value is in the set of duplicate ids
(those with a lower-id sibling). That is correct for the value-equals-duplicate case. But it
shares the same non-deterministic `LIMIT 1` survivor selection as CR-01: with 3+ duplicates
the setting can be re-pointed to a mid-chain id (e.g. id 2) that Step 6 then deletes, leaving
`default_faction_id` pointing at a non-existent faction. The cold-boot theming path (D-06)
would then fail to resolve. This is the `app_settings` projection of CR-01 and is fixed by the
same `MIN(id)` change, but is called out separately because the cold-boot consequence (no
accent theme on launch) is user-visible and distinct from the FK-integrity consequence.

**Fix:**
Apply the `CAST(MIN(f2.id) AS TEXT)` survivor anchoring from the CR-01 fix to Step 5, and
extend the migration test's cold-boot assertion (lines 213-224) to the 3-duplicate scenario.

## Info

### IN-01: `bareLayoutRoute` mounts `ActiveFactionProvider` but not `QueryProvider` — verify faction context has data

**File:** `src/app/router.tsx:74-88`

**Issue:**
`bareLayoutRoute` (painting mode) wraps `Outlet` in `ActiveFactionProvider` directly under the
root route, separate from the `layoutRoute` tree. If `ActiveFactionProvider` reads faction data
via React Query, confirm the `QueryProvider` is mounted above the root (e.g. in `main.tsx`) so
both layout subtrees share one client. This is not introduced by Phase 135 but sits adjacent to
the faction-context changes under review.

**Fix:** No change required if `QueryProvider` wraps the router at the app entry; otherwise hoist
it. Verify in `src/main.tsx`.

### IN-02: Stale TODO comment in NAV-01 test

**File:** `tests/navigation/AppSidebar.nav01.test.tsx:20`

**Issue:**
`// TODO Wave 1: mock useQuickAdd when QuickAddContext exists` — the very next lines (21-27)
already mock `useQuickAdd`, so the TODO is obsolete and misleading.

**Fix:** Delete the stale TODO comment.

### IN-03: `lazyRoutes` test couples to exact lazy-import count (17) and named-export string

**File:** `tests/performance/lazyRoutes.test.ts:23-29,85-92`

**Issue:**
Two assertions hard-code `17` and match the literal substring `.then(m => ({ default: m.`.
Any future route addition or a harmless formatting change to the adapter (e.g. arrow-body
reflow) breaks these tests for non-behavioral reasons. This is intentional for the Phase 135
count check, but the string-literal coupling at line 90 is brittle.

**Fix:** Consider asserting the count is `>= number_of_route_components` or counting `lazy(`
occurrences only, and relax the named-export check to a regex tolerant of whitespace. Low
priority — leave as-is if route churn is expected to be rare.

---

_Reviewed: 2026-06-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
