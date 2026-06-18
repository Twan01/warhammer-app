# Phase 140: Close PLAY-02/03 Tail — Rules Hub Leader Display - Research

**Researched:** 2026-06-18
**Domain:** React Query hook swap + SQL query addition + dead-code removal + data-layer test
**Confidence:** HIGH — all claims verified directly against live source files

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** New faction-scoped query function lives in `src/db/queries/leaderTargets.ts` (canonical module), not extended into `bsdataExtended.ts`.
- **D-02:** SQL joins `udb_leader_targets` to `udb_units` twice; filters on `leader_u.faction_id = $1`; `$1` positional bind; `ORDER BY leader_name, target_name`.
- **D-03:** After repoint, remove `getLeaderTargetsByFaction` + `SyncedLeaderTargetRow` from `bsdataExtended.ts` and `useLeaderTargetsByFaction` + `LEADER_TARGETS_KEY` from `useBsdataFaction.ts`.
- **D-04:** Return row shape is `{ leader_name: string; faction_id: string | null; target_name: string }` — identical to old `SyncedLeaderTargetRow` — so `DatasheetPointsTab`'s body (filter + badge render) stays unchanged.
- **D-05:** New hook goes in `src/hooks/useLeaderTargets.ts`; `staleTime: Infinity` / `gcTime: Infinity`; `enabled` guarded on `factionId`.
- **D-06:** Data-layer test in `tests/data-layer/`, node env, full migration chain, `PRAGMA foreign_keys = ON`. Mirror `tests/data-layer/leader-targets.test.ts`.

### Claude's Discretion

- Exact names for new function/hook/type (must read as canonical, not "synced").
- Optional `DatasheetPointsTab` render test (data-layer test is Nyquist-critical).

### Deferred Ideas (OUT OF SCOPE)

- DROP `synced_leader_targets` table (migration 051).
- Broader dead-query sweep of other `synced_*` tables in `bsdataExtended.ts`.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLAY-02 | `udb_leader_targets` table populated from Wahapedia pipeline. Already satisfied (Phase 137). This phase completes the secondary display surface. | Schema verified: `leader_unit_id TEXT`, `target_unit_id TEXT`, both FK → `udb_units(id)` ON DELETE CASCADE, composite PK. |
| PLAY-03 | Leader attachment validates against canonical targets. Already satisfied in army-list builder (Phase 137). This phase extends coverage to the Rules Hub read-only display. | `udb_units.faction_id TEXT NOT NULL` confirmed — faction-scoped JOIN compiles cleanly. |
</phase_requirements>

---

## Summary

Phase 140 is a narrow mechanical closure of the one integration warning from the v0.6.0 milestone audit. The `DatasheetPointsTab` component's "Leader — Can attach to" section queries the dead `synced_leader_targets` table (no writer in the Wahapedia-only pipeline) and therefore always renders empty. The fix is: add one faction-scoped query to the canonical module, add one hook, swap one call site, remove three dead symbols, prove correctness with a data-layer test.

All five source files involved have been read and verified. The schema is confirmed. The dead-symbol blast radius is confirmed as exactly one component (no other live callers). The test harness pattern is confirmed and ready to mirror. No surprises, no landmines.

**Primary recommendation:** Implement in one wave: query + hook (leaderTargets.ts + useLeaderTargets.ts) → repoint DatasheetPointsTab → remove dead symbols from bsdataExtended.ts + useBsdataFaction.ts → data-layer test.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Faction-scoped leader-target pairs query | Database / Storage | — | Pure read from `udb_leader_targets` JOIN `udb_units`; no business logic needed |
| Hook wrapping the query | Frontend (React Query) | — | Canonical data hook pattern; staleTime Infinity since data is immutable between imports |
| Leader section display | UI component | — | `DatasheetPointsTab` renders badge list; body unchanged (filter + map stays identical) |
| Dead-symbol removal | Cross-cutting | — | Both query module and hook module touched; strict TS will fail build if any stale import remains |

---

## Verified Facts (Code Inspection)

### 1. Column Names Confirmed [VERIFIED: live source]

**`udb_leader_targets`** (migration 050):
```sql
leader_unit_id  TEXT NOT NULL REFERENCES udb_units(id) ON DELETE CASCADE
target_unit_id  TEXT NOT NULL REFERENCES udb_units(id) ON DELETE CASCADE
PRIMARY KEY (leader_unit_id, target_unit_id)
```

**`udb_units`** (migration 038):
```sql
id          TEXT PRIMARY KEY
faction_id  TEXT NOT NULL REFERENCES udb_factions(id)
name        TEXT NOT NULL
```
`faction_id` is `TEXT NOT NULL` — this is exactly the column `getUdbPointsByFaction` already filters on (`WHERE u.faction_id = $1`). The proposed JOIN compiles without casting.

**DISTINCT analysis:** The composite PK on `udb_leader_targets(leader_unit_id, target_unit_id)` already enforces uniqueness. The double-JOIN to `udb_units` for names is one-to-one (each `udb_units.id` has exactly one `name`). `DISTINCT` is not needed; the query in D-02 returns unique rows by construction. The existing `getLeaderTargetsForList` in Phase 137 uses `SELECT DISTINCT` as a safety guard for the army-list path (where the outer list join could duplicate) — the faction path has no such duplication risk.

### 2. Exact Dead Symbol Locations [VERIFIED: live source]

**`src/db/queries/bsdataExtended.ts`** lines 159–176:
```ts
export interface SyncedLeaderTargetRow { ... }        // line 159
export async function getLeaderTargetsByFaction(...) { // line 165
  ...FROM synced_leader_targets WHERE faction_id = $1  // line 171
}
```

**`src/hooks/useBsdataFaction.ts`** — entire file is three hooks; only `useLeaderTargetsByFaction` and its `LEADER_TARGETS_KEY` are dead after the repoint. `useModelCountsByFaction` and `useLoadoutOptionsByFaction` remain live (still consumed by `DatasheetPointsTab`).

**Important:** `LEADER_TARGETS_KEY` is exported from BOTH `useBsdataFaction.ts` AND `useLeaderTargets.ts` — they have different signatures:
- `useBsdataFaction.ts`: `LEADER_TARGETS_KEY = (factionId: string) => ["leader-targets-by-faction", factionId]`
- `useLeaderTargets.ts`: `LEADER_TARGETS_KEY = (listId: number) => ["leader-targets", listId]`

These are distinct exports on distinct key namespaces. Removing the faction-scoped one from `useBsdataFaction.ts` does not affect the list-scoped one in `useLeaderTargets.ts` or its test usage.

### 3. Dead-Symbol Blast Radius [VERIFIED: grep all of src/ + tests/]

Consumers of `useLeaderTargetsByFaction` / `getLeaderTargetsByFaction` / `SyncedLeaderTargetRow`:

| Symbol | File | Role | Action |
|--------|------|------|--------|
| `useLeaderTargetsByFaction` | `src/features/rules-hub/DatasheetPointsTab.tsx` line 7, 362 | Live consumer | Swap to new canonical hook |
| `SyncedLeaderTargetRow` (type) | `src/features/rules-hub/DatasheetPointsTab.tsx` lines 14, 79, 120 | Type annotations on props | Replace with new canonical type |
| `getLeaderTargetsByFaction` | `tests/army-list/ArmyListsPage.test.tsx` line 66 | **Mock stub only** (vi.mock body) | **Must update** — remove from mock object after removal from bsdataExtended |
| `useLeaderTargetsByFaction` | `src/hooks/useBsdataFaction.ts` | Definition | Remove |
| `LEADER_TARGETS_KEY` (faction-scoped) | `src/hooks/useBsdataFaction.ts` | Definition | Remove |
| `getLeaderTargetsByFaction` | `src/db/queries/bsdataExtended.ts` | Definition | Remove |
| `SyncedLeaderTargetRow` | `src/db/queries/bsdataExtended.ts` | Definition | Remove |

**Critical landmine:** `tests/army-list/ArmyListsPage.test.tsx` line 66 mocks `@/db/queries/bsdataExtended` and includes `getLeaderTargetsByFaction: vi.fn().mockResolvedValue([])` in the mock factory. When `getLeaderTargetsByFaction` is removed from the real module, this mock entry becomes a stale key. With strict TypeScript this does NOT cause a build failure (vi.mock factories are not type-checked against the module signature at compile time), and Vitest itself will not error on extra keys in a mock factory. However, leaving it in is misleading. The executor should clean it from the mock object.

**No other consumers found.** PlaybookTab, Game Day, army-list builder, and all other features do not reference these dead symbols.

### 4. Other UI Surfaces Still Reading synced_leader_targets [VERIFIED: grep]

`synced_leader_targets` appears in exactly two places:
- `src-tauri/migrations/030_bsdata_extended.sql` — DDL (CREATE TABLE)
- `src/db/queries/bsdataExtended.ts` line 171 — the dead query being removed

No other component reads this table. After this phase, `synced_leader_targets` has zero readers and zero writers — it is a dead table (out of scope to drop, per deferred ideas).

### 5. DatasheetPointsTab Call Site [VERIFIED: live source]

The component at line 362:
```ts
const { data: leaderTargets = [] } = useLeaderTargetsByFaction(factionId);
```
`factionId` is `string` (not `string | undefined`) — it is the required prop of `DatasheetPointsTab({ factionId }: { factionId: string })`. The new canonical hook must accept `string | undefined` (consistent with all other faction hooks in this file) but can be safely called with the always-defined `factionId` prop.

Props flow: `leaderTargets` array is passed down to `DatasheetDetail` and `DatasheetContent` both typed as `SyncedLeaderTargetRow[]`. After the type swap to the new canonical type (same shape), these props compile without touching the JSX.

---

## Standard Stack

No new packages. All work is in existing modules using existing dependencies.

| Concern | Solution | Source |
|---------|----------|--------|
| DB query | `better-sqlite3` via Tauri plugin-sql (existing) | Live code |
| Hook layer | `@tanstack/react-query` `useQuery` (existing) | Live code |
| Test harness | `better-sqlite3` + Vitest node env (existing) | `tests/data-layer/leader-targets.test.ts` |

---

## Package Legitimacy Audit

Not applicable — no new packages installed in this phase.

---

## Architecture Patterns

### The New Query (D-02 verbatim)

```sql
-- src/db/queries/leaderTargets.ts — add below getLeaderTargetsForList
SELECT leader_u.name AS leader_name, leader_u.faction_id, target_u.name AS target_name
FROM udb_leader_targets lt
JOIN udb_units leader_u ON leader_u.id = lt.leader_unit_id
JOIN udb_units target_u ON target_u.id = lt.target_unit_id
WHERE leader_u.faction_id = $1
ORDER BY leader_name, target_name
```

DISTINCT is not required (composite PK on `udb_leader_targets` already prevents duplicates; the double-join to `udb_units` for name lookups is 1:1).

### The New Canonical Type (D-04)

Shape is identical to `SyncedLeaderTargetRow` — define it canonically in `leaderTargets.ts`:
```ts
export interface CanonicalLeaderTargetRow {
  leader_name: string;
  faction_id: string | null;
  target_name: string;
}
```
This allows a mechanical find-replace of the type annotation in `DatasheetPointsTab` with zero JSX changes.

### The New Hook (D-05)

Pattern mirrors existing hooks in `useBsdataFaction.ts` and `usePointTiers` in `DatasheetPointsTab`:
```ts
// Add to src/hooks/useLeaderTargets.ts
export const LEADER_TARGETS_BY_FACTION_KEY = (factionId: string) =>
  ["leader-targets-by-faction-canonical", factionId] as const;

export function useLeaderTargetsByFactionCanonical(factionId: string | undefined) {
  return useQuery<CanonicalLeaderTargetRow[]>({
    queryKey: factionId !== undefined
      ? LEADER_TARGETS_BY_FACTION_KEY(factionId)
      : (["leader-targets-by-faction-canonical"] as const),
    queryFn: () => getLeaderTargetsByFactionCanonical(factionId!),
    enabled: factionId !== undefined,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
```

Note on key naming: use a distinct key namespace from the old `"leader-targets-by-faction"` to avoid any React Query cache collision if both existed transiently. After dead-code removal, the old key is gone, but distinct naming is cheaper insurance than a shared namespace.

### Recommended Change Sequence

```
Wave 1 (all in one commit is fine — narrow scope):
  1. src/db/queries/leaderTargets.ts     — add getLeaderTargetsByFactionCanonical + CanonicalLeaderTargetRow
  2. src/hooks/useLeaderTargets.ts       — add useLeaderTargetsByFactionCanonical
  3. src/features/rules-hub/DatasheetPointsTab.tsx
       — swap import: useLeaderTargetsByFaction → useLeaderTargetsByFactionCanonical
       — swap import: SyncedLeaderTargetRow    → CanonicalLeaderTargetRow
       — swap call:   useLeaderTargetsByFaction(factionId) → useLeaderTargetsByFactionCanonical(factionId)
  4. src/db/queries/bsdataExtended.ts    — remove SyncedLeaderTargetRow + getLeaderTargetsByFaction
  5. src/hooks/useBsdataFaction.ts       — remove useLeaderTargetsByFaction + faction LEADER_TARGETS_KEY
  6. tests/army-list/ArmyListsPage.test.tsx — remove getLeaderTargetsByFaction key from vi.mock factory
  7. tests/data-layer/leaderTargetsByFaction.test.ts  — new file (see below)
```

Steps 4 + 5 + 6 must follow step 3; they can be in the same commit. Strict TypeScript (`noUnusedLocals`) will catch any stale import left in `DatasheetPointsTab` after the swap.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| DB connection in test | Custom SQLite setup | `createFullDb()` pattern from `leader-targets.test.ts` (reads all migrations from `src-tauri/migrations/`, applies in numeric order) |
| Deduplication of leader-target pairs | Manual DISTINCT or client-side dedup | Composite PK already enforces uniqueness at DB level |

---

## Common Pitfalls

### Pitfall 1: Forgetting the test mock cleanup
**What goes wrong:** `tests/army-list/ArmyListsPage.test.tsx` has `getLeaderTargetsByFaction: vi.fn().mockResolvedValue([])` inside `vi.mock("@/db/queries/bsdataExtended", ...)`. Removing the export from `bsdataExtended.ts` does not cause a TypeScript error on the mock (vi.mock factories are untyped objects). Tests pass. But the stale key is misleading and should be removed.
**How to avoid:** After removing the export, delete the key from the mock factory in that test file. `pnpm test` will confirm nothing broke.

### Pitfall 2: Leaving a stale import in DatasheetPointsTab
**What goes wrong:** `noUnusedLocals` / `noUnusedParameters` in strict TypeScript causes `pnpm build` to fail if `SyncedLeaderTargetRow` or `useLeaderTargetsByFaction` remain imported but no longer used.
**How to avoid:** The type appears three times (`import`, `DatasheetDetail` prop type, `DatasheetContent` prop type) — all three must be swapped. The grep above identified all three locations.

### Pitfall 3: Key namespace collision
**What goes wrong:** Reusing the exact key `["leader-targets-by-faction", factionId]` for the new canonical hook would share cache with the old dead hook if React Query still had stale cache entries. In practice, once the old hook is removed, no entries are written under that key — but naming the new key differently costs nothing and eliminates the ambiguity.
**How to avoid:** Use a distinct key such as `"leader-targets-by-faction-canonical"` or simply `"udb-leader-targets-by-faction"`.

### Pitfall 4: Removing useModelCountsByFaction or useLoadoutOptionsByFaction
**What goes wrong:** Both of those live hooks remain in `useBsdataFaction.ts` and are still consumed by `DatasheetPointsTab`. Only `useLeaderTargetsByFaction` and its `LEADER_TARGETS_KEY` are dead.
**How to avoid:** Surgical removal — only lines 30–31 (LEADER_TARGETS_KEY) and lines 61–71 (useLeaderTargetsByFaction) in `useBsdataFaction.ts`, and the `getLeaderTargetsByFaction` import on line 17. Leave everything else.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + better-sqlite3 (node environment) |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `pnpm test -- tests/data-layer/leaderTargetsByFaction.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLAY-02/03 (secondary) | Faction-scoped query returns correct leader→target pairs from udb_leader_targets | data-layer (node, in-memory SQLite) | `pnpm test -- tests/data-layer/leaderTargetsByFaction.test.ts` | No — Wave 0 gap |

### New Test File: `tests/data-layer/leaderTargetsByFaction.test.ts`

Mirror `tests/data-layer/leader-targets.test.ts` exactly for the harness. Add these specific assertions:

**Seed data required:**
- 1 `udb_factions` row: `{ id: 'FA', name: 'Faction A' }`
- 1 `udb_factions` row: `{ id: 'FB', name: 'Faction B' }` (cross-faction exclusion check)
- `udb_units`: leader A (`id: 'LA', faction_id: 'FA', name: 'Leader A'`)
- `udb_units`: target A1 (`id: 'TA1', faction_id: 'FA', name: 'Target A1'`)
- `udb_units`: target A2 (`id: 'TA2', faction_id: 'FA', name: 'Target A2'`)
- `udb_units`: leader B (`id: 'LB', faction_id: 'FB', name: 'Leader B'`) — different faction
- `udb_units`: target B1 (`id: 'TB1', faction_id: 'FB', name: 'Target B1'`) — different faction
- `udb_leader_targets`: (LA → TA1), (LA → TA2), (LB → TB1)

**Test cases:**

1. **Returns correct pairs for faction FA** — query with `$1 = 'FA'` returns exactly `[{ leader_name: 'Leader A', faction_id: 'FA', target_name: 'Target A1' }, { leader_name: 'Leader A', faction_id: 'FA', target_name: 'Target A2' }]` (ordered by leader_name, target_name).

2. **Excludes other factions** — query with `$1 = 'FA'` returns 0 rows with `leader_name = 'Leader B'` or `target_name = 'Target B1'`.

3. **Returns empty array for unknown faction** — query with `$1 = 'UNKNOWN'` returns `[]` (not an error).

**Seeding pattern** (from existing test — FK OFF during seed, FK ON for query):
```ts
db.pragma("foreign_keys = OFF");
// insert udb_factions, udb_units, udb_leader_targets rows
db.pragma("foreign_keys = ON");
// run the faction-scoped query, assert results
```

Since `getLeaderTargetsByFactionCanonical` uses the Tauri `getDb()` async API (not better-sqlite3 directly), the test must call the raw SQL via better-sqlite3's synchronous `db.prepare(...).all(...)` or replicate the query inline — matching the pattern used in the existing `leader-targets.test.ts` which does the same (tests the schema behavior, not the JS function wrapper, since the Tauri bridge is unavailable in node env).

### Sampling Rate

- **Per commit:** `pnpm test -- tests/data-layer/leaderTargetsByFaction.test.ts` (< 5 seconds)
- **Phase gate:** `pnpm test && pnpm build` — full suite green + TypeScript clean before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/data-layer/leaderTargetsByFaction.test.ts` — new file, covers the faction-scoped query behavior

---

## Security Domain

This phase adds a parameterized read-only query (`$1` positional bind). No new write path, no user-controlled data surfaces, no auth changes. ASVS V5 (Input Validation) is satisfied by the positional bind — no string interpolation.

---

## Open Questions

None. All critical verification questions answered from live source files.

---

## Sources

### Primary (HIGH confidence — all verified against live source files)

- `src/features/rules-hub/DatasheetPointsTab.tsx` — confirmed call site, type usage, prop flow
- `src/db/queries/bsdataExtended.ts` lines 159–176 — confirmed dead symbol locations and shapes
- `src/db/queries/leaderTargets.ts` — confirmed canonical module location and double-join idiom
- `src/hooks/useLeaderTargets.ts` — confirmed canonical hook module
- `src/hooks/useBsdataFaction.ts` — confirmed dead hook + KEY locations; confirmed live hooks to preserve
- `src-tauri/migrations/050_udb_leader_targets.sql` — confirmed schema (column names, PK, FK)
- `src-tauri/migrations/038_udb_schema.sql` — confirmed `udb_units` column names including `faction_id TEXT NOT NULL`
- `tests/data-layer/leader-targets.test.ts` — confirmed test harness pattern (createFullDb, pragmas, seed approach)
- `tests/army-list/ArmyListsPage.test.tsx` lines 64–67 — confirmed stale mock key to clean up
- Grep: `useLeaderTargetsByFaction|getLeaderTargetsByFaction|SyncedLeaderTargetRow|LEADER_TARGETS_KEY` across all `src/` and `tests/` — confirmed complete blast radius

---

## Metadata

**Confidence breakdown:**
- SQL schema: HIGH — read directly from migration files
- Dead-symbol blast radius: HIGH — grep exhaustive across src + tests
- Test harness: HIGH — read existing test file and confirmed pattern
- Landmine (test mock): HIGH — identified specific file + line

**Research date:** 2026-06-18
**Valid until:** Indefinite (codebase is stable; no fast-moving dependencies)
