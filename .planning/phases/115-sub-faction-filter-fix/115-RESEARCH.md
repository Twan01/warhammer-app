# Phase 115: Sub-faction Filter Fix - Research

**Researched:** 2026-06-03
**Domain:** SQLite query logic + client-side filter function (pure TypeScript)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Fix at BOTH the SQL query level and the client-side filter level. The army list picker and collection browser use `getUdbUnitIdsBySubFaction()` (SQL-based ID set), while the database browser uses `applyUdbFilters()` (client-side). Both must include `sub_faction IS NULL` units.
- **D-02:** `getUdbUnitIdsBySubFaction()` SQL query changes from `WHERE faction_id = $1 AND sub_faction = $2` to `WHERE faction_id = $1 AND (sub_faction = $2 OR sub_faction IS NULL)` — this is the core fix for army list picker and collection browser.
- **D-03:** `applyUdbFilters()` sub-faction check changes from `unit.sub_faction !== filters.subFactionFilter` to `unit.sub_faction !== filters.subFactionFilter && unit.sub_faction !== null` — this is the core fix for the database browser.
- **D-04:** No visual distinction between generic parent faction units and sub-faction-specific units.
- **D-05:** No changes to sub-faction dropdown counts or badges.

### Claude's Discretion

- Whether to add a test verifying the combined filter result includes both specific and generic units
- Exact test structure and fixture data if tests are added

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SUB-01 | Selecting a sub-faction in the database browser shows sub-faction-specific units PLUS all generic parent faction units (sub_faction IS NULL) | Fix `applyUdbFilters()` line 28 — pass-through units where `sub_faction === null` |
| SUB-02 | Selecting a sub-faction in the army list unit picker shows sub-faction-specific units PLUS generic parent faction units | Fix `getUdbUnitIdsBySubFaction()` SQL — add `OR sub_faction IS NULL` clause |
| SUB-03 | Selecting a sub-faction in the collection browser shows sub-faction-specific units PLUS generic parent faction units | Same SQL fix as SUB-02 — `CollectionPage` uses the same `useUdbSubFactionUnitIds` hook |
</phase_requirements>

---

## Summary

Phase 115 is a surgical bug fix with two independent change sites and no new dependencies. The root cause is identical in both sites: sub-faction filtering was implemented as an exact-match, excluding units where `sub_faction IS NULL` (i.e., units generic to the entire parent faction). The correct semantics are "units available to this sub-faction", which means sub-faction-specific units AND generic parent-faction units.

The two change sites are completely independent: (1) `src/db/queries/unitDatabase.ts` — one SQL query change adds `OR sub_faction IS NULL` to fix SUB-02 and SUB-03 simultaneously, and (2) `src/features/unit-database/applyUdbFilters.ts` — one condition change adds `&& unit.sub_faction !== null` to fix SUB-01. The hook layer (`useUdbSubFactionUnitIds`) and filter stores require no changes.

An existing test file `tests/unit-database/applyUdbFilters.test.ts` already tests sub-faction filtering but encodes the wrong expected behavior — two tests explicitly assert that `sub_faction IS NULL` units are excluded when a sub-faction filter is active. Those tests must be corrected to match the new correct behavior, and a new test must be added asserting that null-sub_faction units are included.

**Primary recommendation:** Fix the SQL query and the filter condition (two one-line changes), then update the existing test file to reflect the corrected semantics and add a new test case asserting generic units pass through.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Sub-faction ID set retrieval (army list, collection) | Database / Storage | React Query hook | SQL is the source of truth for which unit IDs belong to a sub-faction + generic pool |
| Sub-faction filtering (database browser) | Frontend (pure function) | — | `applyUdbFilters` runs client-side on already-fetched unit list |
| Hook orchestration | React Query hooks | — | `useUdbSubFactionUnitIds` wraps the SQL query; no logic change needed |
| Filter state | Zustand stores | — | `databaseBrowserFilters` and `collectionFilters` — no change needed |

---

## Standard Stack

No new packages. This is a two-file logic fix using the existing stack.

### No Installation Required

All code changes are within existing files using existing patterns:
- Tauri plugin-sql parameterized queries (`$1, $2` positional syntax) — already in use [ASSUMED]
- TypeScript strict null checks — already enforced by `noUnusedLocals` / strict mode
- Vitest + React Testing Library — already present for test updates

---

## Package Legitimacy Audit

> Not applicable — Phase 115 installs no new packages.

---

## Architecture Patterns

### System Architecture Diagram

```
Sub-faction selected in UI
         |
         +--- Database Browser (SUB-01)
         |         |
         |    applyUdbFilters(units, { subFactionFilter })
         |         |
         |    [FIX] unit.sub_faction === filterValue
         |         OR unit.sub_faction === null  <-- add this
         |         --> include unit
         |
         +--- Army List Picker (SUB-02)
         |         |
         +--- Collection Browser (SUB-03)
                   |
              useUdbSubFactionUnitIds(factionId, subFaction)
                   |
              getUdbUnitIdsBySubFaction()
                   |
              [FIX] WHERE faction_id = $1
                    AND (sub_faction = $2 OR sub_faction IS NULL)
                   |
              returns Set<udb_unit_id>
                   |
              component filters collection units:
              u.udb_unit_id != null && subFactionIdSet.has(u.udb_unit_id)
```

### Recommended Project Structure

No structural changes. All edits are within existing files:

```
src/
  db/queries/unitDatabase.ts          -- SQL fix (getUdbUnitIdsBySubFaction)
  features/unit-database/
    applyUdbFilters.ts                -- Client-side filter fix

tests/
  unit-database/
    applyUdbFilters.test.ts           -- Update 2 tests + add 1 new test
```

### Pattern 1: SQLite nullable column OR pattern

**What:** When a column value of NULL means "applies to all", the correct filter pattern is `(col = $param OR col IS NULL)` rather than `col = $param`.

**When to use:** Whenever a nullable column encodes "specific" vs. "generic/inherited" membership semantics.

**Example:**
```sql
-- Before (broken — excludes generic units)
SELECT id FROM udb_units
WHERE faction_id = $1 AND sub_faction = $2

-- After (correct — includes generic units)
SELECT id FROM udb_units
WHERE faction_id = $1 AND (sub_faction = $2 OR sub_faction IS NULL)
```

Source: D-02 in CONTEXT.md — confirmed against actual query at `src/db/queries/unitDatabase.ts` line 384. [ASSUMED: SQL semantics are standard SQL, not library-specific]

### Pattern 2: Client-side null pass-through filter

**What:** When filtering by a nullable property where null means "applies to all", the condition must explicitly pass-through null values.

**When to use:** Any client-side filter over a nullable field with "generic" semantics.

**Example:**
```typescript
// Before (broken — excludes null sub_faction units when filter active)
if (filters.subFactionFilter !== null && unit.sub_faction !== filters.subFactionFilter) {
  return false;
}

// After (correct — null sub_faction always passes through when filter active)
if (
  filters.subFactionFilter !== null &&
  unit.sub_faction !== filters.subFactionFilter &&
  unit.sub_faction !== null
) {
  return false;
}
```

Source: D-03 in CONTEXT.md — confirmed against `src/features/unit-database/applyUdbFilters.ts` line 28. [ASSUMED: TypeScript semantics]

### Anti-Patterns to Avoid

- **Changing the hook signature:** `useUdbSubFactionUnitIds` does not need changes — the fix is in the query it calls. Adding parameters to the hook would break two consumers for no reason.
- **Adding visual distinction UI:** D-04 explicitly defers this. Do not add badges or labels separating generic vs. sub-faction-specific units.
- **Changing filter stores:** Both Zustand stores (`databaseBrowserFilters.ts`, `collectionFilters.ts`) already reset `subFactionFilter` to null on faction change. No changes needed.
- **Modifying `getDistinctSubFactions`:** This query returns the dropdown options and is correct as-is. Touching it risks breaking the sub-faction selector.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| "OR IS NULL" SQL pattern | Custom post-query null merging | SQL `(col = $1 OR col IS NULL)` clause | Single-pass, database-level, no extra roundtrip |
| Null pass-through in filter | Separate "generic units" fetch and merge | Modify the condition in-place | Simpler, maintains AND logic with other filters |

**Key insight:** Both fixes are one-line additions. Any approach requiring a second query, a merge step, or a new data structure is over-engineering.

---

## Common Pitfalls

### Pitfall 1: Forgetting that SUB-02 and SUB-03 share the same query

**What goes wrong:** Developer fixes only one of `UnitPickerDialog.tsx` or `CollectionPage.tsx`, missing that both consume the same `useUdbSubFactionUnitIds` → `getUdbUnitIdsBySubFaction` path.

**Why it happens:** The components look different; it's not obvious they share the same data path.

**How to avoid:** Fix is in `unitDatabase.ts` query, not in either component. One SQL change fixes both SUB-02 and SUB-03 simultaneously.

**Warning signs:** If tests for only one component are updated, the other surface is probably untested.

### Pitfall 2: Existing tests encode the wrong behavior

**What goes wrong:** `tests/unit-database/applyUdbFilters.test.ts` has two tests that assert the *broken* behavior — they expect `sub_faction IS NULL` units to be *excluded* when a sub-faction filter is active.

**Specific tests to update:**
- Line 115: `"subFactionFilter excludes units with null sub_faction"` — this test name and expectation both encode the bug. After the fix, applying `subFactionFilter: "Dark Angels"` should return both `"Mystery Unit"` (sub_faction: "Dark Angels") AND `"Captain"` and `"Repulsor"` (sub_faction: null), not just the Dark Angels unit.
- Line 126: `"AND logic with subFactionFilter and roleFilter"` — currently expects 2 results (Ultramarines Battleline only). After fix, expects 3 results (Ultramarines Battleline + generic Battleline units... but there are no generic Battleline units in the fixture, so this test may still pass as-is; verify against fixtures).

**How to avoid:** Read the existing test file carefully before writing the plan. Update test descriptions and expectations to match the new semantics.

**Warning signs:** Running `pnpm test -- tests/unit-database/applyUdbFilters.test.ts` after fixing `applyUdbFilters.ts` will fail if tests are not updated.

### Pitfall 3: `subFactionIdSet.size > 0` guard in components

**What goes wrong:** Both `UnitPickerDialog.tsx` (line 93) and `CollectionPage.tsx` (line 84) guard the sub-faction filter with `subFactionIdSet.size > 0`. After the SQL fix, the set will include generic `sub_faction IS NULL` units, so `size` will always be > 0 for factions that have generic units. This is correct behavior — the guard was there to prevent empty-set filtering from showing no units, and the fix makes the set non-empty as expected.

**Why it happens:** The guard logic doesn't change, but it's worth verifying the guard still makes semantic sense after the fix.

**How to avoid:** No component changes needed — the guard behavior is unchanged and correct.

**Warning signs:** If the guard is removed thinking it's unnecessary, the filter will apply even when `subFactionUnitIds` is still loading (undefined), potentially hiding units briefly.

### Pitfall 4: Test fixture gap for the AND-logic test

**What goes wrong:** The existing AND-logic test (`subFactionFilter: "Ultramarines", roleFilter: "Battleline"`) expects 2 results. After the fix, it should also include generic Battleline units. But in the current fixture, generic units (`sub_faction: null`) have roles "Character" and "Transport" — no generic Battleline exists. So the test assertion of 2 results remains correct after the fix.

**How to avoid:** Trace the fixture data carefully before updating assertions. The AND-logic test does NOT need its count changed. A new test should use a fixture that has a generic Battleline unit to explicitly test the combined case.

---

## Code Examples

### Fix 1: SQL query in `getUdbUnitIdsBySubFaction`

```typescript
// src/db/queries/unitDatabase.ts — line ~384
// Before:
`SELECT id FROM udb_units WHERE faction_id = $1 AND sub_faction = $2`

// After:
`SELECT id FROM udb_units WHERE faction_id = $1 AND (sub_faction = $2 OR sub_faction IS NULL)`
```

### Fix 2: Client-side filter in `applyUdbFilters`

```typescript
// src/features/unit-database/applyUdbFilters.ts — line 28
// Before:
if (filters.subFactionFilter !== null && unit.sub_faction !== filters.subFactionFilter) {
  return false;
}

// After:
if (
  filters.subFactionFilter !== null &&
  unit.sub_faction !== filters.subFactionFilter &&
  unit.sub_faction !== null
) {
  return false;
}
```

### Fix 3: Updated test expectations + new test in `applyUdbFilters.test.ts`

The existing fixtures already have what we need:
- `u1`: sub_faction "Ultramarines", role "Battleline"
- `u2`: sub_faction null, role "Character"
- `u3`: sub_faction "Ultramarines", role "Battleline"
- `u4`: sub_faction null, role "Transport"
- `u5`: sub_faction "Dark Angels", role "Epic Hero"

```typescript
// UPDATE: test "subFactionFilter excludes units with null sub_faction" (line 115)
// New name: "subFactionFilter includes null sub_faction (generic) units"
it("subFactionFilter includes null sub_faction (generic) units", () => {
  const result = applyUdbFilters(UNITS, { ...NO_FILTER, subFactionFilter: "Dark Angels" });
  // Should include: u5 (Dark Angels), u2 (generic/null), u4 (generic/null)
  expect(result).toHaveLength(3);
  expect(result.map((u) => u.name)).toEqual(["Captain", "Repulsor", "Mystery Unit"]);
});

// UPDATE: test "filters by subFactionFilter" (line 109)
// New expectation: includes u2 and u4 (generic) as well as Ultramarines-specific
it("filters by subFactionFilter", () => {
  const result = applyUdbFilters(UNITS, { ...NO_FILTER, subFactionFilter: "Ultramarines" });
  // Should include: u1, u3 (Ultramarines), u2, u4 (generic/null)
  expect(result).toHaveLength(4);
  expect(result.map((u) => u.name)).toEqual(["Intercessors", "Captain", "Eradicators", "Repulsor"]);
});

// ADD: explicit regression test for the fixed behavior
it("subFactionFilter with generic units: includes sub-faction-specific AND null sub_faction", () => {
  const result = applyUdbFilters(UNITS, { ...NO_FILTER, subFactionFilter: "Ultramarines" });
  const names = result.map((u) => u.name);
  // Sub-faction specific
  expect(names).toContain("Intercessors");
  expect(names).toContain("Eradicators");
  // Generic parent faction (sub_faction === null)
  expect(names).toContain("Captain");
  expect(names).toContain("Repulsor");
  // Other sub-faction excluded
  expect(names).not.toContain("Mystery Unit");
});
```

Note: The AND-logic test at line 126 (`subFactionFilter: "Ultramarines", roleFilter: "Battleline"`) currently expects 2 results. After the fix it should still be 2 — there are no generic Battleline units in the fixture. Add a comment explaining this, but the count assertion is still correct.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Exact-match sub-faction filter | OR-with-null sub-faction filter | Phase 115 | Players see generic units alongside sub-faction-specific ones |

**Deprecated/outdated behavior:**
- `WHERE sub_faction = $2` (exact match only): replaced by `(sub_faction = $2 OR sub_faction IS NULL)`
- `unit.sub_faction !== filters.subFactionFilter` (no null pass-through): replaced by adding `&& unit.sub_faction !== null`

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | SQL `(col = $1 OR col IS NULL)` is valid Tauri plugin-sql parameterized syntax | Code Examples | Low — standard SQL; plugin accepts standard SQLite syntax |
| A2 | AND-logic test (line 126) still expects 2 results after fix (no generic Battleline in fixture) | Pitfall 4 / Code Examples | Low — fixture is in the test file and can be read directly |

---

## Open Questions

None — the CONTEXT.md decisions are fully specified and the code is confirmed in-place.

---

## Environment Availability

> Step 2.6: SKIPPED — Phase 115 is a code-only fix with no external dependencies beyond the existing Vitest test runner.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Vitest | Test validation | ✓ | 4.x (per CLAUDE.md) | — |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vite.config.ts` (vitest inline config) |
| Quick run command | `pnpm test -- tests/unit-database/applyUdbFilters.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SUB-01 | `applyUdbFilters` with sub-faction filter includes null sub_faction units | unit | `pnpm test -- tests/unit-database/applyUdbFilters.test.ts` | ✅ (needs update) |
| SUB-02 | `getUdbUnitIdsBySubFaction` returns IDs for sub_faction-specific AND null sub_faction units | unit (DB mock) | `pnpm test -- tests/unit-database/` | ❌ Wave 0 gap |
| SUB-03 | Collection browser sub-faction filter includes generic units | unit | same as SUB-02 (shares query) | ❌ Wave 0 gap |

### Sampling Rate

- **Per task commit:** `pnpm test -- tests/unit-database/applyUdbFilters.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [x] `tests/unit-database/applyUdbFilters.test.ts` — EXISTS but 2 tests encode old (broken) behavior and must be updated. No new file needed — update in place.
- [ ] SQL query test for `getUdbUnitIdsBySubFaction` — no dedicated test file exists. Claude's discretion (from CONTEXT.md) whether to add one. Given the query is a single SQL line with well-understood behavior, the planner may treat it as covered by integration/smoke testing rather than unit test.

*(The existing `applyUdbFilters.test.ts` covers SUB-01 after update. SUB-02/SUB-03 share the SQL query — testing the query directly requires mocking the Tauri DB bridge, which is feasible but is Claude's discretion per CONTEXT.md.)*

---

## Security Domain

> Not applicable — Phase 115 makes no changes to authentication, session management, access control, input validation, or cryptography. The SQL change uses the existing parameterized query pattern with no new user-supplied inputs.

---

## Sources

### Primary (HIGH confidence)
- Direct code read: `src/db/queries/unitDatabase.ts` lines 361–388 — confirmed exact current SQL query
- Direct code read: `src/features/unit-database/applyUdbFilters.ts` lines 1–58 — confirmed exact current filter condition
- Direct code read: `src/features/army-lists/UnitPickerDialog.tsx` lines 75–95 — confirmed consumer pattern
- Direct code read: `src/features/units/CollectionPage.tsx` lines 52–88 — confirmed consumer pattern
- Direct code read: `src/hooks/useUnitDatabase.ts` lines 177–197 — confirmed hook wrapping (no change needed)
- Direct code read: `tests/unit-database/applyUdbFilters.test.ts` — confirmed existing tests encode old behavior
- Direct read: `.planning/phases/115-sub-faction-filter-fix/115-CONTEXT.md` — locked decisions D-01 through D-05

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` SUB-01/SUB-02/SUB-03 — confirmed requirement text

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, all existing patterns confirmed by code read
- Architecture: HIGH — exact files, line numbers, and change sites confirmed by code read
- Pitfalls: HIGH — test failure scenario confirmed by reading the test file directly
- Test update plan: HIGH — fixture data verified, expected new counts derivable from fixtures

**Research date:** 2026-06-03
**Valid until:** Indefinite — no external dependencies, all findings based on in-repo code
