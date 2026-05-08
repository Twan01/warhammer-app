# Phase 9: Unit Playbook - Research

**Researched:** 2026-05-02
**Domain:** React component composition, shadcn/ui Tabs, form dirty-state management, inline save pattern
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Stats block: six bordered cells in a horizontal row, stat abbreviation label above value — faithful to 40K 10th edition datasheet style
- Display mode (default): cells show value or "—"; dark borders, subtle fill, compact
- Edit mode: clicking an "Edit" icon button (Pencil, ghost/icon) switches all six cells to number inputs simultaneously; Save returns to display mode
- Suffix logic at display time only (never stored in DB): M → `"`, Sv/Ld/OC → `+`, T/W → raw integer
- Input mode shows raw integers only; no suffix in inputs
- Strategy notes layout: single column, full-width, all 8 fields stacked vertically — Battlefield Role, Strengths, Weaknesses, Best Targets, Synergies, Mistakes to Avoid, Rules Page References, Personal Notes
- Each strategy field: muted label + `rows={2}` Textarea (raw `<textarea>` with manual className per project pattern — no separate shadcn Textarea component exists)
- No grouping, collapsibles, or 2-column grid
- Playbook tab content order: Stats block → Abilities (rows=3 textarea) → Keywords (single-line Input) → 8 strategy note fields → Save button
- Save button at the bottom of the Playbook tab scroll area (not in SheetFooter)
- SheetFooter retains only Edit Unit and Delete Unit, visible on both tabs
- Dirty state: Save button disabled when no fields changed since last load/save; enabled on any edit
- On save success: `toast.success("Playbook saved")` — sheet stays open
- On save error: `toast.error("Failed to save playbook — try again")` — sheet stays open, button re-enables
- `UnitDetailSheet` restructured to use shadcn `Tabs` (already installed at `src/components/ui/tabs.tsx`)
- Tab labels: "Details" | "Playbook"
- Tabs wrap only the scrollable content area; `SheetHeader` and `SheetFooter` remain outside
- Default tab: "Details" (`defaultValue="details"`)
- Details tab content: unchanged — existing flat `div` content becomes `<TabsContent value="details">` with no edits
- `useStrategyNote(unitId)` called eagerly when the sheet opens; `staleTime: Infinity` means no redundant refetches
- All back-end plumbing (migration, types, queries, hooks) is complete from Phase 6
- No new routes, no new sidebar entries, no new hooks required
- New file: `src/features/units/PlaybookTab.tsx` — all Playbook-specific code goes here

### Claude's Discretion

- Exact border and fill styling for the stat cells (follow app's zinc/dark-mode palette)
- Whether the stats block edit mode is triggered by clicking any cell or by a dedicated small "Edit" icon button
- Column widths/flex layout for the 6 stat cells to fit sm:max-w-md
- Whether Keywords uses a single-line Input or a small 1-row Textarea

(UI-SPEC has resolved these: Edit mode triggered by Pencil icon button; Keywords uses single-line Input; stat cells use `flex-1` with `min-h-[44px]`; cell styling per UI-SPEC Interaction Contract §2)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STRAT-01 | Unit Playbook is a second tab ("Playbook") in the existing unit detail Sheet, alongside "Details" | Tabs component already installed; UnitDetailSheet structure fully understood; restructuring pattern confirmed |
| STRAT-02 | Stats block: M/T/Sv/W/Ld/OC integer fields, compact horizontal datasheet-style row | Display/edit mode toggle pattern, suffix logic, number input handling; all defined in CONTEXT.md and UI-SPEC |
| STRAT-03 | Free-text fields: Abilities (multi-line textarea), Keywords (free-text, comma-separated) | Raw textarea pattern from PaintSheet.tsx confirmed; Input for Keywords confirmed; no shadcn Textarea component exists |
| STRAT-04 | Strategy note fields: 8 fields ordered exactly per requirement | Field ordering locked; single-column layout locked; dirty-state detection covers all 8 fields |
| STRAT-05 | Playbook tab saves inline on button click; no separate edit/view mode toggle | `useUpsertStrategyNote` mutation confirmed; dirty-state pattern confirmed; toast pattern confirmed |

</phase_requirements>

---

## Summary

Phase 9 is a pure UI phase. All database, query, and hook plumbing was delivered in Phase 6. The work is: (1) restructure `UnitDetailSheet.tsx` to wrap its content in shadcn Tabs, (2) extract a new `PlaybookTab.tsx` component that owns the stat block, text fields, dirty state, and save logic, and (3) wire the two via `useStrategyNote` and `useUpsertStrategyNote` hooks that already exist and are already tested.

The Tabs component is already installed (`src/components/ui/tabs.tsx`). The required shadcn components — Button, Input, Label, Separator — are all present. There is no shadcn `Textarea` component in this project; all textarea usage follows the PaintSheet.tsx raw `<textarea>` pattern with a manual className string. The UI-SPEC has resolved all of Claude's Discretion items and provides exact class strings and interaction contracts.

The single non-obvious complexity is dirty-state tracking for 13 fields (6 stats + abilities + keywords + 8 strategy notes). The recommended approach is uncontrolled `useState` for each field initialized from the fetched `StrategyNote | null`, with a derived `isDirty` boolean compared against a stable initial-snapshot ref — avoiding React Hook Form and Zod given no validation requirements exist for these fields.

**Primary recommendation:** Create `PlaybookTab.tsx` as a self-contained component with local `useState` for all fields + a `useRef` initial-snapshot for dirty detection; modify `UnitDetailSheet.tsx` only to add Tabs wrapper around the scrollable content zone.

---

## Standard Stack

### Core (already in project — no installation required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@radix-ui/react-tabs` (via shadcn) | installed | Tab switching | Already installed as `src/components/ui/tabs.tsx` |
| `@tanstack/react-query` | installed | Server state, mutations | App standard; `useStrategyNote` + `useUpsertStrategyNote` are Phase 6 deliverables |
| `sonner` | installed | Toast notifications | App standard; `toast.success` / `toast.error` wired globally |
| `lucide-react` | installed | Icons (`Pencil` for edit trigger) | App standard for all icons |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React `useState` | built-in | Local form field state | All 13 editable fields in PlaybookTab |
| React `useRef` | built-in | Stable initial-snapshot for dirty comparison | Store the loaded StrategyNote values at mount to compare against current values |

### Not Needed

| Excluded | Reason |
|----------|--------|
| React Hook Form + Zod | No validation logic required for any Playbook field; adds ceremony without benefit; PaintSheet pattern used for forms with validation, not applicable here |
| shadcn Textarea component | Does not exist in this project — use raw `<textarea>` with manual className (see PaintSheet.tsx) |
| New hooks | `useStrategyNote` and `useUpsertStrategyNote` already complete in Phase 6 |

---

## Architecture Patterns

### Recommended File Structure Change

```
src/features/units/
├── UnitDetailSheet.tsx     ← modified: wrap scrollable content in Tabs
├── PlaybookTab.tsx         ← NEW: all Playbook UI and state
├── StatusPopover.tsx       ← unchanged
├── UnitTable.tsx           ← unchanged
└── ... (other unit files)  ← unchanged
```

### Pattern 1: Tabs Wrapper in UnitDetailSheet

Wrap only the scrollable content — SheetHeader and SheetFooter stay outside Tabs. The existing `<div className="flex flex-col gap-4 p-4">` content body becomes `<TabsContent value="details">`.

```tsx
// UnitDetailSheet.tsx — modified structure
<SheetContent side="right" key={unit?.id ?? "none"} className="overflow-y-auto sm:max-w-md">
  {unit && (
    <>
      <SheetHeader>...</SheetHeader>

      <Tabs defaultValue="details" className="flex flex-col">
        <TabsList className="mx-4 mt-2">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="playbook">Playbook</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="flex flex-col gap-4 p-4">
            {/* existing content — zero edits */}
          </div>
        </TabsContent>

        <TabsContent value="playbook">
          <PlaybookTab unitId={unit.id} />
        </TabsContent>
      </Tabs>

      <SheetFooter className="mt-6 gap-2 sm:gap-2">
        {/* Edit Unit + Delete Unit — unchanged */}
      </SheetFooter>
    </>
  )}
</SheetContent>
```

Source: `src/components/ui/tabs.tsx` (confirmed structure), `UnitDetailSheet.tsx` (confirmed existing layout), CONTEXT.md (locked Tabs integration decision).

### Pattern 2: PlaybookTab — Local State + Dirty Detection

Use `useState` for every field; initialize from the query result via `useEffect` on mount (or when `data` arrives). Keep a `useRef` snapshot of the initial values for dirty comparison.

```tsx
// PlaybookTab.tsx — state initialization pattern
import { useState, useRef, useEffect } from "react";
import { useStrategyNote, useUpsertStrategyNote } from "@/hooks/useStrategyNote";

interface PlaybookTabProps { unitId: number; }

export function PlaybookTab({ unitId }: PlaybookTabProps) {
  const { data, isLoading } = useStrategyNote(unitId);
  const upsert = useUpsertStrategyNote();

  // 13 controlled fields
  const [move, setMove] = useState<number | null>(null);
  const [toughness, setToughness] = useState<number | null>(null);
  const [save, setSave] = useState<number | null>(null);
  const [wounds, setWounds] = useState<number | null>(null);
  const [leadership, setLeadership] = useState<number | null>(null);
  const [objectiveControl, setObjectiveControl] = useState<number | null>(null);
  const [abilities, setAbilities] = useState<string>("");
  const [keywords, setKeywords] = useState<string>("");
  const [battlefieldRole, setBattlefieldRole] = useState<string>("");
  const [strengths, setStrengths] = useState<string>("");
  const [weaknesses, setWeaknesses] = useState<string>("");
  const [bestTargets, setBestTargets] = useState<string>("");
  const [synergies, setSynergies] = useState<string>("");
  const [mistakesToAvoid, setMistakesToAvoid] = useState<string>("");
  const [rulesReferences, setRulesReferences] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Edit mode for stats block only
  const [statsEditMode, setStatsEditMode] = useState(false);

  // Initial snapshot for dirty detection
  const initialRef = useRef<typeof data>(undefined);

  useEffect(() => {
    if (data !== undefined) {
      initialRef.current = data;
      setMove(data?.move ?? null);
      // ... initialize all other fields from data
    }
  }, [data]);

  const isDirty = /* compare current field values against initialRef.current */;

  async function handleSave() {
    try {
      await upsert.mutateAsync({
        unit_id: unitId,
        move, toughness, save, wounds, leadership,
        objective_control: objectiveControl,
        abilities: abilities || null,
        keywords: keywords || null,
        battlefield_role: battlefieldRole || null,
        // ... all other fields
      });
      toast.success("Playbook saved");
      initialRef.current = /* update snapshot */;
    } catch {
      toast.error("Failed to save playbook — try again");
    }
  }
}
```

### Pattern 3: Stats Block — Display/Edit Toggle

```tsx
// Display mode cell
<div className="flex-1 flex flex-col items-center justify-center min-h-[44px] border border-border rounded-sm bg-card gap-1 px-1 py-2">
  <span className="text-[10px] font-semibold text-muted-foreground uppercase">M</span>
  <span className="text-base font-semibold text-foreground">
    {move !== null ? `${move}"` : <span className="text-muted-foreground">—</span>}
  </span>
</div>

// Edit mode cell (border-primary)
<div className="flex-1 flex flex-col items-center justify-center min-h-[44px] border border-primary rounded-sm bg-card gap-1 px-1 py-2">
  <span className="text-[10px] font-semibold text-muted-foreground uppercase">M</span>
  <Input
    type="number"
    min={0}
    value={move ?? ""}
    onChange={(e) => setMove(e.target.value === "" ? null : e.target.valueAsNumber)}
    className="h-7 text-center text-base font-semibold p-0 border-0 bg-transparent"
  />
</div>
```

Source: `src/components/ui/input.tsx` (confirmed available), UI-SPEC §2 and §3, CONTEXT.md.

### Pattern 4: Raw Textarea (no shadcn Textarea)

No `textarea.tsx` exists in `src/components/ui/`. Use raw `<textarea>` with manual className, matching the PaintSheet.tsx pattern exactly:

```tsx
// Strategy note field
<div className="flex flex-col gap-1">
  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
    Battlefield Role
  </label>
  <textarea
    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    rows={2}
    placeholder="e.g. Objective holder, close-combat distraction"
    value={battlefieldRole}
    onChange={(e) => setBattlefieldRole(e.target.value)}
  />
</div>
```

Source: `src/features/paints/PaintSheet.tsx` lines 322-330 (confirmed pattern), verified `textarea.tsx` does NOT exist in `src/components/ui/`.

### Pattern 5: Suffix Logic (display-time only)

```tsx
function formatStatValue(key: "M" | "T" | "Sv" | "W" | "Ld" | "OC", value: number | null): React.ReactNode {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  if (key === "M") return `${value}"`;
  if (key === "Sv" || key === "Ld" || key === "OC") return `${value}+`;
  return `${value}`; // T and W: raw integer
}
```

Source: CONTEXT.md (locked suffix logic decisions).

### Anti-Patterns to Avoid

- **Nesting `<Textarea>` from shadcn:** It does not exist in this project. Always use raw `<textarea>` with manual className.
- **Lazy data loading on tab switch:** `useStrategyNote` is called at sheet open (eager), not when the Playbook tab is first activated. The hook has `staleTime: Infinity` — this is correct and intentional.
- **Putting Save button in SheetFooter:** Save Playbook lives inside the Playbook tab scroll area. SheetFooter contains only Edit Unit and Delete Unit.
- **Global edit mode:** Strategy note textareas are always editable. Only the stats block has a toggled edit mode.
- **Storing suffixes in DB:** `save`, `leadership`, `objective_control` store raw integers. `"3+"` is only rendered at display time.
- **Wrapping SheetHeader/SheetFooter inside Tabs:** The Tabs `defaultValue` and structure must enclose only the scrollable content zone, not the header or footer.
- **Forgetting `key={unit?.id ?? "none"}`:** The existing `key` prop on `SheetContent` resets mount on unit switch. This also resets `PlaybookTab` state automatically — do not remove it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tab switching | Custom toggle state + conditional rendering | `Tabs` / `TabsContent` from `src/components/ui/tabs.tsx` | Already installed; handles focus, keyboard navigation, ARIA automatically |
| Cache invalidation after save | Manual `setQueryData` | `useUpsertStrategyNote().mutateAsync()` — `onSuccess` already invalidates `STRATEGY_NOTE_KEY(unit_id)` | Phase 6 deliverable; tested; correct invalidation scope |
| Toast notifications | Custom toast component | `toast.success()` / `toast.error()` from sonner | Already wired globally in the app |
| Number input null coercion | Custom parser | `e.target.value === "" ? null : e.target.valueAsNumber` | Established pattern from PaintSheet.tsx |

**Key insight:** This phase is 100% UI assembly. Every primitive (hooks, queries, components, types) already exists. The only new work is composing them into `PlaybookTab.tsx` and making the Tabs structure change to `UnitDetailSheet.tsx`.

---

## Common Pitfalls

### Pitfall 1: `useEffect` dependency on `form.reset` or handler identity

**What goes wrong:** If the effect that initializes state from `data` lists a setter or handler as a dependency, it will re-run on every render and overwrite in-progress user edits.
**Why it happens:** React setter functions are stable (same reference), but if you accidentally include `data` in the deps and `data` is replaced by a new object reference after save (due to cache invalidation), the form resets while the user is still filling it in.
**How to avoid:** Initialize from `data` in a `useEffect` with `[data]` dependency, but only set if `data !== undefined` and only when the snapshot ref has not yet been set (first mount). After save, update `initialRef.current` manually rather than relying on the effect to re-initialize.
**Warning signs:** Form fields clearing unexpectedly after save; `isDirty` flipping to false and back.

### Pitfall 2: Dirty comparison with object reference equality

**What goes wrong:** `isDirty = currentValues !== initialRef.current` is always true because they are different objects.
**Why it happens:** Object reference comparison instead of field-by-field comparison.
**How to avoid:** Compare each of the 13 fields individually, or serialize both snapshots to JSON and compare strings. Field-by-field is more readable and handles null vs empty string correctly.

### Pitfall 3: Empty string vs null on save

**What goes wrong:** Saving `""` for unedited text fields instead of `null`; the DB stores an empty string, and on next load the field appears "dirty" immediately (loaded as `null`, but current state is `""`).
**Why it happens:** `useState("")` initial value vs `null` from DB.
**How to avoid:** When building the `UpsertStrategyNoteInput`, coerce empty string to null: `abilities: abilities || null`. On loading, coerce null to `""` for the state: `setAbilities(data?.abilities ?? "")`. This round-trips cleanly.

### Pitfall 4: Stats inputs accept non-integer or NaN

**What goes wrong:** `e.target.valueAsNumber` returns `NaN` for non-numeric input; `NaN` passed to the DB query causes a runtime error or silent corruption.
**Why it happens:** HTML number inputs can still have user-typed garbage in some browsers, or `valueAsNumber` returns `NaN` for empty string.
**How to avoid:** Use `e.target.value === "" ? null : Number.isFinite(e.target.valueAsNumber) ? e.target.valueAsNumber : null`. The `min={0}` attribute provides a UI hint but does not enforce at the JS level.

### Pitfall 5: Tabs breaking SheetContent overflow scrolling

**What goes wrong:** Adding `Tabs` with `flex flex-col` inside a `SheetContent` with `overflow-y-auto` can cause the tab content to not scroll if the `Tabs` or `TabsContent` get `flex-1` and expand beyond the sheet height.
**Why it happens:** The `Tabs` component in `tabs.tsx` sets `flex gap-2 data-[orientation=horizontal]:flex-col` on the root. `TabsContent` gets `flex-1`. In a constrained-height flex container, `flex-1` may cause overflow to clip rather than scroll.
**How to avoid:** Keep `overflow-y-auto` on `SheetContent` (already there). Do not add `overflow-hidden` to the Tabs root. The `TabsContent` scroll will be handled by the parent `SheetContent` scroll container. Avoid adding `h-full` or `overflow-hidden` to intermediate wrappers.

### Pitfall 6: `useStrategyNote` called with undefined unitId before unit loads

**What goes wrong:** If the sheet opens before the `unit` prop is non-null, `useStrategyNote(undefined)` is called. The hook handles this (`enabled: unitId !== undefined`), but `PlaybookTab` must only render when `unitId` is a valid number.
**How to avoid:** Pass `unitId` as `number` (not `number | undefined`) to `PlaybookTab` — the parent `UnitDetailSheet` already gates rendering on `{unit && ...}`.

---

## Code Examples

### Dirty State Detection (field-by-field)

```tsx
// Source: project pattern — field comparison derived from PaintSheet.tsx useEffect pattern
const isDirty = useMemo(() => {
  const snap = initialRef.current;
  if (snap === undefined) return false;
  return (
    move !== (snap?.move ?? null) ||
    toughness !== (snap?.toughness ?? null) ||
    save !== (snap?.save ?? null) ||
    wounds !== (snap?.wounds ?? null) ||
    leadership !== (snap?.leadership ?? null) ||
    objectiveControl !== (snap?.objective_control ?? null) ||
    abilities !== (snap?.abilities ?? "") ||
    keywords !== (snap?.keywords ?? "") ||
    battlefieldRole !== (snap?.battlefield_role ?? "") ||
    strengths !== (snap?.strengths ?? "") ||
    weaknesses !== (snap?.weaknesses ?? "") ||
    bestTargets !== (snap?.best_targets ?? "") ||
    synergies !== (snap?.synergies ?? "") ||
    mistakesToAvoid !== (snap?.mistakes_to_avoid ?? "") ||
    rulesReferences !== (snap?.rules_references ?? "") ||
    notes !== (snap?.notes ?? "")
  );
}, [move, toughness, save, wounds, leadership, objectiveControl, abilities, keywords,
    battlefieldRole, strengths, weaknesses, bestTargets, synergies, mistakesToAvoid,
    rulesReferences, notes]);
```

### Snapshot Update After Successful Save

```tsx
// After mutateAsync resolves successfully, update the snapshot so isDirty resets to false
// without waiting for the query invalidation round-trip
initialRef.current = {
  ...initialRef.current,
  move, toughness, save: saveStat, wounds, leadership,
  objective_control: objectiveControl,
  abilities: abilities || null,
  keywords: keywords || null,
  battlefield_role: battlefieldRole || null,
  // ... rest of fields
} as StrategyNote | null;
```

### Stat Cell Edit Trigger (Pencil icon button)

```tsx
// Source: UI-SPEC §3 + CONTEXT.md Claude's Discretion resolved
import { Pencil } from "lucide-react";

<div className="flex items-center justify-between mb-2">
  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
    Stats
  </span>
  <Button
    type="button"
    variant="ghost"
    size="icon"
    className="h-6 w-6"
    aria-label="Edit stats"
    onClick={() => setStatsEditMode((v) => !v)}
  >
    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
  </Button>
</div>
```

### Number Input Null Coercion

```tsx
// Source: PaintSheet.tsx line 258-261 (established pattern)
<Input
  type="number"
  min={0}
  value={move ?? ""}
  onChange={(e) =>
    setMove(e.target.value === "" ? null : e.target.valueAsNumber)
  }
/>
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| React Hook Form for all forms | RHF only where validation is needed; plain useState for display-save forms | PlaybookTab has no validation requirements — use plain useState |
| shadcn `Textarea` component | Raw `<textarea>` with manual className string | No textarea.tsx exists; PaintSheet.tsx establishes the inline-class pattern |

---

## Open Questions

1. **Stats block edit mode escape / cancel**
   - What we know: UI-SPEC says "Cancelling edit mode (Escape or clicking outside) reverts cells to display mode without saving"
   - What's unclear: Whether a `useEffect` keydown listener for Escape is expected, or if this is a nice-to-have vs. required
   - Recommendation: Implement `onKeyDown` on the stats section container listening for Escape key; revert stat values from `initialRef.current` snapshot and exit edit mode. Adds minimal code, materially improves UX.

2. **Initial snapshot timing — loading state**
   - What we know: `staleTime: Infinity` means data loads once and is cached; on first open it may still be `undefined` briefly
   - What's unclear: Whether the loading state should suppress the Save button (not just `opacity-50` the whole tab)
   - Recommendation: Both `isLoading` and `!isDirty` should disable Save. The `opacity-50 pointer-events-none` on the content area covers field interaction; the Save button's `disabled` prop covers accidental keyboard saves.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 + React Testing Library + jsdom |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npm test -- --reporter=dot` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STRAT-01 | Playbook tab renders and is reachable via tab trigger | component | `npm test -- tests/collection/PlaybookTab.test.tsx` | Wave 0 |
| STRAT-02 | Stats block displays values with correct suffixes; enters edit mode on Pencil click | component | `npm test -- tests/collection/PlaybookTab.test.tsx` | Wave 0 |
| STRAT-03 | Abilities textarea and Keywords input render with correct placeholder and respond to input | component | `npm test -- tests/collection/PlaybookTab.test.tsx` | Wave 0 |
| STRAT-04 | All 8 strategy note fields render in correct order with correct labels | component | `npm test -- tests/collection/PlaybookTab.test.tsx` | Wave 0 |
| STRAT-05 | Save button disabled when no changes; enabled after edit; calls upsert with correct payload; shows success toast | component | `npm test -- tests/collection/PlaybookTab.test.tsx` | Wave 0 |

Note: `strategyNoteQueries.test.ts` (foundation) already covers the query layer (Phase 6 deliverable). Phase 9 tests cover the component layer only.

### Sampling Rate

- **Per task commit:** `npm test -- tests/collection/PlaybookTab.test.tsx`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/collection/PlaybookTab.test.tsx` — covers STRAT-01 through STRAT-05 (all five requirements; component-layer tests)

---

## Sources

### Primary (HIGH confidence)

- `src/features/units/UnitDetailSheet.tsx` — confirmed current structure, existing patterns (`key`, SheetFooter, Field/BoolIndicator helpers)
- `src/hooks/useStrategyNote.ts` — confirmed hook API: `useStrategyNote(unitId)`, `useUpsertStrategyNote()`, `STRATEGY_NOTE_KEY`
- `src/types/strategyNote.ts` — confirmed `StrategyNote` and `UpsertStrategyNoteInput` types (17 user-editable fields + unit_id)
- `src/db/queries/strategyNotes.ts` — confirmed upsert select-then-insert/update pattern; no ON CONFLICT
- `src/components/ui/tabs.tsx` — confirmed Tabs/TabsList/TabsTrigger/TabsContent API; confirmed `defaultValue`, horizontal orientation, `data-[state=active]` styling
- `src/components/ui/input.tsx` — confirmed Input component API including `type="number"`, `min`, `valueAsNumber` usage
- `src/features/paints/PaintSheet.tsx` — confirmed raw `<textarea>` className pattern (no shadcn Textarea component)
- `src/components/ui/` directory listing — confirmed NO `textarea.tsx` exists
- `.planning/phases/09-unit-playbook/09-CONTEXT.md` — all locked decisions
- `.planning/phases/09-unit-playbook/09-UI-SPEC.md` — interaction contracts, layout diagram, class strings
- `tests/foundation/strategyNoteQueries.test.ts` — confirmed test coverage of query layer; no component tests exist yet
- `vitest.config.ts` — confirmed test framework: Vitest 4.1.5, jsdom, globals, setupFiles

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` + `.planning/milestones/v0.1.1-REQUIREMENTS.md` — project history and requirement text for STRAT-01..05

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all components verified by direct file reads; no speculation
- Architecture: HIGH — patterns derived from existing working code in the same codebase
- Pitfalls: HIGH — derived from known Phase 3/6 pitfalls documented in STATE.md and CONTEXT.md, plus direct inspection of component structure
- Test architecture: HIGH — existing test framework confirmed; gap (PlaybookTab.test.tsx) clearly identified

**Research date:** 2026-05-02
**Valid until:** 2026-06-02 (stable — no external dependencies; all libraries are already installed)
