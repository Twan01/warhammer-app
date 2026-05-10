# Phase 52: Schema + Data Layer Foundation - Research

**Researched:** 2026-05-10
**Domain:** SQLite migrations (Tauri plugin-sql), TypeScript types, React Query hooks, dual-DB architecture
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Rule identification pattern**
- Composite UNIQUE(rule_id, rule_type) as the natural key for both rules_favorites and rules_notes
- rule_name TEXT NOT NULL stored as denormalized copy — survives rules.db re-sync, enables display without cross-DB join
- CHECK constraint on rule_type: IN ('stratagem', 'detachment_ability', 'shared_ability') — enforces valid types at DB level
- rule_id is the Wahapedia string ID from the corresponding rw_* table

**Favorites/notes mutation behavior**
- Optimistic toggle for favorites star — instant UI feedback with rollback on error (matches existing mutation patterns)
- upsertRulesFavorite uses INSERT OR REPLACE on composite key (rule_id, rule_type) — single function for toggle on/off
- upsertRulesNote uses INSERT OR REPLACE on composite key (rule_id, rule_type) — single function, simpler than separate create/update
- deleteRulesFavorite for explicit unfavorite (removes row entirely rather than setting a flag)
- is_reminder INTEGER DEFAULT 0 — separate from favorite status, toggleable independently

**Detachment linkage on army_lists**
- detachment_id TEXT NULL — references the Wahapedia detachment string ID from rw_detachments
- detachment_name TEXT NULL — denormalized copy that survives rules.db re-sync (consistent with weapon_name TEXT copy pattern in unit_loadout_wargear)
- Both columns nullable — army lists without detachment selection remain valid
- No FK constraint to rules.db (cross-DB FK not supported) — application-level reference

**Query module organization**
- getDetachmentById and getStratagemsByDetachment added to existing rulesExtended.ts (reads from rules.db)
- New rulesFavorites.ts in src/db/queries/ for favorites CRUD (reads/writes hobbyforge.db)
- New rulesNotes.ts in src/db/queries/ for notes CRUD (reads/writes hobbyforge.db)
- Army list detachment columns handled via existing armyLists.ts updates

**Cache invalidation strategy**
- Favorites and notes hooks do NOT invalidate on rules sync — they live in hobbyforge.db, not rules.db
- New rules.db query hooks (useDetachmentById, useStratagemsByDetachment) use staleTime: Infinity and register in useRulesSync.onSuccess for invalidation
- Favorites mutations invalidate RULES_FAVORITES_KEY; notes mutations invalidate RULES_NOTES_KEY
- Army list mutations already invalidate ARMY_LISTS_KEY — detachment columns picked up automatically

**Points import design doc**
- Full design document at .planning/points-import-design.md per success criteria
- Covers: schema design, versioning strategy, delta computation, manual override interaction, army list impact
- Design only — implementation deferred to future milestone (PTS-01 through PTS-04)

### Claude's Discretion
- Exact column ordering in migration 019
- Whether rules_favorites and rules_notes use INTEGER PRIMARY KEY AUTOINCREMENT or composite PK
- Hook file naming (useRulesFavorites.ts vs useRulesFavorite.ts)
- Points design doc internal structure and section ordering

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ARMY-06 | Points import design is documented (schema, versioning, deltas, manual override, army list impact) | Points import design doc pattern established; existing unit_overrides and effective_points COALESCE logic in armyLists.ts provides the manual override interaction model to document |
</phase_requirements>

## Summary

Phase 52 is a pure infrastructure and documentation phase: write one new SQL migration (019), add two new query modules, extend one existing query module and one existing armyLists.ts module, add new React Query hook files, extend the ArmyList TypeScript type, and produce a design document. No UI changes. No new Rust code.

The codebase has a well-worn dual-DB pattern (hobbyforge.db for user data, rules.db for Wahapedia data) that all new code must follow strictly. The migration is the highest-risk deliverable: SQL runs once at app start and cannot be edited. Everything else — types, queries, hooks, design doc — is additive to existing patterns with zero deviation needed.

The most important architectural constraint is the rules.db wipe-on-sync cycle: any user data (favorites, notes, detachment selection) placed in rules.db would be destroyed on every sync. All three new user-data constructs (rules_favorites, rules_notes, army_lists.detachment_id/detachment_name) correctly land in hobbyforge.db.

**Primary recommendation:** Follow the 017_unit_overrides.sql / unitOverrides.ts / useRulesExtended.ts patterns verbatim — they are the direct templates for every file this phase creates.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tauri-plugin-sql | (project-pinned) | SQLite queries via $1/$2 positional params | The only supported DB access path in this Tauri app |
| @tanstack/react-query | (project-pinned) | Server state caching, invalidation, mutations | Project standard; all data hooks use it |

No new package installations required. This phase adds only SQL, TypeScript, and React code.

## Architecture Patterns

### Recommended Project Structure — new files this phase

```
src-tauri/migrations/
  019_rules_favorites_notes.sql   # new migration

src/types/
  armyList.ts                     # extend: add detachment_id, detachment_name
  rulesFavorite.ts                # new: RulesFavorite, CreateRulesFavoriteInput, etc.
  rulesNote.ts                    # new: RulesNote, UpsertRulesNoteInput, etc.

src/db/queries/
  rulesExtended.ts                # extend: add getDetachmentById, getStratagemsByDetachment
  armyLists.ts                    # extend: detachment columns in INSERT/UPDATE
  rulesFavorites.ts               # new query module
  rulesNotes.ts                   # new query module

src/hooks/
  useRulesExtended.ts             # extend: add useDetachmentById, useStratagemsByDetachment
  useRulesFavorites.ts            # new hook file
  useRulesNotes.ts                # new hook file

.planning/
  points-import-design.md         # new design document (ARMY-06)

tests/
  datasheet/rulesExtendedQueries.test.ts   # extend with new query tests
  datasheet/rulesFavoritesQueries.test.ts  # new
  datasheet/rulesNotesQueries.test.ts      # new
  army-list/armyListDetachment.test.ts     # new (detachment columns in queries)
```

### Pattern 1: Tauri migration file — ALTER TABLE (add nullable columns)

Migration 018 demonstrates the safe way to add nullable columns to existing tables using ALTER TABLE ADD COLUMN. This avoids rebuilding the table and works within Tauri plugin-sql's append-only migration model.

```sql
-- Source: src-tauri/migrations/018_recipe_sections.sql (project canonical)
ALTER TABLE recipe_steps ADD COLUMN section_id INTEGER REFERENCES recipe_sections(id) ON DELETE CASCADE;
```

For the 019 migration the pattern extends to:

```sql
-- 019_rules_favorites_notes.sql
ALTER TABLE army_lists ADD COLUMN detachment_id   TEXT;
ALTER TABLE army_lists ADD COLUMN detachment_name TEXT;

CREATE TABLE IF NOT EXISTS rules_favorites (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id     TEXT NOT NULL,
    rule_type   TEXT NOT NULL CHECK (rule_type IN ('stratagem', 'detachment_ability', 'shared_ability')),
    rule_name   TEXT NOT NULL,
    is_reminder INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (rule_id, rule_type)
);

CREATE TABLE IF NOT EXISTS rules_notes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id     TEXT NOT NULL,
    rule_type   TEXT NOT NULL CHECK (rule_type IN ('stratagem', 'detachment_ability', 'shared_ability')),
    rule_name   TEXT NOT NULL,
    note_text   TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (rule_id, rule_type)
);
```

**Confidence:** HIGH — direct inference from 017/018 migration files, unit_overrides pattern, and 52-CONTEXT.md locked decisions.

### Pattern 2: INSERT OR REPLACE for upsert

The unit_overrides module already uses INSERT OR REPLACE. For rules_favorites and rules_notes with UNIQUE(rule_id, rule_type), the same idiom applies.

```typescript
// Source: project pattern established in unitOverrides.ts
await db.execute(
  `INSERT OR REPLACE INTO rules_favorites
     (rule_id, rule_type, rule_name, is_reminder, created_at, updated_at)
   VALUES ($1, $2, $3, $4,
     COALESCE((SELECT created_at FROM rules_favorites WHERE rule_id=$1 AND rule_type=$2), datetime('now')),
     datetime('now'))`,
  [input.rule_id, input.rule_type, input.rule_name, input.is_reminder ? 1 : 0]
);
```

Note: INSERT OR REPLACE deletes and re-inserts the row, which resets created_at unless the COALESCE subquery preserves it. The simpler alternative is INSERT OR IGNORE followed by a separate UPDATE — but INSERT OR REPLACE with a preserved created_at subquery is idiomatic for this codebase.

Alternatively (simpler and equally valid for this project): use separate INSERT and UPDATE paths controlled by whether a row already exists. Given the small volume (a handful of favorites), either approach is fine. The CONTEXT.md locks INSERT OR REPLACE as the pattern.

### Pattern 3: staleTime: Infinity + enabled guard for rules.db hooks

```typescript
// Source: src/hooks/useRulesExtended.ts (project canonical)
export function useDetachmentById(detachmentId: string | undefined) {
  return useQuery({
    queryKey: detachmentId !== undefined
      ? DETACHMENT_BY_ID_KEY(detachmentId)
      : (["detachment-by-id"] as const),
    queryFn: () =>
      detachmentId !== undefined ? getDetachmentById(detachmentId) : Promise.resolve(null),
    enabled: detachmentId !== undefined,
    staleTime: Infinity,
  });
}
```

### Pattern 4: useRulesSync.onSuccess invalidation registration

Any new rules.db hook key must be added to the `onSuccess` block in `useRulesSync.ts`. Current registrations end at line 249. New keys append after:

```typescript
// Source: src/hooks/useRulesSync.ts lines 241-249
qc.invalidateQueries({ queryKey: ["detachment-by-id"], exact: false });
qc.invalidateQueries({ queryKey: ["stratagems-by-detachment"], exact: false });
```

favorites and notes hooks must NOT be added here — they are hobbyforge.db data and survive sync.

### Pattern 5: Optimistic mutation for favorites toggle

```typescript
// Source: project mutation pattern from useArmyLists.ts and useRulesExtended.ts
export function useUpsertRulesFavorite() {
  const qc = useQueryClient();
  return useMutation<void, Error, UpsertRulesFavoriteInput>({
    mutationFn: upsertRulesFavorite,
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await qc.cancelQueries({ queryKey: RULES_FAVORITES_KEY });
      // Snapshot previous value
      const previous = qc.getQueryData(RULES_FAVORITES_KEY);
      // Optimistically update cache
      qc.setQueryData(RULES_FAVORITES_KEY, (old: RulesFavorite[] | undefined) => {
        if (!old) return [variables as RulesFavorite];
        const existing = old.findIndex(f => f.rule_id === variables.rule_id && f.rule_type === variables.rule_type);
        if (existing >= 0) {
          return old.map((f, i) => i === existing ? { ...f, ...variables } : f);
        }
        return [...old, variables as RulesFavorite];
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        qc.setQueryData(RULES_FAVORITES_KEY, context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: RULES_FAVORITES_KEY });
    },
  });
}
```

### Anti-Patterns to Avoid

- **Putting user data in rules.db:** rules.db is fully deleted on every sync. rules_favorites, rules_notes, and army_lists.detachment_id must all live in hobbyforge.db.
- **Cross-DB FK constraints:** SQLite does not support FK across database files. Use application-level enforcement only (document clearly in code comments).
- **COALESCE on detachment columns in updateArmyList:** The existing updateArmyList uses COALESCE to avoid clearing other fields. detachment columns follow the same pattern — only set them if provided. However, the user must be able to clear detachment_id back to NULL (un-select detachment). Use explicit NULL passthrough: `SET detachment_id = $N` without COALESCE, similar to updateArmyListUnit's points_override pattern.
- **staleTime omitted for rules.db hooks:** Always `staleTime: Infinity` + sync invalidation registration. Omitting staleTime causes stale-while-revalidate on every mount.
- **Editing existing migration files:** Migrations are append-only. Only write 019, never touch 001-018.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Upsert logic | Custom find-then-insert/update JS | `INSERT OR REPLACE` with UNIQUE constraint | SQL handles atomicity; JS version has TOCTOU race |
| Cache invalidation | Manual cache key tracking | React Query `invalidateQueries` with prefix keys | Already the project pattern; safe for partial keys |
| Optimistic rollback | Rollback state machine | React Query `onMutate/onError/onSettled` triple | Built-in; used in existing mutations |
| Migration ordering | Custom migration runner | tauri-plugin-sql filename-order auto-run | Already the project infrastructure |

**Key insight:** Every "new" problem in this phase has already been solved by an existing file. The job is faithful duplication of patterns, not invention.

## Common Pitfalls

### Pitfall 1: Detachment name TEXT NULL vs NOT NULL
**What goes wrong:** Making detachment_name NOT NULL means rows without detachment selection fail to insert.
**Why it happens:** Forgetting both columns are nullable — army lists without detachments must remain valid.
**How to avoid:** Both `detachment_id TEXT` and `detachment_name TEXT` without NOT NULL, consistent with CONTEXT.md.
**Warning signs:** `NOT NULL constraint failed: army_lists.detachment_name` at insert time.

### Pitfall 2: INSERT OR REPLACE destroys created_at
**What goes wrong:** INSERT OR REPLACE first DELETEs the existing row, then INSERTs a new one. The new row gets `datetime('now')` as created_at, losing the original creation timestamp.
**Why it happens:** SQL's REPLACE semantics = DELETE + INSERT, not UPDATE.
**How to avoid:** Use a COALESCE subquery to preserve created_at: `COALESCE((SELECT created_at FROM rules_favorites WHERE rule_id=$1 AND rule_type=$2), datetime('now'))`. Or accept that the created_at resets (simpler, but loses history). Decision belongs to Claude's Discretion for this phase.
**Warning signs:** Favorites always show the same "last toggled" time rather than when first added.

### Pitfall 3: Optimistic update with stale cache shape
**What goes wrong:** `onMutate` sets cache data with a partial object that doesn't match the `RulesFavorite` type returned by `getRulesFavorites`, causing TypeScript errors or UI inconsistency on rollback.
**Why it happens:** The upsert input type lacks `id` and `created_at/updated_at` fields that DB assigns.
**How to avoid:** In `onMutate`, only update existing cache entries; don't try to add new rows optimistically. Or cast carefully with a placeholder id. Accept that the optimistic path shows the existing cached state and the post-settle path shows the real state.

### Pitfall 4: Missing sync invalidation for new rules.db hooks
**What goes wrong:** `useDetachmentById` and `useStratagemsByDetachment` have `staleTime: Infinity` but are never invalidated after a sync, showing stale data until app restart.
**Why it happens:** Forgetting to add the new query key prefixes to `useRulesSync.onSuccess`.
**How to avoid:** After writing each new rules.db hook, immediately add its key prefix to `useRulesSync.ts` onSuccess block.
**Warning signs:** After sync, detachment queries still return old data.

### Pitfall 5: COALESCE on army_lists UPDATE blocks NULL-clearing for detachment_id
**What goes wrong:** The current `updateArmyList` uses `SET detachment_id = COALESCE($N, detachment_id)`. If the user removes a detachment selection (sends `null`), COALESCE ignores null and keeps the old value.
**Why it happens:** The existing updateArmyList pattern uses COALESCE for all nullable fields to support partial updates. But detachment_id must be clearable.
**How to avoid:** Either (a) use a direct SET without COALESCE for detachment columns, or (b) add a separate `clearArmyListDetachment(id)` function. Approach (a) requires callers to always send detachment_id even when not changing it. Approach (b) is cleaner — keep existing COALESCE pattern and add a dedicated clear function.
**Warning signs:** Detachment can never be unselected from an army list.

### Pitfall 6: Hook file exports both singular and plural names inconsistently
**What goes wrong:** Downstream phases import `useRulesFavorites` (plural) but the file exports `useRulesFavorite` (singular), causing TypeScript import errors.
**Why it happens:** CONTEXT.md leaves hook file naming to Claude's discretion.
**How to avoid:** Pick one convention and stick to it. Recommend `useRulesFavorites.ts` and `useRulesNotes.ts` (plural, matching `useArmyLists.ts`, `usePaints.ts` convention in the project).

## Code Examples

### Migration 019 structure (verified against 017/018 templates)

```sql
-- Source: pattern from src-tauri/migrations/017_unit_overrides.sql and 018_recipe_sections.sql

-- Step 1: Extend army_lists with detachment linkage (both columns nullable)
ALTER TABLE army_lists ADD COLUMN detachment_id   TEXT;
ALTER TABLE army_lists ADD COLUMN detachment_name TEXT;

-- Step 2: User favorites for rules (lives in hobbyforge.db — survives rules.db re-sync)
-- CRITICAL: NOT in rules.db. rules.db is fully deleted on every sync.
CREATE TABLE IF NOT EXISTS rules_favorites (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id     TEXT    NOT NULL,
    rule_type   TEXT    NOT NULL CHECK (rule_type IN ('stratagem', 'detachment_ability', 'shared_ability')),
    rule_name   TEXT    NOT NULL,
    is_reminder INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (rule_id, rule_type)
);

-- Step 3: User notes for rules (lives in hobbyforge.db — survives rules.db re-sync)
CREATE TABLE IF NOT EXISTS rules_notes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id     TEXT    NOT NULL,
    rule_type   TEXT    NOT NULL CHECK (rule_type IN ('stratagem', 'detachment_ability', 'shared_ability')),
    rule_name   TEXT    NOT NULL,
    note_text   TEXT    NOT NULL DEFAULT '',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (rule_id, rule_type)
);
```

### TypeScript type extensions

```typescript
// Source: src/types/armyList.ts — extend existing ArmyList interface
export interface ArmyList {
  id: number;
  name: string;
  faction_id: number | null;
  points_limit: number | null;
  list_type: string | null;
  notes: string | null;
  detachment_id: string | null;    // new — Wahapedia rw_detachments.id
  detachment_name: string | null;  // new — denormalized copy, survives rules.db re-sync
  created_at: string;
  updated_at: string;
}

// CreateArmyListInput extends Omit<ArmyList, "id"|"created_at"|"updated_at">
// so detachment_id and detachment_name are automatically included as optional
// if their types allow undefined/null (they do since they're T | null).
```

```typescript
// Source: new src/types/rulesFavorite.ts
export interface RulesFavorite {
  id: number;
  rule_id: string;
  rule_type: 'stratagem' | 'detachment_ability' | 'shared_ability';
  rule_name: string;
  is_reminder: 0 | 1;
  created_at: string;
  updated_at: string;
}

export type UpsertRulesFavoriteInput = Omit<RulesFavorite, 'id' | 'created_at' | 'updated_at'>;
```

```typescript
// Source: new src/types/rulesNote.ts
export interface RulesNote {
  id: number;
  rule_id: string;
  rule_type: 'stratagem' | 'detachment_ability' | 'shared_ability';
  rule_name: string;
  note_text: string;
  created_at: string;
  updated_at: string;
}

export type UpsertRulesNoteInput = Omit<RulesNote, 'id' | 'created_at' | 'updated_at'>;
```

### New rulesExtended.ts functions (rules.db reads)

```typescript
// Source: pattern from existing src/db/queries/rulesExtended.ts

export async function getDetachmentById(detachmentId: string): Promise<RwDetachment | null> {
  const db = await getRulesDb();
  const rows = await db.select<RwDetachment[]>(
    "SELECT * FROM rw_detachments WHERE id = $1",
    [detachmentId]
  );
  return rows[0] ?? null;
}

export async function getStratagemsByDetachment(detachmentId: string): Promise<RwStratagem[]> {
  const db = await getRulesDb();
  return db.select<RwStratagem[]>(
    "SELECT * FROM rw_stratagems WHERE detachment_id = $1 ORDER BY name",
    [detachmentId]
  );
}
```

### rulesFavorites.ts query module

```typescript
// Source: pattern from src/db/queries/armyLists.ts and rulesExtended.ts
import { getDb } from "@/db/client";
import type { RulesFavorite, UpsertRulesFavoriteInput } from "@/types/rulesFavorite";

export async function getRulesFavorites(): Promise<RulesFavorite[]> {
  const db = await getDb();
  return db.select<RulesFavorite[]>("SELECT * FROM rules_favorites ORDER BY rule_name ASC");
}

export async function upsertRulesFavorite(input: UpsertRulesFavoriteInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT OR REPLACE INTO rules_favorites
       (rule_id, rule_type, rule_name, is_reminder,
        created_at, updated_at)
     VALUES ($1, $2, $3, $4,
       COALESCE((SELECT created_at FROM rules_favorites WHERE rule_id = $1 AND rule_type = $2), datetime('now')),
       datetime('now'))`,
    [input.rule_id, input.rule_type, input.rule_name, input.is_reminder]
  );
}

export async function deleteRulesFavorite(ruleId: string, ruleType: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "DELETE FROM rules_favorites WHERE rule_id = $1 AND rule_type = $2",
    [ruleId, ruleType]
  );
}
```

### useRulesSync.onSuccess additions (append to existing block)

```typescript
// Source: src/hooks/useRulesSync.ts — add after line 249
qc.invalidateQueries({ queryKey: ["detachment-by-id"], exact: false });
qc.invalidateQueries({ queryKey: ["stratagems-by-detachment"], exact: false });
// NOTE: do NOT add rules-favorites or rules-notes keys here —
// they live in hobbyforge.db and survive sync unchanged.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Cross-DB joins via ATTACH | Dual-query merge pattern (discovered impossible) | Phase 43 research | All user data must be in hobbyforge.db, never rules.db |
| Single migration file | Append-only numbered files | Project from day one | Never edit existing migrations |

**Deprecated/outdated:**
- None relevant to this phase.

## Open Questions

1. **created_at preservation on INSERT OR REPLACE**
   - What we know: INSERT OR REPLACE deletes then inserts — created_at resets unless COALESCE subquery is used
   - What's unclear: Whether preserving created_at matters for this UX (favorites do not show creation date in UI)
   - Recommendation: Use COALESCE subquery for correctness; if planner prefers simplicity, a simpler INSERT OR IGNORE + UPDATE on conflict pattern is equally valid

2. **Detachment column clearing in updateArmyList**
   - What we know: Existing COALESCE pattern blocks NULL-clearing; detachment must be clearable
   - What's unclear: Whether to modify the COALESCE pattern for just detachment columns or add a separate clearArmyListDetachment function
   - Recommendation: Add a separate `clearArmyListDetachment(id: number)` function to keep existing update logic intact and make the clearing intent explicit

3. **rule_type const array in TypeScript**
   - What we know: Three valid values are locked: 'stratagem', 'detachment_ability', 'shared_ability'
   - What's unclear: Whether to export as a const array (PAINTING_STATUS_ORDER pattern) or as a plain union type
   - Recommendation: Export `RULE_TYPES = ['stratagem', 'detachment_ability', 'shared_ability'] as const` and derive `RuleType = typeof RULE_TYPES[number]` — consistent with existing codebase const array pattern

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | vite.config.ts (vitest config embedded) |
| Quick run command | `pnpm test -- tests/datasheet/rulesFavoritesQueries.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ARMY-06 | Points import design doc exists at `.planning/points-import-design.md` covering all 5 required sections | manual | inspect file | ❌ Wave 0 (doc created, no test needed) |
| SC-1 | Migration 019 runs: army_lists gains detachment_id/detachment_name, rules_favorites and rules_notes tables created | unit | `pnpm test -- tests/datasheet/migration019.test.ts` | ❌ Wave 0 |
| SC-2 | ArmyList, RulesFavorite, RulesNote TypeScript types compile without errors | unit (compile) | `pnpm build` (tsc check) | ❌ Wave 0 |
| SC-3 | getDetachmentById, getStratagemsByDetachment added to rulesExtended.ts | unit | `pnpm test -- tests/datasheet/rulesExtendedQueries.test.ts` | ✅ (extend existing) |
| SC-3 | getRulesFavorites, upsertRulesFavorite, deleteRulesFavorite in rulesFavorites.ts | unit | `pnpm test -- tests/datasheet/rulesFavoritesQueries.test.ts` | ❌ Wave 0 |
| SC-3 | getRulesNotes, upsertRulesNote in rulesNotes.ts | unit | `pnpm test -- tests/datasheet/rulesNotesQueries.test.ts` | ❌ Wave 0 |
| SC-4 | useDetachmentById, useStratagemsByDetachment registered in useRulesSync.onSuccess | unit | `pnpm test -- tests/datasheet/useRulesSync.test.ts` | ✅ (extend existing) |
| SC-4 | useRulesFavorites, useRulesNotes hooks exist and export correct query keys | unit | `pnpm test -- tests/datasheet/useRulesFavorites.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/datasheet/` (run the datasheet test directory)
- **Per wave merge:** `pnpm test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/datasheet/migration019.test.ts` — covers SC-1: migration creates correct tables and columns
- [ ] `tests/datasheet/rulesFavoritesQueries.test.ts` — covers SC-3: getRulesFavorites, upsertRulesFavorite, deleteRulesFavorite SQL assertions
- [ ] `tests/datasheet/rulesNotesQueries.test.ts` — covers SC-3: getRulesNotes, upsertRulesNote SQL assertions
- [ ] `tests/datasheet/useRulesFavorites.test.ts` — covers SC-4: hook exports RULES_FAVORITES_KEY, mutations invalidate it

## Sources

### Primary (HIGH confidence)
- `src-tauri/migrations/017_unit_overrides.sql` — migration pattern for new hobbyforge.db tables with TEXT references to rules.db data
- `src-tauri/migrations/018_recipe_sections.sql` — ALTER TABLE ADD COLUMN pattern for extending existing tables
- `src/db/queries/rulesExtended.ts` — query module pattern for rules.db reads
- `src/hooks/useRulesExtended.ts` — hook pattern with staleTime: Infinity and enabled guard
- `src/hooks/useRulesSync.ts` — onSuccess invalidation contract; shows exactly where to add new keys
- `src/types/armyList.ts` — interface to extend with detachment columns
- `src/types/datasheet.ts` — RwDetachment, RwStratagem types used by new query functions
- `src/db/queries/armyLists.ts` — existing army list CRUD; createArmyList and updateArmyList SQL to extend
- `src/hooks/useArmyLists.ts` — ARMY_LISTS_KEY invalidation pattern; confirms detachment columns auto-picked up
- `.planning/phases/52-schema-data-layer-foundation/52-CONTEXT.md` — all locked decisions

### Secondary (MEDIUM confidence)
- `tests/datasheet/rulesExtendedQueries.test.ts` — test pattern for rules.db query mocking (vi.mock rules-client)
- `tests/army-list/armyListQueries.test.ts` — test pattern for hobbyforge.db query mocking (vi.mock client)
- `tests/foundation/armyListQueries.test.ts` — full army list query test coverage showing SQL assertion style

### Tertiary (LOW confidence)
- None — all findings are sourced directly from project files.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, existing tauri-plugin-sql and React Query
- Architecture: HIGH — every pattern has a direct existing example in the codebase
- Pitfalls: HIGH — derived from reading actual existing code and migration files; not speculation
- Test patterns: HIGH — existing test files show exact mocking and assertion style

**Research date:** 2026-05-10
**Valid until:** Stable — infrastructure patterns don't change between phases; valid for full v0.2.8 milestone
