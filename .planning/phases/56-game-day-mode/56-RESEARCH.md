# Phase 56: Game Day Mode - Research

**Researched:** 2026-05-11
**Domain:** In-game reference UI — TanStack Router, Zustand, Zustand persist pattern, shadcn Tabs/Collapsible/Checkbox, cross-query data composition
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- New route `/game-day/$listId` in TanStack Router — full page, not a Sheet
- "Game Day" button on ArmyListDetailSheet navigates to `/game-day/{list.id}`
- Header: list name, faction badge, detachment name, back arrow to `/army-lists`
- Tabbed layout: 3 tabs — Stratagems / Units / Checklist
- User-marked reminders (is_reminder=1) pinned at the top of the Stratagems tab
- CP tracker in page header area, always visible across all tabs
- Starting CP is user-configurable (default 0); +1 button for gaining CP
- Single undo for last CP spend (stores previous CP value)
- CP state persists via Zustand persist (localStorage), keyed by army list ID
- Stratagems grouped by phase: Command, Movement, Shooting, Charge, Fight
- Reuse `PHASE_STYLES` from StratagemCard; each group has a collapsible header
- Stratagem cards reuse `StratagemCard` component or a simplified variant without annotation controls
- Tapping a stratagem spends CP; cards show cp_cost prominently
- Reminders section pinned at top before phase groups
- Dedicated Checklist tab with hardcoded default steps + user-addable custom items
- Default steps: "Verify army list points", "Check detachment rules", "Review stratagems", "Confirm faction rules", "Set up terrain"
- User can add custom checklist items via inline text input + add button
- Checked items persist; manual "Reset All" button to uncheck everything
- Checklist state persists via Zustand persist (localStorage) keyed by army list ID
- Units tab: all units as collapsible cards (collapsed by default)
- Card header: unit name + painting status badge (reuse StatusBadge pattern)
- Expanded card shows: strategy notes (hobbyforge.db), datasheet abilities (rules.db if linked)
- Once-per-game abilities show a used/unused toggle; toggle state persists via Zustand persist
- Painting status badge uses `status_painting` field from ArmyListUnitRow
- NOT persisting game state in SQLite (deferred to future)
- No victory point tracking, no turn counters

### Claude's Discretion
- Exact tab styling and icon choices for the 3 tabs
- Loading skeleton layout for the page
- Whether stratagem cards in Game Day mode are interactive (collapsible) or always-expanded
- Spacing and density of unit ability cards
- Empty states for tabs when no data available
- Whether to show detachment ability in a dedicated header card or within Stratagems tab

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GAME-01 | User can launch Game Day mode from an army list | ArmyListDetailSheet.tsx — add Game Day button with `router.navigate({ to: '/game-day/$listId' })`; router.tsx — register new route with `$listId` param |
| GAME-02 | User can view detachment stratagems grouped by game phase | `useStratagemsByDetachment(detachmentId)` returns `RwStratagem[]`; group by `stratagem.phase` using `PHASE_STYLES` map; Collapsible group headers |
| GAME-03 | User can track CP spent/remaining during a game | Zustand store in `gameDayStore.ts` keyed by listId; CP state: `{ cp: number; prevCp: number \| null }`; spendCp(cost), gainCp(), undoCp(), setStartingCp(n) actions |
| GAME-04 | User can view a pre-game checklist | Zustand store: checklist items per listId (`{ id, text, checked }`[]); localStorage persistence; Reset All button |
| GAME-05 | User can view unit ability reminders for units | `useArmyListWithUnits(listId)` for unit list; per-unit `useDatasheet(unit_id)` for datasheet abilities; `useStrategyNote` for user notes |
| GAME-06 | User can view once-per-game abilities with used/unused toggle | `RwDatasheetAbility.type` contains "Once per battle" markers; toggle stored in Zustand gameDayStore per listId + ability key |
| GAME-07 | User can view user-marked reminders from Playbook favorites | `useRulesFavorites()` filtered to `is_reminder === 1`; RemindersSection pattern |
| GAME-08 | User can see painting status of units in the list | `ArmyListUnitRow.status_painting` (string) — render as Badge variant="secondary" per ArmyListUnitRow.tsx pattern |
</phase_requirements>

---

## Summary

Phase 56 is a pure UI composition phase — no new database migrations, no new query modules. Every data source needed already exists: `useArmyListWithUnits` for the list and units, `useStratagemsByDetachment` for stratagems, `useRulesFavorites` for reminders, and `useDatasheet` for per-unit abilities. The only new infrastructure is a Zustand store for ephemeral game state (CP tracker, checklist, once-per-game toggles) backed by localStorage.

The primary implementation risk is the once-per-game ability detection: `RwDatasheetAbility.type` field holds values like "Core", "Faction", "Datasheet", "Wargear" — it does NOT reliably encode "once per battle" as a structured value. The actual once-per-game signal is in the `description` text or `parameter` field. This requires a heuristic text search. Testing this on real Wahapedia data is needed during implementation.

A secondary design clarification: the codebase has no prior use of `zustand/middleware` persist — all existing localStorage persistence is done via raw `useState` + `useEffect` hooks (`useSidebarCollapsed.ts`, `useCollectionViewMode.ts`). The CONTEXT.md says "Zustand persist (localStorage)" but the project pattern is custom hooks. Either approach is valid; the Zustand middleware approach is cleaner for complex multi-field state (CP + checklist + toggles). Since `zustand@5.0.12` is installed and supports persist middleware natively, using it is appropriate for this store.

**Primary recommendation:** One `gameDayStore.ts` with `zustand/middleware` persist, keyed by army list ID. Split into two plans: (56-01) route + CP tracker + Stratagems tab; (56-02) Units tab + Checklist tab.

---

## Standard Stack

### Core (all already in package.json — no new installs)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | 5.0.12 | Game Day ephemeral state store | Already installed; project standard for UI/filter state |
| zustand/middleware | (bundled with zustand) | persist to localStorage | Cleanest approach for multi-key structured state |
| @tanstack/react-router | 1.168.26 | `/game-day/$listId` route + navigation | Project router |
| shadcn Tabs | (radix-ui 1.4.3) | 3-tab layout (Stratagems/Units/Checklist) | Project UI library |
| shadcn Collapsible | (radix-ui) | Phase group headers + unit cards | Already used in StratagemCard |
| shadcn Checkbox | (radix-ui) | Checklist items | Project UI library |
| shadcn Badge | (radix-ui) | Painting status, phase badges, CP display | Project standard |
| lucide-react | 0.460.0 | Icons (ArrowLeft, Plus, Undo2, RotateCcw, ChevronDown) | Project standard |

**No new packages required.** All dependencies are already installed.

---

## Architecture Patterns

### Recommended File Structure
```
src/
  app/
    game-day/
      page.tsx              # Shell: GameDayPageShell (imports GameDayPage)
  features/
    game-day/
      GameDayPage.tsx       # Page root: data loading + tabbed layout
      GameDayHeader.tsx     # CP tracker + list name/faction/detachment info
      StrategiesTab.tsx     # Reminders pinned + phase-grouped StratagemCards
      UnitsTab.tsx          # Collapsible unit ability cards
      ChecklistTab.tsx      # Checklist items + add + reset
      UnitAbilityCard.tsx   # Per-unit collapsible card (sub-component)
      gameDayStore.ts       # Zustand persist store (CP, checklist, OPG toggles)
  hooks/
    useStrategyNote.ts      # Already exists — useStrategyNote(unitId)
```

### Pattern 1: TanStack Router Dynamic Route with Parsed Param

The existing `recipesRoute` shows how to use `validateSearch`. For a path param like `$listId`, the pattern is:

```typescript
// src/app/router.tsx
import { GameDayPageShell } from "./game-day/page";

const gameDayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/game-day/$listId",
  component: GameDayPageShell,
});

// Add to routeTree children array
```

In the page component, retrieve the param:

```typescript
// src/app/game-day/page.tsx
import { useParams } from "@tanstack/react-router";

export function GameDayPageShell() {
  const { listId } = useParams({ from: "/game-day/$listId" });
  const listIdNum = Number(listId);
  return <GameDayPage listId={listIdNum} />;
}
```

**Navigation from ArmyListDetailSheet:**

```typescript
import { useNavigate } from "@tanstack/react-router";

const navigate = useNavigate();
// In Game Day button handler:
navigate({ to: "/game-day/$listId", params: { listId: String(list.id) } });
```

**Back navigation:**

```typescript
navigate({ to: "/army-lists" });
```

### Pattern 2: Zustand Persist Store (first use in the project)

The project has zustand 5.0.12 installed but has NOT yet used `zustand/middleware` persist — all prior stores are simple `create()` without persist. This is the correct approach for complex structured game state.

```typescript
// src/features/game-day/gameDayStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ChecklistItem {
  id: string;       // uuid or stable key
  text: string;
  checked: boolean;
}

interface GameDayListState {
  cp: number;
  prevCp: number | null;          // for single undo
  startingCp: number;
  checklistItems: ChecklistItem[];
  usedAbilities: Set<string>;     // ability key = `${datasheetId}:${abilityLine}`
}

interface GameDayStore {
  // Keyed by army list ID (string key for localStorage compatibility)
  listStates: Record<string, GameDayListState>;

  // Actions
  setStartingCp: (listId: number, cp: number) => void;
  spendCp: (listId: number, cost: number) => void;
  gainCp: (listId: number) => void;
  undoCp: (listId: number) => void;
  setChecklistItems: (listId: number, items: ChecklistItem[]) => void;
  toggleChecklistItem: (listId: number, itemId: string) => void;
  addChecklistItem: (listId: number, text: string) => void;
  resetChecklist: (listId: number) => void;
  toggleAbilityUsed: (listId: number, abilityKey: string) => void;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: "default-1", text: "Verify army list points", checked: false },
  { id: "default-2", text: "Check detachment rules", checked: false },
  { id: "default-3", text: "Review stratagems", checked: false },
  { id: "default-4", text: "Confirm faction rules", checked: false },
  { id: "default-5", text: "Set up terrain", checked: false },
];

function getListState(state: GameDayStore, listId: number): GameDayListState {
  return state.listStates[String(listId)] ?? {
    cp: 0,
    prevCp: null,
    startingCp: 0,
    checklistItems: DEFAULT_CHECKLIST,
    usedAbilities: new Set(),
  };
}
```

**Persist middleware caveat — Set serialization:** `zustand/middleware` persist uses `JSON.stringify`/`JSON.parse` by default. `Set` is not JSON-serializable. Use a `partialize` + custom `serialize`/`deserialize`, or store used abilities as a plain `string[]` (array of ability keys) and convert to Set on read.

**Simpler approach:** Store `usedAbilities` as `string[]` (array) in the store, check membership with `.includes()`. Avoids serialization complexity with negligible perf impact at personal-use scale.

### Pattern 3: Phase-Grouped Stratagems

```typescript
// In StrategiesTab.tsx
const PHASE_ORDER = ["Command", "Movement", "Shooting", "Charge", "Fight"] as const;

const grouped = useMemo(() => {
  const map = new Map<string, RwStratagem[]>();
  for (const phase of PHASE_ORDER) map.set(phase, []);
  map.set("Other", []);
  for (const s of stratagems) {
    const key = s.phase && map.has(s.phase) ? s.phase : "Other";
    map.get(key)!.push(s);
  }
  return map;
}, [stratagems]);
```

Render reminders (is_reminder=1 favorites) first, then each phase group using shadcn `Collapsible` as a group container.

### Pattern 4: Per-Unit Data Loading (avoid N+1 hooks-in-loop)

The `useDatasheet(unitId)` hook is called per unit. Per STATE.md (55-01): "no N+1 hook pattern — load at page level, build Map, pass to cards." However, `useDatasheet` is a React Query hook, not a direct DB call. The correct pattern is a sub-component per unit, each calling `useDatasheet` once:

```typescript
// UnitAbilityCard.tsx — each is its own component instance
export function UnitAbilityCard({ unit }: { unit: ArmyListUnitRow }) {
  const { data: datasheet } = useDatasheet(unit.unit_id);
  const { data: strategyNote } = useStrategyNote(unit.unit_id);
  // ...
}
```

This satisfies Rules of Hooks (hook per component instance, not per loop iteration). Same pattern as `DetachmentAbilityRow` (55-02) and `DetachmentCard` inside `DetachmentCard.map()` (53-03).

### Pattern 5: Once-Per-Game Ability Detection

`RwDatasheetAbility` has fields: `type` (Core/Faction/Datasheet/Wargear/Primarch), `description`, `parameter`. The Wahapedia schema does NOT have a dedicated boolean for once-per-battle. Detection must be heuristic:

```typescript
function isOncePerGame(ability: RwDatasheetAbility): boolean {
  const text = `${ability.name ?? ""} ${ability.description ?? ""} ${ability.parameter ?? ""}`.toLowerCase();
  return text.includes("once per battle") || text.includes("once per game");
}
```

**Flag this as LOW confidence** — actual Wahapedia data quality needs verification during implementation. If no abilities match, the toggle section simply does not appear.

### Anti-Patterns to Avoid

- **Hooks in loop:** Never call `useDatasheet(unit.unit_id)` inside `units.map(u => ...)` directly — always use a sub-component (UnitAbilityCard) per unit.
- **Nested portals:** GameDayPage is a full page, not inside a Sheet. No portal nesting issue. Do NOT open a Sheet/Dialog inside GameDayPage that is itself inside a Sheet.
- **Parsing cp_cost to number for math:** `cp_cost` is TEXT in SQLite (`s.cp_cost === "1"`). For CP subtraction: `const cost = parseInt(s.cp_cost ?? "0", 10) || 0` — do NOT use `Number()` on potentially undefined.
- **useWahapediaFactionId with integer:** Faction lookup via `useWahapediaFactionId(faction.name)` — pass the name string, not `faction_id` integer (silent empty array otherwise — STATE.md).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stratagem display | Custom stratagem card | `StratagemCard` (from Phase 53) | Already has PHASE_STYLES, cp_cost badge, collapsible, annotation controls |
| Reminder display | Custom reminder list | `RemindersSection` pattern | Already filters is_reminder=1, has type badges |
| Painting status badge | Custom badge | `<Badge variant="secondary">{unit.status_painting}</Badge>` | Same as ArmyListUnitRow.tsx line 124 |
| Phase color coding | Custom color map | `PHASE_STYLES` from StratagemCard | Already defined, tested |
| localStorage persistence | Custom serialization | `zustand/middleware` persist | Handles hydration, serialization, storage key namespacing |
| Tab layout | Custom tab UI | shadcn `<Tabs>` | Already used throughout the app |
| Collapsible sections | Custom expand/collapse | shadcn `<Collapsible>` | Already used in StratagemCard |

---

## Common Pitfalls

### Pitfall 1: StratagemCard requires annotation hooks — use simplified variant for Game Day
**What goes wrong:** `StratagemCard` directly calls `useUpsertRulesFavorite()` and `useDeleteRulesFavorite()` inside the component. In Game Day mode, annotation controls are not wanted. If you pass `favorite={null} note={null}` (as DetachmentRulesSection does), the annotation controls still render (buttons appear) — they just have no visible highlight. This may be acceptable per CONTEXT.md ("simplified variant without annotation controls").
**How to avoid:** Either (a) pass `favorite={null} note={null}` and accept the controls are visible but inactive, or (b) create `GameDayStratagemCard.tsx` that strips annotation controls but preserves PHASE_STYLES and cp_cost display. Decision deferred to Claude's Discretion.
**Warning signs:** Annotation controls appearing in Game Day mode when user taps a stratagem — they'd open favorite/note interactions mid-game.

### Pitfall 2: Zustand persist + Set not JSON-serializable
**What goes wrong:** Storing `usedAbilities: Set<string>` in a Zustand persist store causes `JSON.stringify` to produce `{}` (empty object), losing all toggle state on navigation.
**How to avoid:** Store as `usedAbilities: string[]` and check with `includes()`. If Set performance matters at scale, convert on read (`new Set(state.usedAbilities)`).

### Pitfall 3: cp_cost is TEXT, not number
**What goes wrong:** Treating `stratagem.cp_cost` as a number causes NaN when it's null, "Free", or "0".
**How to avoid:** `const cost = parseInt(s.cp_cost ?? "0", 10) || 0` — fallback to 0 for Free/null stratagems. The CP tracker should silently spend 0 for free stratagems (or show a "Free" badge without a spend button).

### Pitfall 4: useArmyListWithUnits returns array, not object
**What goes wrong:** `useArmyListWithUnits(listId)` returns `ArmyListUnitRow[]` (the units), not an `ArmyListWithUnits` object. The list metadata (name, faction_id, detachment_id) must be loaded separately via `useArmyList(listId)`.
**How to avoid:** Load both: `useArmyList(listId)` for list metadata, `useArmyListWithUnits(listId)` for units. Confirmed by reading `src/hooks/useArmyLists.ts` lines 60-66.

### Pitfall 5: Once-per-game detection may return zero matches
**What goes wrong:** If Wahapedia data does not use "once per battle" in the text fields, the once-per-game toggle section is always empty. This is a data quality issue, not a code bug.
**How to avoid:** Guard the toggle section with `oncePerGameAbilities.length > 0`. If empty, suppress the toggle UI entirely rather than showing an empty section.

### Pitfall 6: Zustand store state shared across list IDs
**What goes wrong:** A flat Zustand store (not keyed by listId) would mix CP state across different army lists — opening a second list resets or corrupts the first list's game state.
**How to avoid:** Key all state by `String(listId)`: `listStates: Record<string, GameDayListState>`. Each army list has independent CP, checklist, and OPG toggle state.

### Pitfall 7: Back navigation loses game state (intended behavior)
**What goes wrong:** User navigates away mid-game, returns, and state is reset.
**This is by design:** Zustand persist to localStorage means state survives navigation — the store is NOT reset on unmount. When user returns to the same list's Game Day, state is restored from localStorage. This is the required behavior per success criterion 3 ("CP state persists across navigation").

---

## Code Examples

### Routing: Navigate to Game Day from ArmyListDetailSheet
```typescript
// Source: src/app/router.tsx pattern (existing route structure)
// In ArmyListDetailSheet.tsx
import { useNavigate } from "@tanstack/react-router";

const navigate = useNavigate();

<Button
  type="button"
  size="sm"
  onClick={() => navigate({ to: "/game-day/$listId", params: { listId: String(list.id) } })}
>
  Game Day
</Button>
```

### Route registration
```typescript
// src/app/router.tsx — add after rulesHubRoute
const gameDayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/game-day/$listId",
  component: GameDayPageShell,
});

// Add to routeTree.addChildren([..., gameDayRoute])
```

### Param extraction in page shell
```typescript
// src/app/game-day/page.tsx
import { useParams } from "@tanstack/react-router";
import { GameDayPage } from "@/features/game-day/GameDayPage";

export function GameDayPageShell() {
  const { listId } = useParams({ from: "/game-day/$listId" });
  return <GameDayPage listId={Number(listId)} />;
}
```

### Zustand persist store skeleton
```typescript
// src/features/game-day/gameDayStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

const STORAGE_KEY = "game-day-state";

export const useGameDayStore = create<GameDayStore>()(
  persist(
    (set, get) => ({
      listStates: {},
      spendCp: (listId, cost) =>
        set((s) => {
          const key = String(listId);
          const cur = s.listStates[key] ?? defaultListState();
          return {
            listStates: {
              ...s.listStates,
              [key]: { ...cur, prevCp: cur.cp, cp: Math.max(0, cur.cp - cost) },
            },
          };
        }),
      // ... other actions
    }),
    { name: STORAGE_KEY }
  )
);
```

### Phase grouping (Stratagems tab)
```typescript
// Source: StratagemCard.tsx PHASE_STYLES pattern
const PHASE_ORDER = ["Command", "Movement", "Shooting", "Charge", "Fight"] as const;

const grouped = useMemo(() => {
  const map = new Map<string, RwStratagem[]>();
  for (const phase of PHASE_ORDER) map.set(phase, []);
  for (const s of stratagems) {
    const key = (s.phase && PHASE_ORDER.includes(s.phase as typeof PHASE_ORDER[number]))
      ? s.phase
      : null;
    if (key) map.get(key)!.push(s);
    // stratagems without a matching phase fall under the last group with a catch-all
  }
  return map;
}, [stratagems]);
```

### Unit ability card (Rules of Hooks — sub-component pattern)
```typescript
// Source: STATE.md "DetachmentAbilityRow sub-component" pattern (55-01)
// UnitAbilityCard.tsx — called inside UnitsTab.tsx via units.map(u => <UnitAbilityCard key={u.id} unit={u} />)
export function UnitAbilityCard({ unit, listId }: { unit: ArmyListUnitRow; listId: number }) {
  const [open, setOpen] = useState(false);
  const { data: datasheet } = useDatasheet(unit.unit_id);
  // Each call is a stable hook per component instance — no Rules of Hooks violation
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| localStorage raw hooks (useSidebarCollapsed pattern) | Zustand persist middleware (first use) | Cleaner for multi-field structured state; same outcome |
| N+1 hook pattern in map() | Sub-component per item (DetachmentAbilityRow pattern) | Rules of Hooks compliant; React Query caches per key |

---

## Open Questions

1. **Once-per-game ability text format in real Wahapedia data**
   - What we know: `RwDatasheetAbility.type` does not encode once-per-game. Detection requires heuristic text search on `name`, `description`, `parameter`.
   - What's unclear: Whether Wahapedia consistently uses "once per battle" or uses variant phrasing. The `parameter` field may carry structured info.
   - Recommendation: Implement heuristic on `description + name + parameter`, guard with `oncePerGameAbilities.length > 0`. Log matches during testing.

2. **StratagemCard in Game Day — simplified variant or reuse with null props**
   - What we know: Passing `favorite={null} note={null}` to StratagemCard renders annotation controls as inactive buttons (visible but non-highlighted). DetachmentRulesSection already does this.
   - What's unclear: Whether the annotation control buttons (star, flag icons) are visually distracting in a gameplay context.
   - Recommendation: Start with `favorite={null} note={null}` reuse. If UX review shows annotation icons are distracting, extract `GameDayStratagemCard` that strips them.

3. **CP tracker starting value UX**
   - What we know: Default CP is 0 (10th edition starts at 0, gains 1 per Command Phase). User must tap +1 each Command Phase.
   - What's unclear: Whether a "set starting CP" number input should appear on first visit or always be in header.
   - Recommendation: Show a small input field in the header alongside the CP display. Label "Starting CP" with default 0. CP display shows current value prominently.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` (inferred) / `tests/setup.ts` |
| Quick run command | `pnpm test -- tests/game-day/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GAME-01 | Game Day button renders in ArmyListDetailSheet; navigate call fires with correct listId | unit | `pnpm test -- tests/game-day/GameDayNavigation.test.tsx` | Wave 0 |
| GAME-02 | Stratagems tab groups by phase; reminders pinned at top | unit | `pnpm test -- tests/game-day/StrategiesTab.test.tsx` | Wave 0 |
| GAME-03 | CP tracker: spend decrements, undo restores, gain increments, persists to store | unit | `pnpm test -- tests/game-day/gameDayStore.test.ts` | Wave 0 |
| GAME-04 | Checklist: default items render; add item; toggle checked; reset all | unit | `pnpm test -- tests/game-day/ChecklistTab.test.tsx` | Wave 0 |
| GAME-05 | Unit ability card renders unit name + strategy notes + datasheet abilities | unit | `pnpm test -- tests/game-day/UnitAbilityCard.test.tsx` | Wave 0 |
| GAME-06 | Once-per-game abilities show toggle; toggle state reflects used/unused | unit | `pnpm test -- tests/game-day/UnitAbilityCard.test.tsx` | Wave 0 |
| GAME-07 | Reminders section shows is_reminder=1 favorites at top of Stratagems tab | unit | `pnpm test -- tests/game-day/StrategiesTab.test.tsx` | Wave 0 |
| GAME-08 | Unit card header shows status_painting Badge | unit | `pnpm test -- tests/game-day/UnitAbilityCard.test.tsx` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/game-day/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/game-day/gameDayStore.test.ts` — covers GAME-03 (CP store logic: spend, gain, undo, persist keying)
- [ ] `tests/game-day/StrategiesTab.test.tsx` — covers GAME-02, GAME-07 (phase grouping, reminders pinned)
- [ ] `tests/game-day/ChecklistTab.test.tsx` — covers GAME-04 (default items, add, toggle, reset)
- [ ] `tests/game-day/UnitAbilityCard.test.tsx` — covers GAME-05, GAME-06, GAME-08 (abilities, OPG toggle, painting badge)
- [ ] `tests/game-day/GameDayNavigation.test.tsx` — covers GAME-01 (button renders, navigate mock called)

---

## Sources

### Primary (HIGH confidence)
- Direct source inspection: `src/hooks/useArmyLists.ts`, `src/types/armyList.ts`, `src/hooks/useRulesExtended.ts`, `src/hooks/useRulesFavorites.ts`, `src/hooks/useDatasheet.ts`
- Direct source inspection: `src/features/rules-hub/StratagemCard.tsx` — PHASE_STYLES, StratagemCardProps, cp_cost rendering
- Direct source inspection: `src/features/army-lists/ArmyListDetailSheet.tsx` — launch point for Game Day button
- Direct source inspection: `src/features/army-lists/RemindersSection.tsx` — is_reminder=1 filter pattern
- Direct source inspection: `src/types/datasheet.ts` — RwDatasheetAbility.type field values
- Direct source inspection: `src/app/router.tsx` — route registration pattern
- Direct source inspection: `package.json` — zustand 5.0.12 (persist middleware available)
- Direct source inspection: `src/features/paints/paintInventoryFilters.ts`, `src/features/rules-hub/rulesHubFilters.ts` — existing Zustand store patterns (no persist)
- Direct source inspection: `src/hooks/useCollectionViewMode.ts`, `src/components/common/useSidebarCollapsed.ts` — existing localStorage patterns (raw useState + useEffect, no Zustand persist)
- Direct source inspection: `src/db/queries/strategyNotes.ts` — strategy note structure

### Secondary (MEDIUM confidence)
- STATE.md accumulated decisions — confirmed patterns for sub-component hooks, Map<key,T>, staleTime: Infinity, useWahapediaFactionId requirement
- `.planning/phases/56-game-day-mode/56-CONTEXT.md` — locked decisions and canonical refs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json; no new installs needed
- Architecture: HIGH — all data hooks verified in source; route pattern verified in router.tsx
- Zustand persist approach: HIGH — package installed; pattern is first use but straightforward
- Once-per-game detection: LOW — heuristic approach; actual Wahapedia data quality unverified
- Pitfalls: HIGH — verified against actual source code (cp_cost TEXT, useArmyListWithUnits returns array, Set non-serializable)

**Research date:** 2026-05-11
**Valid until:** 2026-06-11 (stable stack; re-verify if zustand or TanStack Router major versions change)
