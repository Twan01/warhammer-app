# Phase 78: Dashboard Command Center + Game Day After-Action — Research

**Researched:** 2026-05-15
**Domain:** Dashboard UI composition, React Query hook orchestration, SQLite schema extension, Game Day after-action flow
**Confidence:** HIGH

---

## Summary

Phase 78 is a pure in-app integration phase — no new libraries, no new Rust commands, no external services. All the raw data already exists in the codebase; the work is wiring it into the right components in the right shape.

The three dashboard cards (Next Painting Action, Ready to Play, Data Health Summary) require a new composite hook `useNextPaintingAction` plus two thin adaptor consumers that compose existing hooks (`useArmyListWithUnits`, `useRulesSyncMeta`, `useDiagnosticFlags`). The Data Health Summary card depends on Phase 77 shipping `useDiagnosticFlags` and its localStorage backup status key. Planning must assume Phase 77 is complete before this phase executes.

The Game Day after-action work splits into two orthogonal pieces: (1) `BattleLogSheet` gains a collapsible section and a `prefill` prop, plus the new `forgotten_rules` TEXT column added in migration 027 needs to be surfaced in the form; (2) `ChecklistTab` needs to query recent battle logs for the active list's faction and render any stored `forgotten_rules` as non-interactive reminder items. The schema column (`forgotten_rules` TEXT) already exists from migration 027 — migration 029 adds only the `forgotten_rules` column as a named slot, but that column is already there. Careful: the decision log says "new TEXT column on `battle_log` (migration 029)" but migration 027 already added it. The planner must reconcile this.

**Primary recommendation:** Plan the work in three clear waves — (1) schema + migration audit, (2) new hooks and query functions, (3) UI components and wiring — within a standard Nyquist wave structure.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Next Painting Action Card**
- D-01: Show the first incomplete step of the most-recently-updated assignment (sort by `updated_at DESC`)
- D-02: Paint availability check reuses `useRecipePaints` hook — owned/missing/running-low indicator per paint needed for the current step
- D-03: Empty state when no assignments or all complete — prompt to assign a recipe
- D-04: New hook `useNextPaintingAction()` in `src/hooks/` composing `useRecipeAssignments`, `useStepProgress`, and `useRecipePaints`

**Ready to Play Summary Card**
- D-05: Show the most-recently-edited army list (sort by `updated_at DESC`)
- D-06: Display list name, total points, unpainted unit count, sync freshness
- D-07: Empty state when no army lists — prompt to create one

**Data Health Summary Card**
- D-08: Compact three-metric card: sync age, total warning count, last backup date/status — reads from `useRulesSyncMeta`, `useDiagnosticFlags` (Phase 77), and localStorage
- D-09: Link to `/data-health` for full details

**End Game Flow**
- D-10: "End Game" button in `GameDayHeader` opens `BattleLogSheet` pre-filled with `army_list_id`, `battle_date: today`, `opponent_faction` from game day state
- D-11: Pre-fill passed as `defaultValues` — same pattern as edit mode but with partial data

**After-Action Capture**
- D-12: Collapsible "After-Action" section in `BattleLogSheet` with: MVP unit selector, underperformer selector, lessons learned, forgotten rules (multi-line textarea)
- D-13: MVP/underperformer use existing columns; `lessons_learned` and `changes_next_time` already exist — move them into the collapsible
- D-14: `forgotten_rules` stored as JSON array string in TEXT column (migration 029). Parse on read, serialize on write.

**Forgotten Rules → Reminders**
- D-15: On Game Day entry, query last 3 battle logs for same faction, extract `forgotten_rules` arrays, deduplicate, display as reminder items in checklist
- D-16: No separate reminders table — battle log is the source of truth

**Unit/List Notes**
- D-17: `changes_next_time` serves as list-level notes in after-action; no inline unit note editing from after-action sheet

### Claude's Discretion
- Dashboard card ordering and layout (existing CSS grid system)
- Card styling and visual hierarchy for the three new cards
- Empty state copy and design for each card
- Collapsible section styling for after-action fields in BattleLogSheet
- Forgotten rules display format in Game Day checklist (badge, list item, etc.)
- Whether "Next Painting Action" card links/navigates to the recipe or unit

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DB-01 | Dashboard shows "Next Painting Action" driven by applied recipe progress (step description, time estimate, paint availability) | `useNextPaintingAction` hook composing `useAssignmentsByUnit` + `useStepProgress` + `useRecipePaints`; recipe_steps have `time_estimate` field (verify below) |
| DB-02 | Dashboard shows "Ready to Play" summary (points, unpainted count, sync freshness) | `getArmyLists()` returns `updated_at`; `getArmyListWithUnits` + `computeListHealthStats` provides unpainted count; `getSyncFreshness` provides freshness |
| DB-03 | Dashboard shows "Data Health" summary (sync age, warnings count, backup status) | `useRulesSyncMeta` (sync age), `useDiagnosticFlags` from Phase 77 (warning count), localStorage key from Phase 77 D-06 (backup date) |
| GD-01 | Game Day has an "End Game" action that creates a battle log pre-filled with army list, date, and opponent | `GameDayHeader` → `BattleLogSheet` with `prefill` prop; game day store exposes `listStates[id]` for opponent faction |
| GD-02 | User can record post-game learnings (forgotten rules, MVP/underperformer units) | Extend `BattleLogSheet` with collapsible section; `forgotten_rules` TEXT column exists in migration 027; `mvp_unit_id` and `underperforming_unit_id` columns exist |
| GD-03 | Forgotten rules from after-action can become future Game Day reminders | `ChecklistTab` queries last 3 battle logs for same faction; renders deduplicated `forgotten_rules` as amber reminder items |
| GD-04 | Unit/list notes can be updated from the Game Day after-action flow | `changes_next_time` field in BattleLogSheet after-action section serves as list-level notes |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Next Painting Action data | React Query hook (`useNextPaintingAction`) | SQLite via existing queries | Hook composes three existing queries; no new DB layer needed |
| Ready to Play data | React Query hook (inline in card or thin wrapper) | `getArmyLists` + `getArmyListWithUnits` | Single query call with `updated_at` sort; minimal new code |
| Data Health summary data | React Query hooks from Phase 77 + localStorage | `useRulesSyncMeta` | Reads three sources: DB (sync meta), DB (diagnostics), localStorage (backup date) |
| End Game pre-fill | `GameDayHeader` component | `gameDayStore` for opponent faction | State is local to the game day session; no DB read required |
| After-action capture | `BattleLogSheet` form | `battleLogs.ts` query | Form extension; mutation updates existing `battle_logs` row |
| Forgotten rules reminders | `ChecklistTab` component | New query `getRecentForgottenRules` | Reads last 3 battle logs filtered by faction; pure display, no write |
| Migration | `src-tauri/migrations/` | None | Add `forgotten_rules` column only if not already present (migration 027 adds it) |

---

## Standard Stack

### Core (all verified in codebase — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Query (`@tanstack/react-query`) | As installed | Data fetching and caching | All DB reads in this project go through React Query |
| Zustand | As installed | `gameDayStore` — game day session state | Game day already uses this store; opponent faction lives here |
| React Hook Form + Zod | As installed | `BattleLogSheet` form extension | All forms in the project use RHF + Zod |
| shadcn/ui Collapsible | Already in project (shadcn) | After-action collapsible section | UI-SPEC calls for `Collapsible` / `CollapsibleTrigger` / `CollapsibleContent` |
| Lucide React | As installed | Icons throughout | Project-wide icon library |

**Installation:** No new packages needed. [VERIFIED: codebase grep]

---

## Architecture Patterns

### System Architecture Diagram

```
DB-01 Next Painting Action:
  SQLite (unit_recipe_assignments)
       → getAssignmentsByUnit (existing query)
       → unit_recipe_step_progress (existing)
       → recipe_steps (existing, has time_estimate)
  [useNextPaintingAction hook]  ← new composite hook
       ↓
  NextPaintingActionCard  ← new component

DB-02 Ready to Play:
  SQLite (army_lists → army_list_units → units)
       → getArmyLists() [updated_at sort] (existing)
       → getArmyListWithUnits() (existing)
  [useArmyListWithUnits + computeListHealthStats]  ← reuse existing
       ↓
  ReadyToPlayCard  ← new component

DB-03 Data Health Summary:
  SQLite (rules.db) → useRulesSyncMeta (existing)
  SQLite (diagnostics) → useDiagnosticFlags (Phase 77)
  localStorage → backup date key (Phase 77 D-06)
       ↓
  DataHealthSummaryCard  ← new component

GD-01 End Game:
  gameDayStore (Zustand) → listStates[id] → opponent faction
  todayISO() → battle_date
  list.id → army_list_id
  [GameDayHeader "End Game" button]
       ↓  (opens with prefill)
  BattleLogSheet (modified)
       → createBattleLog mutation (existing)

GD-02 After-Action:
  BattleLogSheet (extended)
       → collapsible section: forgotten_rules + MVP + underperformer + lessons
       → updateBattleLog / createBattleLog (extended payload)

GD-03 Forgotten Rules → Reminders:
  SQLite (battle_logs.forgotten_rules, filtered by faction)
       → getRecentForgottenRules(factionId) ← new query function
  ChecklistTab (modified)
       → renders non-interactive reminder items above checklist
```

### Recommended Project Structure (new files only)

```
src/
  features/dashboard/
    NextPaintingActionCard.tsx    # new
    ReadyToPlayCard.tsx           # new
    DataHealthSummaryCard.tsx     # new
  hooks/
    useNextPaintingAction.ts      # new composite hook
  db/queries/
    battleLogs.ts                 # extend: add getRecentForgottenRules(), extend create/update for forgotten_rules
src-tauri/migrations/
    029_forgotten_rules_column.sql  # add forgotten_rules column IF NOT EXISTS (see critical finding below)
```

### Pattern 1: Composite Hook — useNextPaintingAction

**What:** A single hook that chains three existing queries: all assignments, step progress for the most-recent, and recipe steps for that assignment. Returns a typed `NextPaintingAction | null` result.

**When to use:** Any component that needs to know "what step should the user paint next"

```typescript
// Pattern from DashboardPage.tsx lines 98-120 — same chaining approach
// Source: src/features/dashboard/DashboardPage.tsx (existing pattern)
export function useNextPaintingAction(): UseQueryResult<NextPaintingAction | null> {
  // Step 1: get all assignments, sorted by updated_at DESC — needs new query
  // Step 2: find first assignment with incomplete steps
  // Step 3: return step description + paint availability
}
```

**Key discovery:** `unit_recipe_assignments` table only has `created_at`, not `updated_at` (migration 021 verified). Decision D-01 says "sort by `updated_at DESC`" — but the table has no `updated_at` column. The hook must sort by `created_at DESC` instead, OR the migration adds an `updated_at` column. This must be resolved in planning. [VERIFIED: migration 021 schema]

### Pattern 2: BattleLogSheet prefill prop

**What:** `buildDefaultValues` function extended to accept `Partial<BattleLogFormValues>` merged over `DEFAULT_VALUES`. Title changes to "End Game" when pre-filled.

**When to use:** "End Game" button in GameDayHeader opens the sheet with army_list_id + battle_date + opponent_faction pre-populated.

```typescript
// Pattern: merge prefill over defaults
// Source: src/features/battle-log/BattleLogSheet.tsx lines 65-85
function buildDefaultValues(
  log: BattleLog | null,
  prefill?: Partial<BattleLogFormValues>
): BattleLogFormValues {
  if (log) return { /* existing edit mode */ };
  return { ...DEFAULT_VALUES, battle_date: todayISO(), ...prefill };
}
```

### Pattern 3: JSON array serialization for forgotten_rules

**What:** `forgotten_rules` is stored as `TEXT` (`["Rule text 1", "Rule text 2"]`). Parse with `JSON.parse()` on read, serialize with `JSON.stringify()` on write.

**When to use:** Every `createBattleLog` / `updateBattleLog` that includes after-action data; every read that surfaces forgotten rules in ChecklistTab.

```typescript
// Write path
forgotten_rules: values.forgotten_rules
  ? JSON.stringify(values.forgotten_rules.split('\n').filter(Boolean))
  : null,

// Read path (in getRecentForgottenRules)
const rules: string[] = row.forgotten_rules
  ? JSON.parse(row.forgotten_rules) as string[]
  : [];
```

### Pattern 4: Forgotten Rules → ChecklistTab reminders

**What:** New query `getRecentForgottenRules(armyListId: number)` that joins `battle_logs` on `army_list_id` (or optionally faction), fetches last 3, parses JSON arrays, deduplicates strings.

```typescript
// New query in battleLogs.ts
export async function getRecentForgottenRules(armyListId: number): Promise<string[]> {
  const db = await getDb();
  const rows = await db.select<{ forgotten_rules: string | null }[]>(
    `SELECT forgotten_rules FROM battle_logs
     WHERE army_list_id = $1 AND forgotten_rules IS NOT NULL
     ORDER BY battle_date DESC, created_at DESC LIMIT 3`,
    [armyListId]
  );
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row.forgotten_rules) continue;
    const rules = JSON.parse(row.forgotten_rules) as string[];
    for (const r of rules) seen.add(r.trim());
  }
  return [...seen];
}
```

**Note on D-15:** Decision says "query last 3 battle logs for same faction" but battle_logs only stores `army_list_id`, not `faction_id` directly. Options: (a) query by `army_list_id` for the current game day list (simpler, same faction implied), or (b) JOIN to `army_lists` to filter by `faction_id`. Recommend option (a) for the planner — query by `army_list_id` is precise and requires no join. [VERIFIED: battleLog.ts type — no faction_id column]

### Anti-Patterns to Avoid

- **Duplicate after-action fields:** MVP and underperformer select fields currently exist in `BattleLogSheet` Group 3. The plan must MOVE them into the collapsible — not add duplicates. (UI-SPEC confirms: "move them INTO the collapsible".)
- **gameDayStore persist without version:** STATE.md explicitly flags "gameDayStore persist config has no version/migrate — must add before adding new nested fields in Phase 78". If this phase adds any new fields to `listStates`, a `version: 1` + `migrate` function must be added to the `persist` config. The current phase adds no new Zustand fields (opponent faction is already part of game day setup, not stored here), so this may be a no-op — verify during planning.
- **Assuming `updated_at` on assignments:** `unit_recipe_assignments` has only `created_at`. Sort by `created_at DESC` for "most recently created assignment" or add a migration — do not silently use a non-existent column.
- **Double migration for forgotten_rules:** Migration 027 already added `forgotten_rules TEXT` to `battle_logs`. If migration 029 tries to add it again it will fail at startup. Use `ADD COLUMN IF NOT EXISTS` or scope 029 to a different column. See critical finding below.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Paint ownership indicator | Custom paint status lookup | `useRecipePaintAvailability()` | Already returns `Map<recipe_id, {owned, missing, runningLow}>` |
| List health stats | Custom unit iteration | `computeListHealthStats()` | Pure function, already handles points + painting pct + warning counts |
| Sync freshness label | Custom date math | `getSyncFreshness()` + `getSyncAgeLabel()` | Three-tier logic already tested |
| JSON parse safety | Manual try/catch everywhere | Centralize in query layer | Parse once in `getRecentForgottenRules`, return `string[]` to components |
| Army list points resolver | Inline COALESCE | `getArmyListWithUnits` | Already uses 4-level COALESCE chain; don't duplicate |

---

## Critical Finding: Migration 027 vs Decision D-14

**What D-14 says:** "forgotten_rules stored as a JSON array string in a new TEXT column on battle_log (migration 029)"

**What actually exists:** Migration 027 (`027_battle_log_after_action.sql`) already added `forgotten_rules TEXT` to `battle_logs` — along with `mvp_notes`, `underperformer_notes`, and `promoted_to_reminder`.

**Implication for planning:**
- Migration 029 does NOT need to add `forgotten_rules` — it already exists.
- The `BattleLog` TypeScript type in `src/types/battleLog.ts` does NOT include `forgotten_rules`, `mvp_notes`, `underperformer_notes`, or `promoted_to_reminder`. These columns are in the DB but not in the type.
- Migration 029 should be scoped to any truly missing column (none, based on current schema), OR omitted entirely.
- The planner's Wave 0 task must add the four missing columns to `BattleLog` and `CreateBattleLogInput`/`UpdateBattleLogInput` types, and extend the `createBattleLog` / `updateBattleLog` queries to include them.

[VERIFIED: 027_battle_log_after_action.sql, src/types/battleLog.ts]

---

## Critical Finding: recipe_steps time_estimate column

**DB-01 requires:** "step description, time estimate" in Next Painting Action card.

The `useRecipePaints` hook returns steps via `getRecipePaintsByRecipe`. The `RecipeStep` / `RecipePaint` type needs to be verified for a `time_estimate` field.
<br>
[ASSUMED] Recipe steps likely have a `time_estimate` column from the recipe step schema — but this was not confirmed in the files read. The planner should verify `src/db/queries/recipePaints.ts` and `src/types/recipePaint.ts` before relying on this field in `useNextPaintingAction`.

---

## Common Pitfalls

### Pitfall 1: missing `updated_at` on recipe assignments

**What goes wrong:** `useNextPaintingAction` sorts by `updated_at DESC` per D-01, but `unit_recipe_assignments` has no `updated_at` column.

**Why it happens:** D-01 was written assuming an `updated_at` exists; the actual migration 021 only has `created_at`.

**How to avoid:** Sort by `created_at DESC` (de facto "most recently assigned") or add a migration to track `updated_at`. The planner must decide and document which approach is used.

**Warning signs:** TypeScript won't catch this — `created_at` and `updated_at` are both `string`; the runtime SQLite query will silently return null if you SELECT a non-existent column.

### Pitfall 2: `BattleLog` type does not include after-action columns

**What goes wrong:** The `forgotten_rules`, `mvp_notes`, `underperformer_notes`, and `promoted_to_reminder` columns are in the DB (migration 027) but not in `src/types/battleLog.ts`. Any code reading these columns from a typed row will get `undefined`.

**Why it happens:** Migration 027 was created in Phase 73 to spec the schema; the TypeScript type was never updated.

**How to avoid:** Wave 0 must include a task to extend `BattleLog` interface and `CreateBattleLogInput` / `UpdateBattleLogInput` types, and update `createBattleLog` / `updateBattleLog` queries.

### Pitfall 3: gameDayStore persist versioning

**What goes wrong:** Adding new nested fields to `listStates` without a migration function causes stale persisted state (missing new fields) to break the store.

**Why it happens:** Zustand persist stores a snapshot; old snapshots lack new fields.

**How to avoid:** Add `version: 1` + `migrate` to the persist config IF any new fields are added to `GameDayListState`. This phase does NOT add new Zustand fields (opponent faction is not stored in gameDayStore), so this is likely a no-op — but the planner should confirm.

### Pitfall 4: Sheet sibling portal contract in DashboardPage

**What goes wrong:** Adding a `BattleLogSheet` to `DashboardPage` nested inside the main content div causes z-index and scroll issues.

**Why it happens:** The existing code has a strict "siblings, never nested" contract (DashboardPage.tsx comment: "Pitfall 1: SIBLINGS, never nested").

**How to avoid:** `BattleLogSheet` for "End Game" lives in `GameDayPage` / `GameDayHeader`, not in DashboardPage. The three new dashboard cards do not open sheets — they link to other pages. No portal pitfall for the dashboard cards.

### Pitfall 5: JSON.parse error on malformed forgotten_rules

**What goes wrong:** If `forgotten_rules` contains invalid JSON (e.g. free text stored by a bug), `JSON.parse` throws and the ChecklistTab crashes.

**Why it happens:** SQLite TEXT columns accept anything.

**How to avoid:** Wrap JSON.parse in try/catch in `getRecentForgottenRules`; on error, return `[]` for that row. Log a console warning.

### Pitfall 6: useNextPaintingAction fetches all assignments globally, not per-unit

**What goes wrong:** If the hook fetches all assignments for all units (scanning every unit) it becomes an expensive N+1 chain.

**Why it happens:** Naively, you'd call `getAssignmentsByUnit` for every unit.

**How to avoid:** New query `getMostRecentAssignmentWithIncompleteSteps()` that does the full JOIN in SQL — returns the first incomplete step across all assignments without N+1. Single DB round-trip.

---

## Code Examples

### Verified pattern: composing recipe assignment queries

```typescript
// Source: src/features/dashboard/DashboardPage.tsx lines 98-120
// Existing pattern for phase's primary unit
const { data: focusAssignments = [] } = useAssignmentsByUnit(focusUnitId ?? undefined);
const primaryAssignment = focusAssignments.length > 0
  ? focusAssignments[focusAssignments.length - 1]
  : undefined;
const { data: focusStepProgress = [] } = useStepProgress(primaryAssignment?.id);
const { data: focusRecipeSteps = [] } = useRecipePaints(primaryAssignment?.recipe_id);
```

### Verified pattern: localStorage backup date (Phase 77)

```typescript
// Source: 77-CONTEXT.md D-06
// Key: "hobbyforge-last-backup" → { date: string, path: string }
// Reading in DataHealthSummaryCard:
const raw = localStorage.getItem("hobbyforge-last-backup");
const backup = raw ? JSON.parse(raw) as { date: string; path: string } : null;
```

### Verified pattern: army list with points

```typescript
// Source: src/db/queries/armyLists.ts lines 24-25
// getArmyLists() returns army_list rows with updated_at
// Sort order for "most recently edited":
ORDER BY updated_at DESC LIMIT 1
```

### Verified pattern: Collapsible in shadcn/ui

```typescript
// Source: UI-SPEC — no install needed, already in project
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
// Pattern: defaultOpen={false}, controlled or uncontrolled
```

### Verified pattern: battle log pre-fill shape

```typescript
// Source: src/features/battle-log/BattleLogSheet.tsx lines 48-63
// DEFAULT_VALUES shape — prefill merges these keys:
{
  battle_date: todayISO(),
  army_list_id: null,          // override with listId
  opponent_faction: "",        // override with game day opponent if set
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Per-unit recipe name display | `useNextPaintingAction` composite hook | Enables dashboard-level "what's next" without loading all units |
| Battle log as read-only record | Battle log + after-action section | Closes the feedback loop from game → future preparation |
| Forgotten rules stay in notes | `forgotten_rules` JSON column + checklist reminders | Rules surface automatically on next Game Day |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `recipe_steps` table has a `time_estimate` column | Critical Finding (DB-01) | NextPaintingActionCard won't show time estimate; must omit that field or display "—" |
| A2 | Phase 77 `useDiagnosticFlags` hook exports a `totalWarningCount` number | DB-03 wiring | DataHealthSummaryCard needs to adapt to the actual return shape |
| A3 | Phase 77 localStorage key is `"hobbyforge-last-backup"` with `{ date, path }` shape | DB-03 wiring | Key mismatch means backup age shows "No backup" even after backup performed |
| A4 | `gameDayStore.listStates` does NOT currently store opponent faction | GD-01 / pitfall 3 | If opponent faction IS stored in Zustand, the prefill can use it; if not, the pre-fill leaves opponent_faction blank |

---

## Open Questions (RESOLVED)

1. **Does `recipe_steps` have `time_estimate`?**
   - RESOLVED: The column is `time_estimate_minutes` per migration 012. Plans use this field name.

2. **Sort assignments by `created_at` or add `updated_at` migration?**
   - RESOLVED: Sort by `created_at DESC`. No migration needed — simplest approach.

3. **Migration 029 scope?**
   - RESOLVED: Migration 029 omitted entirely. Migration 027 already added `forgotten_rules`, `mvp_notes`, `underperformer_notes`, `promoted_to_reminder` columns.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely code changes with no new external dependencies. No new Rust commands, no new Tauri plugins, no new npm packages.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vite.config.ts` (vitest config inline) |
| Quick run command | `pnpm test -- tests/dashboard` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DB-01 | `useNextPaintingAction` returns first incomplete step | unit | `pnpm test -- tests/dashboard/useNextPaintingAction.test.ts` | ❌ Wave 0 |
| DB-01 | `NextPaintingActionCard` renders step description | component | `pnpm test -- tests/dashboard/NextPaintingActionCard.test.tsx` | ❌ Wave 0 |
| DB-01 | Empty state when no assignments | component | same file | ❌ Wave 0 |
| DB-02 | `ReadyToPlayCard` renders list name + points + unpainted count | component | `pnpm test -- tests/dashboard/ReadyToPlayCard.test.tsx` | ❌ Wave 0 |
| DB-03 | `DataHealthSummaryCard` renders sync dot + warning count + backup age | component | `pnpm test -- tests/dashboard/DataHealthSummaryCard.test.tsx` | ❌ Wave 0 |
| GD-01 | "End Game" button opens `BattleLogSheet` pre-filled | component | `pnpm test -- tests/game-day/GameDayHeader.test.tsx` | ❌ Wave 0 |
| GD-02 | `BattleLogSheet` after-action collapsible renders forgotten rules field | component | `pnpm test -- tests/battle-log/BattleLogSheet.test.tsx` | ❌ Wave 0 |
| GD-03 | `ChecklistTab` shows forgotten rules from recent battle logs as reminders | component | `pnpm test -- tests/game-day/ChecklistTab.test.tsx` | ❌ Wave 0 |
| GD-04 | `changes_next_time` field is inside after-action collapsible | component | same BattleLogSheet test file | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm test -- tests/dashboard tests/game-day tests/battle-log`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/dashboard/useNextPaintingAction.test.ts` — covers DB-01 hook logic
- [ ] `tests/dashboard/NextPaintingActionCard.test.tsx` — covers DB-01 component
- [ ] `tests/dashboard/ReadyToPlayCard.test.tsx` — covers DB-02
- [ ] `tests/dashboard/DataHealthSummaryCard.test.tsx` — covers DB-03
- [ ] `tests/game-day/GameDayHeader.test.tsx` — covers GD-01 (file not currently in game-day tests)
- [ ] `tests/battle-log/BattleLogSheet.test.tsx` — covers GD-02, GD-04
- [ ] `tests/game-day/ChecklistTab.test.tsx` — covers GD-03 (currently `PreGameChecklist.test.tsx` exists — may cover same component)

---

## Security Domain

This phase makes no changes to authentication, session management, access control, or cryptography. All data is local SQLite with existing FK enforcement. Input validation uses the existing Zod schema (`battleLogSchema`) which will be extended with the new `forgotten_rules` field.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | Zod schema extension for `forgotten_rules` field |
| V2 Authentication | no | — |
| V6 Cryptography | no | — |

---

## Sources

### Primary (HIGH confidence)

- `src-tauri/migrations/027_battle_log_after_action.sql` — confirmed `forgotten_rules` column already exists
- `src-tauri/migrations/021_applied_recipe_assignments.sql` — confirmed no `updated_at` on assignments
- `src/types/battleLog.ts` — confirmed type does not include after-action columns
- `src/features/battle-log/BattleLogSheet.tsx` — confirmed existing form structure and `buildDefaultValues` pattern
- `src/features/dashboard/DashboardPage.tsx` — confirmed recipe assignment composition pattern
- `src/features/game-day/gameDayStore.ts` — confirmed no opponent faction stored in Zustand
- `src/features/game-day/ChecklistTab.tsx` — confirmed checklist item structure
- `src/features/game-day/GameDayHeader.tsx` — confirmed header structure for End Game button placement
- `src/lib/computeUnitWarnings.ts` — confirmed `computeListHealthStats` signature
- `src/lib/syncFreshness.ts` — confirmed freshness API
- `.planning/phases/78-dashboard-command-center-game-day-after-action/78-UI-SPEC.md` — approved visual contract

### Secondary (MEDIUM confidence)

- `.planning/phases/77-data-health-page-backup-export/77-CONTEXT.md` — D-06 localStorage key naming (assumed, not yet implemented)
- `.planning/STATE.md` — gameDayStore versioning warning

---

## Metadata

**Confidence breakdown:**

- Schema: HIGH — files read directly, critical findings documented
- Standard Stack: HIGH — no new packages; all from existing codebase
- Architecture: HIGH — patterns traced from existing production code
- Pitfalls: HIGH — derived from actual schema inspection, not assumptions

**Research date:** 2026-05-15
**Valid until:** 2026-06-14 (30 days — stable internal codebase)
