# Phase 78: Dashboard Command Center + Game Day After-Action — Pattern Map

**Mapped:** 2026-05-15
**Files analyzed:** 12 new/modified files
**Analogs found:** 12 / 12

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/features/dashboard/NextPaintingActionCard.tsx` | component | request-response | `src/features/dashboard/CurrentFocusCard.tsx` | exact |
| `src/features/dashboard/ReadyToPlayCard.tsx` | component | request-response | `src/features/dashboard/ArmyReadinessCard.tsx` | exact |
| `src/features/dashboard/DataHealthSummaryCard.tsx` | component | request-response | `src/features/dashboard/ArmyReadinessCard.tsx` | role-match |
| `src/hooks/useNextPaintingAction.ts` | hook | request-response | `src/hooks/useRecipeAssignments.ts` | role-match |
| `src/db/queries/recipeAssignments.ts` | query | CRUD | `src/db/queries/battleLogs.ts` | role-match |
| `src/db/queries/battleLogs.ts` | query | CRUD | `src/db/queries/battleLogs.ts` | exact (extend) |
| `src/types/battleLog.ts` | model | — | `src/types/battleLog.ts` | exact (extend) |
| `src/features/battle-log/BattleLogSheet.tsx` | component | CRUD | `src/features/battle-log/BattleLogSheet.tsx` | exact (extend) |
| `src/features/battle-log/battleLogSchema.ts` | model | — | `src/features/battle-log/battleLogSchema.ts` | exact (extend) |
| `src/features/game-day/GameDayHeader.tsx` | component | event-driven | `src/features/game-day/GameDayHeader.tsx` | exact (extend) |
| `src/features/game-day/ChecklistTab.tsx` | component | request-response | `src/features/game-day/ChecklistTab.tsx` | exact (extend) |
| `src/features/dashboard/DashboardPage.tsx` | component | request-response | `src/features/dashboard/DashboardPage.tsx` | exact (extend) |

---

## Pattern Assignments

### `src/features/dashboard/NextPaintingActionCard.tsx` (component, request-response)

**Analog:** `src/features/dashboard/CurrentFocusCard.tsx`

**Imports pattern** (lines 15–23):
```typescript
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, ExternalLink, Paintbrush, Palette, Layers } from "lucide-react";
import { UnitThumbnail } from "@/components/common/UnitThumbnail";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";
```

**Empty state pattern** (lines 39–48):
```typescript
if (!unit) {
  return (
    <Card className="bg-card border border-border/60 shadow-sm px-6 py-6 transition-shadow duration-150 hover:shadow-md">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Target size={16} className="shrink-0" aria-hidden="true" />
        <p className="text-sm">
          No active project — mark one in Projects to focus on it here.
        </p>
      </div>
    </Card>
  );
}
```

**Card shell pattern** (lines 53–58):
```typescript
<Card
  style={{ borderLeftColor: accent }}
  className="bg-card border border-border/60 border-l-4 shadow-sm px-6 py-5 transition-shadow duration-150 hover:shadow-md"
  aria-label={`Current focus: ${unit.name}`}
>
```

**Section label pattern** (line 63):
```typescript
<p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
  Next Painting Action
</p>
```

**Step info display pattern** (lines 76–80 as adapted):
```typescript
{step && (
  <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
    <Layers size={12} aria-hidden className="shrink-0" />
    {step.section_name}: {step.description}
  </span>
)}
```

---

### `src/features/dashboard/ReadyToPlayCard.tsx` (component, request-response)

**Analog:** `src/features/dashboard/ArmyReadinessCard.tsx`

**Imports pattern** (lines 17–24):
```typescript
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useArmyReadiness, useArmyReadinessTarget, ARMY_READINESS_TARGETS } from "@/hooks/useArmyReadiness";
import type { FactionReadiness } from "@/db/queries/dashboard";
```

**Loading skeleton pattern** (lines 31–47):
```typescript
if (isLoading) {
  return (
    <section className="flex flex-col gap-4">
      <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Army Readiness
      </p>
      <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm transition-shadow duration-150 hover:shadow-md">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </section>
  );
}
```

**Empty state pattern** (lines 49–63):
```typescript
if (!factions || factions.length === 0) {
  return (
    <section className="flex flex-col gap-4">
      <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Army Readiness
      </p>
      <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm transition-shadow duration-150 hover:shadow-md">
        <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
          <Shield size={20} className="opacity-40" />
          <span className="text-sm">Add units to see army readiness</span>
        </div>
      </div>
    </section>
  );
}
```

**Card wrapper pattern** (line 85):
```typescript
<div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm transition-shadow duration-150 hover:shadow-md">
```

**Inline metric display** (lines 96–118, adapted for single-list view):
```typescript
// Progress bar with faction color
<div className="h-1.5 w-full rounded-full bg-border/40">
  <div
    className="h-1.5 rounded-full transition-all duration-500"
    style={{ width: `${pct}%`, backgroundColor: row.color_theme }}
  />
</div>
<span className={`text-xs tabular-nums ${isTargetMet ? "text-battle-gold" : "text-muted-foreground"}`}>
  {row.points_painted} / {target} pts ready, {row.points_owned} pts owned
</span>
```

**Sync freshness display** — reuse `getSyncFreshness` + `FRESHNESS_DOT_CLASS` from `src/lib/syncFreshness.ts` (lines 14–40):
```typescript
import { getSyncFreshness, getSyncAgeLabel, FRESHNESS_DOT_CLASS } from "@/lib/syncFreshness";
// Usage:
const freshness = getSyncFreshness(syncMeta?.last_sync_at ?? null);
const dotClass = FRESHNESS_DOT_CLASS[freshness];
// <span className={cn("inline-block h-2 w-2 rounded-full", dotClass)} />
```

---

### `src/features/dashboard/DataHealthSummaryCard.tsx` (component, request-response)

**Analog:** `src/features/dashboard/ArmyReadinessCard.tsx` + `src/hooks/useDiagnostics.ts`

**Imports pattern:**
```typescript
import { Shield, AlertTriangle, HardDrive } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useRulesSyncMeta } from "@/hooks/useDatasheet";
import { useDiagnosticFlags, useBackupStatus, BACKUP_STORAGE_KEY } from "@/hooks/useDiagnostics";
import { getSyncFreshness, getSyncAgeLabel, FRESHNESS_DOT_CLASS } from "@/lib/syncFreshness";
import { Link } from "@tanstack/react-router";
```

**Backup status read pattern** from `src/hooks/useDiagnostics.ts` (lines 65–73):
```typescript
export function useBackupStatus(): BackupStatus | null {
  try {
    const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BackupStatus;
  } catch {
    return null;
  }
}
// BACKUP_STORAGE_KEY = "lastBackup"
// BackupStatus shape: { date: string; path: string; success: boolean }
```

**DiagnosticFlags shape** from `src/db/queries/diagnostics.ts` (line 171):
```typescript
// getDiagnosticFlags() returns DiagnosticFlag[]
// Each flag: { type: string; count: number; description: string; severity: "warning" }
// Total warning count: flags.length (or flags.reduce((s,f) => s + f.count, 0))
```

**Link to detail page** — use TanStack Router `Link` component matching router pattern:
```typescript
import { Link } from "@tanstack/react-router";
// <Link to="/data-health" className="text-xs text-muted-foreground underline">View details</Link>
```

**Card section wrapper** (lines 65–93 from ArmyReadinessCard adapted):
```typescript
<section className="flex flex-col gap-4">
  <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
    Data Health
  </p>
  <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm transition-shadow duration-150 hover:shadow-md">
    {/* three metrics inline */}
  </div>
</section>
```

---

### `src/hooks/useNextPaintingAction.ts` (hook, request-response)

**Analog:** `src/hooks/useRecipeAssignments.ts`

**Key + useQuery pattern** (lines 17–54):
```typescript
export const NEXT_PAINTING_ACTION_KEY = ["next-painting-action"] as const;

export function useNextPaintingAction(): UseQueryResult<NextPaintingAction | null> {
  return useQuery({
    queryKey: NEXT_PAINTING_ACTION_KEY,
    queryFn: getMostRecentAssignmentWithIncompleteStep,  // new query in recipeAssignments.ts
  });
}
```

**Chained query pattern** from `src/features/dashboard/DashboardPage.tsx` (lines 97–120):
```typescript
// The DashboardPage shows the approved composition pattern:
const { data: focusAssignments = [] } = useAssignmentsByUnit(focusUnitId ?? undefined);
const primaryAssignment = focusAssignments.length > 0
  ? focusAssignments[focusAssignments.length - 1]
  : undefined;
const { data: focusStepProgress = [] } = useStepProgress(primaryAssignment?.id);
const { data: focusRecipeSteps = [] } = useRecipePaints(primaryAssignment?.recipe_id);
// BUT: useNextPaintingAction must avoid N+1 — use a single SQL query in the DB layer instead.
```

**Enabled-guard pattern** (lines 33–37 from useAssignmentsByUnit):
```typescript
export function useAssignmentsByUnit(unitId: number | undefined) {
  return useQuery({
    queryKey: unitId !== undefined ? UNIT_ASSIGNMENTS_KEY(unitId) : ["recipe-assignments"],
    queryFn: () => (unitId !== undefined ? getAssignmentsByUnit(unitId) : Promise.resolve([])),
    enabled: unitId !== undefined,
  });
}
```

---

### `src/db/queries/recipeAssignments.ts` (query, CRUD — new function: `getMostRecentAssignmentWithIncompleteStep`)

**Analog:** `src/db/queries/recipeAssignments.ts` (existing functions) + `src/db/queries/battleLogs.ts` (JOIN query pattern)

**Existing SELECT pattern** (lines 11–17):
```typescript
export async function getAssignmentsByUnit(unitId: number): Promise<RecipeAssignment[]> {
  const db = await getDb();
  return db.select<RecipeAssignment[]>(
    "SELECT * FROM unit_recipe_assignments WHERE unit_id = $1 ORDER BY created_at ASC",
    [unitId],
  );
}
```

**New query shape to add** (prevents N+1 per RESEARCH Pitfall 6):
```typescript
export interface FirstIncompleteStep {
  assignment_id: number;
  unit_id: number;
  recipe_id: number;
  recipe_step_id: number;
  description: string;
  section_name: string | null;
  order_index: number;
  time_estimate: number | null;   // verify column exists in recipe_steps first
  created_at: string;             // assignment created_at for sort
}

export async function getMostRecentAssignmentWithIncompleteStep(): Promise<FirstIncompleteStep | null> {
  const db = await getDb();
  const rows = await db.select<FirstIncompleteStep[]>(
    `SELECT
       a.id AS assignment_id,
       a.unit_id,
       a.recipe_id,
       rs.id AS recipe_step_id,
       rs.description,
       rs.section_name,
       rs.order_index,
       rs.time_estimate,
       a.created_at
     FROM unit_recipe_assignments a
     JOIN recipe_steps rs ON rs.recipe_id = a.recipe_id
     LEFT JOIN unit_recipe_step_progress p
       ON p.assignment_id = a.id AND p.recipe_step_id = rs.id
     WHERE p.id IS NULL
     ORDER BY a.created_at DESC, rs.order_index ASC
     LIMIT 1`
  );
  return rows[0] ?? null;
}
```

---

### `src/db/queries/battleLogs.ts` (query, CRUD — extend: `getRecentForgottenRules` + `forgotten_rules` in create/update)

**Analog:** `src/db/queries/battleLogs.ts` (self — extend)

**Existing SELECT pattern** (lines 22–27):
```typescript
export async function getBattleLogs(): Promise<BattleLog[]> {
  const db = await getDb();
  return db.select<BattleLog[]>(
    "SELECT * FROM battle_logs ORDER BY battle_date DESC, created_at DESC"
  );
}
```

**New query to add:**
```typescript
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
    try {
      const rules = JSON.parse(row.forgotten_rules!) as string[];
      for (const r of rules) if (r.trim()) seen.add(r.trim());
    } catch {
      // malformed JSON — skip row, log warning
      console.warn("getRecentForgottenRules: malformed JSON in row", row.forgotten_rules);
    }
  }
  return [...seen];
}
```

**Extended `createBattleLog` column list pattern** (lines 37–63 — add `forgotten_rules` as $15):
```typescript
// INSERT must add forgotten_rules to column list and params array
// Write path serialization:
forgotten_rules: values.forgotten_rules
  ? JSON.stringify(values.forgotten_rules.split('\n').filter(Boolean))
  : null,
```

**Extended `updateBattleLog` SET clause pattern** (lines 70–98 — add `forgotten_rules = $16`):
```typescript
// Same full-replacement pattern — forgotten_rules must be clearable to NULL
// Do NOT use COALESCE for this column
```

---

### `src/types/battleLog.ts` (model — extend)

**Analog:** `src/types/battleLog.ts` (self — extend)

**Existing type shape** (lines 15–33):
```typescript
export interface BattleLog {
  id: number;
  army_list_id: number | null;
  battle_date: string;
  // ... existing fields ...
  notes: string | null;
  created_at: string;
  // NO updated_at — schema does not have one
}
export type CreateBattleLogInput = Omit<BattleLog, "id" | "created_at">;
export type UpdateBattleLogInput = CreateBattleLogInput & { id: number };
```

**New fields to add** (from migration 027 — all four columns exist in DB but not in type):
```typescript
export interface BattleLog {
  // ... existing fields ...
  forgotten_rules: string | null;      // JSON TEXT: serialized string[]
  mvp_notes: string | null;            // free-text notes on MVP unit
  underperformer_notes: string | null; // free-text notes on underperformer
  promoted_to_reminder: number;        // 0 | 1 boolean
  created_at: string;
}
```

---

### `src/features/battle-log/BattleLogSheet.tsx` (component, CRUD — extend)

**Analog:** `src/features/battle-log/BattleLogSheet.tsx` (self — extend)

**DEFAULT_VALUES and buildDefaultValues pattern** (lines 48–85):
```typescript
const DEFAULT_VALUES: BattleLogFormValues = {
  battle_date: todayISO(),
  opponent_faction: "",
  // ... existing fields ...
  notes: null,
  // Add:
  forgotten_rules: null,
  mvp_notes: null,
  underperformer_notes: null,
};

// Extended to accept prefill for End Game flow (D-11):
function buildDefaultValues(
  log: BattleLog | null,
  prefill?: Partial<BattleLogFormValues>
): BattleLogFormValues {
  if (log) {
    return { /* existing edit mode — map all fields including forgotten_rules */ };
  }
  return { ...DEFAULT_VALUES, battle_date: todayISO(), ...prefill };
}
```

**Props extension for End Game prefill** (lines 87–95):
```typescript
export function BattleLogSheet({
  open,
  log,
  onClose,
  prefill,         // NEW: Partial<BattleLogFormValues> for End Game pre-population
}: {
  open: boolean;
  log: BattleLog | null;
  onClose: () => void;
  prefill?: Partial<BattleLogFormValues>;  // NEW
}) {
  const isEdit = log !== null;
  const isPrefilled = prefill !== undefined && log === null;
```

**Collapsible section pattern** — import from shadcn/ui (no install needed per RESEARCH):
```typescript
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
// Usage (after the existing Group 4 Separator):
<Collapsible defaultOpen={false}>
  <CollapsibleTrigger className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-full">
    After-Action
    <ChevronDown size={12} className="ml-auto" />
  </CollapsibleTrigger>
  <CollapsibleContent className="flex flex-col gap-4 pt-2">
    {/* MVP, underperformer, lessons_learned, changes_next_time, forgotten_rules */}
  </CollapsibleContent>
</Collapsible>
```

**Textarea pattern** (lines 44–46, reuse `TEXTAREA_CLASS`):
```typescript
const TEXTAREA_CLASS =
  "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
// forgotten_rules textarea: same class, rows={4}, placeholder="One rule per line…"
```

**Error handling pattern** (lines 138–142):
```typescript
} catch {
  toast.error("Something went wrong. Please try again.");
  // Sheet stays open so user can retry
}
```

**Sheet title for End Game mode** (lines 148–154):
```typescript
<SheetTitle>{isEdit ? "Edit Game" : isPrefilled ? "End Game" : "Log Game"}</SheetTitle>
```

---

### `src/features/game-day/GameDayHeader.tsx` (component, event-driven — extend)

**Analog:** `src/features/game-day/GameDayHeader.tsx` (self — extend)

**Existing imports** (lines 1–7):
```typescript
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Plus, Minus, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useGameDayStore, useGameDayListState } from "./gameDayStore";
```

**Props interface** (lines 8–14) — add `onEndGame` callback:
```typescript
interface GameDayHeaderProps {
  listName: string;
  factionName: string | null;
  detachmentName: string | null;
  listId: number;
  onEndGame: () => void;  // NEW: opens BattleLogSheet pre-filled
}
```

**Button placement** — add "End Game" button in the top-row actions area (after back button block, near CP tracker), using visually distinct variant:
```typescript
// Companion pattern from DashboardPage.tsx (line 323-330):
<Button
  variant="outline"
  size="sm"
  onClick={() => { /* ... */ }}
>
  <Paintbrush size={14} className="mr-1.5" aria-hidden={true} />
  Log Session
</Button>
// For End Game: use accent-outlined style or variant="default" to stand out
```

**BattleLogSheet sibling portal** — owned in `GameDayPage`, not nested in `GameDayHeader`. Header receives `onEndGame` callback, GameDayPage manages sheet state (matches DashboardPage.tsx Pitfall 1 contract):
```typescript
// In GameDayPage:
const [endGameOpen, setEndGameOpen] = useState(false);
// ...
<GameDayHeader ... onEndGame={() => setEndGameOpen(true)} />
// Sibling:
<BattleLogSheet
  open={endGameOpen}
  log={null}
  prefill={{ army_list_id: listId, battle_date: todayISO(), opponent_faction: "" }}
  onClose={() => setEndGameOpen(false)}
/>
```

---

### `src/features/game-day/ChecklistTab.tsx` (component, request-response — extend)

**Analog:** `src/features/game-day/ChecklistTab.tsx` (self — extend)

**Existing imports** (lines 1–7):
```typescript
import { useState } from "react";
import { Plus, RotateCcw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useGameDayStore, useGameDayListState } from "./gameDayStore";
```

**New imports for forgotten rules:**
```typescript
import { useQuery } from "@tanstack/react-query";
import { getRecentForgottenRules } from "@/db/queries/battleLogs";
import { AlertTriangle } from "lucide-react";
```

**Forgotten rules query** (new `useQuery` call inside `ChecklistTab`):
```typescript
const { data: forgottenRules = [] } = useQuery({
  queryKey: ["forgotten-rules", listId],
  queryFn: () => getRecentForgottenRules(listId),
  enabled: listId !== undefined,
});
```

**Forgotten rules rendering** (insert above checklist items, visually distinct):
```typescript
// Render ABOVE the checklist items div — use amber styling per CONTEXT D-15/Specifics:
{forgottenRules.length > 0 && (
  <div className="flex flex-col gap-1 px-4 pb-2">
    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
      Reminders from last games
    </p>
    {forgottenRules.map((rule, i) => (
      <div key={i} className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
        <AlertTriangle size={12} className="mt-0.5 shrink-0 text-amber-500" aria-hidden />
        <span className="text-xs text-amber-800">{rule}</span>
      </div>
    ))}
  </div>
)}
```

---

### `src/features/dashboard/DashboardPage.tsx` (component, request-response — extend)

**Analog:** `src/features/dashboard/DashboardPage.tsx` (self — extend)

**New card imports** to add alongside existing dashboard imports (lines 54–62):
```typescript
import { NextPaintingActionCard } from "./NextPaintingActionCard";
import { ReadyToPlayCard } from "./ReadyToPlayCard";
import { DataHealthSummaryCard } from "./DataHealthSummaryCard";
```

**CSS grid placement** — new cards go in the right column `flex flex-col gap-6` (lines 426–443), added below `ArmyReadinessCard`:
```typescript
// Right column receives three new cards stacked below existing ArmyReadinessCard:
<div className="flex flex-col gap-6">
  {/* ... existing ActiveProjectsPanel, RecentActivityFeed, ArmyReadinessCard ... */}
  <NextPaintingActionCard />
  <ReadyToPlayCard />
  <DataHealthSummaryCard />
</div>
```

**Sibling portal contract** (comment at line 445):
```
// Pitfall 1: SIBLINGS, never nested. New cards do NOT open Sheets — they link out.
// No portal additions needed for the three new dashboard cards.
```

---

## Shared Patterns

### React Query Hook Structure
**Source:** `src/hooks/useRecipeAssignments.ts` (lines 17–54)
**Apply to:** `useNextPaintingAction.ts`
```typescript
export const ENTITY_KEY = ["entity-name"] as const;
export const ENTITY_BY_X_KEY = (x: number) => ["entity-name", "by-x", x] as const;

export function useEntity(id: number | undefined) {
  return useQuery({
    queryKey: id !== undefined ? ENTITY_BY_X_KEY(id) : ENTITY_KEY,
    queryFn: () => id !== undefined ? getEntity(id) : Promise.resolve(null),
    enabled: id !== undefined,
  });
}
```

### SQLite Query Pattern
**Source:** `src/db/queries/battleLogs.ts` (lines 36–63)
**Apply to:** `battleLogs.ts` (getRecentForgottenRules), `recipeAssignments.ts` (getMostRecentAssignmentWithIncompleteStep)
```typescript
export async function queryFunction(input: SomeType): Promise<ResultType> {
  const db = await getDb();
  const rows = await db.select<ResultType[]>(
    `SELECT ... FROM table WHERE col = $1 ORDER BY col DESC`,
    [input.param]
  );
  return rows[0] ?? null;
}
// Full-replacement UPDATE — never COALESCE on nullable FK columns
// Positional $1, $2 params — not named params, not ?
```

### Dashboard Card Section Wrapper
**Source:** `src/features/dashboard/ArmyReadinessCard.tsx` (lines 65–93)
**Apply to:** `NextPaintingActionCard.tsx`, `ReadyToPlayCard.tsx`, `DataHealthSummaryCard.tsx`
```typescript
<section className="flex flex-col gap-4">
  <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
    Card Title
  </p>
  <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm transition-shadow duration-150 hover:shadow-md">
    {/* content */}
  </div>
</section>
```

### Empty State
**Source:** `src/features/dashboard/ArmyReadinessCard.tsx` (lines 49–63)
**Apply to:** All three new dashboard cards
```typescript
<div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
  <Shield size={20} className="opacity-40" />
  <span className="text-sm">Prompt text here</span>
</div>
```

### Sheet Form (RHF + Zod)
**Source:** `src/features/battle-log/BattleLogSheet.tsx` (lines 1–499)
**Apply to:** `BattleLogSheet.tsx` (extend)
```typescript
// Full pattern: useForm + zodResolver + useEffect reset + onSubmit try/catch + toast
const form = useForm<BattleLogFormValues>({
  resolver: zodResolver(battleLogSchema),
  defaultValues: buildDefaultValues(log),
});
useEffect(() => {
  form.reset(buildDefaultValues(log));
}, [log, form]);
```

### Error Handling (Toast)
**Source:** `src/features/battle-log/BattleLogSheet.tsx` (lines 139–142)
**Apply to:** `BattleLogSheet.tsx` (extended mutations)
```typescript
} catch {
  toast.error("Something went wrong. Please try again.");
  // Sheet stays open so user can retry
}
```

### JSON Serialization for TEXT column
**Source:** RESEARCH.md Pattern 3 — new pattern, no existing analog
**Apply to:** `battleLogs.ts` create/update queries, `BattleLogSheet.tsx` onSubmit
```typescript
// Write: serialize textarea (newline-separated) to JSON array
forgotten_rules: values.forgotten_rules
  ? JSON.stringify(values.forgotten_rules.split('\n').filter(Boolean))
  : null,

// Read: parse JSON array, wrap in try/catch
const rules: string[] = (() => {
  try { return JSON.parse(row.forgotten_rules!) as string[]; }
  catch { return []; }
})();
```

---

## Test Patterns

### Component test with mocked hooks
**Source:** `tests/dashboard/ArmyReadinessCard.test.tsx` (lines 1–65)
**Apply to:** `tests/dashboard/NextPaintingActionCard.test.tsx`, `ReadyToPlayCard.test.tsx`, `DataHealthSummaryCard.test.tsx`
```typescript
import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

let mockData: SomeType | undefined = undefined;
let mockIsLoading = false;

vi.mock("@/hooks/useSomeHook", () => ({
  useSomeHook: () => ({ data: mockData, isLoading: mockIsLoading }),
}));

// Import after vi.mock
import { MyCard } from "@/features/dashboard/MyCard";

beforeEach(() => {
  vi.clearAllMocks();
  mockData = MOCK_DATA;
  mockIsLoading = false;
});
```

### Component test with Zustand store mock
**Source:** `tests/game-day/PreGameChecklist.test.tsx` (lines 1–41)
**Apply to:** `tests/game-day/ChecklistTab.test.tsx` (extend), `tests/game-day/GameDayHeader.test.tsx`
```typescript
vi.mock("@/features/game-day/gameDayStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/game-day/gameDayStore")>();
  return {
    ...actual,
    useGameDayStore: () => ({
      toggleChecklistItem: mockToggle,
      addChecklistItem: mockAdd,
      resetChecklist: mockReset,
    }),
    useGameDayListState: (): GameDayListState => ({
      cp: 0,
      prevCp: null,
      startingCp: 0,
      checklistItems: mockChecklistItems,
      usedAbilities: [],
    }),
  };
});
```

### Props-only component test (no QueryClient needed)
**Source:** `tests/dashboard/CurrentFocusCard.test.tsx` (lines 1–50)
**Apply to:** `tests/dashboard/NextPaintingActionCard.test.tsx`
```typescript
// CurrentFocusCard test pattern: makeUnit/makeFaction/makePhoto fixture factories
// Mock Tauri-calling hooks at module level with vi.mock
// Render with plain render() — no QueryClientProvider wrapper needed for props-only components
vi.mock("@/hooks/useUnitPhotos", () => ({
  useLatestUnitPhotos: vi.fn().mockReturnValue({ data: new Map() }),
}));
```

---

## No Analog Found

All files have direct or role-match analogs. No files require falling back to RESEARCH.md patterns exclusively — though the JSON serialization pattern for `forgotten_rules` is novel and should follow the concrete pattern documented in the Shared Patterns section above.

---

## Critical Constraints to Preserve

1. **Sibling portal contract** (`DashboardPage.tsx` line 445 comment): `BattleLogSheet` for End Game lives in `GameDayPage` as a top-level sibling, not nested inside `GameDayHeader`. New dashboard cards do NOT open sheets.

2. **Full-replacement UPDATE** (`battleLogs.ts` lines 70–98): `forgotten_rules` column must be clearable to NULL in `updateBattleLog`. Never use COALESCE for this or any nullable FK column.

3. **`unit_recipe_assignments` has no `updated_at`** (`recipeAssignments.ts`, migration 021): sort by `created_at DESC` in `getMostRecentAssignmentWithIncompleteStep`. Do not reference `updated_at`.

4. **Migration 027 already added `forgotten_rules`**: migration 029 must NOT try to add this column again. Use `ADD COLUMN IF NOT EXISTS` or scope 029 to a different concern. Verify migration 027 columns before writing 029.

5. **`BattleLog` type currently missing 4 columns** (confirmed in `src/types/battleLog.ts`): `forgotten_rules`, `mvp_notes`, `underperformer_notes`, `promoted_to_reminder` exist in DB but not in the TypeScript type. Wave 0 must add all four.

6. **Positional SQL params** (`$1, $2` — not `?`): all new query functions must use Tauri plugin-sql positional syntax.

7. **After-action fields MOVE into collapsible**: `mvp_unit_id`, `underperforming_unit_id`, `lessons_learned`, `changes_next_time` currently appear in Groups 3 and 4 of `BattleLogSheet`. Per D-12/D-13 and RESEARCH anti-patterns, these must be MOVED into the collapsible section — not duplicated.

---

## Metadata

**Analog search scope:** `src/features/dashboard/`, `src/features/battle-log/`, `src/features/game-day/`, `src/hooks/`, `src/db/queries/`, `src/types/`, `tests/dashboard/`, `tests/game-day/`
**Files scanned:** 18
**Pattern extraction date:** 2026-05-15
