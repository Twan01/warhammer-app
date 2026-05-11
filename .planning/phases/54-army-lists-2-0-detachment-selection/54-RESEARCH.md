# Phase 54: Army Lists 2.0 — Detachment Selection - Research

**Researched:** 2026-05-11
**Domain:** React UI integration — extending ArmyListDetailSheet with Combobox, rules display sections, stale-data warning, and reminders
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **DetachmentPicker UX:** Combobox (Popover + Command pattern) scoped to the list's faction, positioned below SheetHeader/faction badge and above the units table
- **Disabled state:** Picker disabled with helper text ("Select a faction first") when no faction set
- **Clear button:** Uses `useClearArmyListDetachment` (separate mutation from updateArmyList due to COALESCE NULL passthrough)
- **Persistence:** On selection, persist both `detachment_id` (string) and `detachment_name` (denormalized TEXT) via `useUpdateArmyList`
- **Hook chain:** `useDetachmentsByFaction(wahapediaFactionId)` populated via `useWahapediaFactionId(faction.name)` translation
- **Layout:** Stacked sections with section headers — no tabs within the sheet; vertical scroll
  1. DetachmentPicker (with optional clear button)
  2. Stale-data warning banner (amber/yellow, not dismissible, shown when > 30 days)
  3. Detachment Ability — inline, not collapsible
  4. Stratagems — list of StratagemCard components (reused from Phase 53)
  5. Reminders section (below stratagems, star icon header)
  6. Units table (existing)
  7. List notes (existing)
- **Empty states:**
  - No detachment selected: "Select a detachment to see its rules"
  - Detachment selected but no data: "No rules data available — sync rules from the Rules Hub"
- **Stale-data warning:** Uses `getSyncFreshness` from `syncFreshness.ts` + `useRulesSyncMeta()`; shown when freshness is "stale" or "never" (age > 14 days) — but ARMY-04 specifies 30 days, so the threshold for the banner is ageDays > 30, NOT the existing `getSyncFreshness` tiers which use 14 days as the stale cutoff. Need a custom check: `ageDays > 30`.
- **Reminders section:** `useRulesFavorites()` filtered client-side to `is_reminder === 1`; hidden entirely when empty; shows rule_name + rule_type badge
- **StratagemCard:** Direct reuse of `src/features/rules-hub/StratagemCard.tsx` — no modification needed

### Claude's Discretion
- Exact spacing between sections
- Loading skeleton design for rules sections
- Whether detachment ability description needs Collapsible or is always expanded (locked: always expanded / inline)
- Combobox styling details (width, placeholder text)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ARMY-01 | User can select a detachment for an army list | DetachmentPicker Combobox + useUpdateArmyList / useClearArmyListDetachment — all data layer already exists from Phase 52 |
| ARMY-02 | User can view the selected detachment's ability in the army list detail | useDetachmentById + useDetachmentAbilitiesByDetachment — hooks already exist in useRulesExtended.ts; render inline section in sheet |
| ARMY-03 | User can view relevant stratagems for the selected detachment in the army list | useStratagemsByDetachment — hook already exists; StratagemCard reused from Phase 53 |
| ARMY-04 | User sees a stale-data warning when army list uses rules data older than 30 days | useRulesSyncMeta() for last_sync_at; custom 30-day threshold check (getSyncFreshness tiers use 14 days — not directly reusable for this exact threshold) |
| ARMY-05 | User can view list-level rules reminders (user-marked favorites from Playbook) | useRulesFavorites() filtered to is_reminder === 1; RulesFavorite type has rule_name + rule_type; no new queries needed |
</phase_requirements>

---

## Summary

Phase 54 is a pure UI integration phase. All data infrastructure was built in Phase 52 (schema, queries, hooks) and all reusable display components were built in Phase 53 (StratagemCard, DetachmentCard). This phase exclusively extends `ArmyListDetailSheet.tsx` with new sections using exclusively pre-built hooks and components.

The largest decisions are already locked: Combobox (Popover + Command) for DetachmentPicker (identical pattern to PaintCombobox), inline ability display, StratagemCard reuse, and the Reminders section. The stale-data warning requires a custom 30-day check because the existing `getSyncFreshness` utility uses a 14-day threshold for "stale" — not the 30-day threshold specified by ARMY-04.

The DetachmentPicker component should be extracted as `src/features/army-lists/DetachmentPicker.tsx` rather than inlined into the sheet, both for testability and to match the existing pattern of self-contained feature components.

**Primary recommendation:** Implement as three waves: (1) DetachmentPicker component + sheet wiring, (2) rules display sections (ability + stratagems + stale banner), (3) Reminders section + tests.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | ~5.x | Server state for hooks | Project standard — all DB reads go through React Query |
| Radix UI Popover + Command | shadcn/ui | Combobox pattern | Already used in PaintCombobox — identical implementation |
| shadcn/ui Badge | existing | Rule type badges in Reminders | Project standard UI primitive |
| shadcn/ui Skeleton | existing | Loading states | Already used in ArmyListDetailSheet |
| Lucide React | existing | Star icon for Reminders header | Project icon library |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui Collapsible | existing | StratagemCard already uses it | Do NOT wrap detachment ability — inline only |
| sonner (toast) | existing | Mutation feedback | On detachment select/clear success + error |

### No new packages needed
All dependencies for Phase 54 are already installed. No `npm install` required.

---

## Architecture Patterns

### Recommended Project Structure
```
src/features/army-lists/
  DetachmentPicker.tsx         # NEW — Combobox for detachment selection
  DetachmentRulesSection.tsx   # NEW — Ability + Stratagems display sections
  StaleDataBanner.tsx          # NEW — Amber banner for >30-day stale data
  RemindersSection.tsx         # NEW — is_reminder favorites list
  ArmyListDetailSheet.tsx      # MODIFIED — wire in new sections

tests/army-list/
  DetachmentPicker.test.tsx    # NEW
  DetachmentRulesSection.test.tsx  # NEW
  StaleDataBanner.test.tsx     # NEW
  RemindersSection.test.tsx    # NEW
```

Alternatively, small components (StaleDataBanner, RemindersSection) could be co-located inline inside the sheet or rules section — but extracting them makes tests simpler and matches the project's established component-per-file discipline.

### Pattern 1: Combobox (Popover + Command)
**What:** Searchable dropdown using shadcn Command inside a Popover trigger
**When to use:** Whenever a Select needs type-to-filter (factions with many detachments)
**Example:**
```typescript
// Source: src/features/recipes/PaintCombobox.tsx (project canonical reference)
import { useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList,
} from "@/components/ui/command";

export function DetachmentPicker({
  factionWahapediaId,
  value,       // detachment_id: string | null
  valueName,   // detachment_name: string | null
  disabled,
  onChange,    // (id: string, name: string) => void
  onClear,     // () => void
}: DetachmentPickerProps) {
  const [open, setOpen] = useState(false);
  const { data: detachments = [] } = useDetachmentsByFaction(
    disabled ? undefined : factionWahapediaId
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {value ? valueName : "Select detachment..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter>
          <CommandInput placeholder="Search detachments..." />
          <CommandList>
            <CommandEmpty>No detachments found.</CommandEmpty>
            <CommandGroup>
              {detachments.map((d) => (
                <CommandItem
                  key={d.id}
                  value={d.name.toLowerCase()}
                  onSelect={() => { onChange(d.id, d.name); setOpen(false); }}
                >
                  {d.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

### Pattern 2: Wahapedia faction ID translation chain
**What:** `useWahapediaFactionId(faction.name)` must gate all rules-facing hooks
**When to use:** Whenever army list faction is used to query rules.db
**Example:**
```typescript
// Source: src/hooks/useDatasheet.ts — useWahapediaFactionId
// Inside ArmyListDetailSheet (or DetachmentPicker):
const { data: wahapediaFactionId } = useWahapediaFactionId(faction?.name);
const { data: detachments = [] } = useDetachmentsByFaction(wahapediaFactionId ?? undefined);
// Also needed for ARMY-02 and ARMY-03:
const { data: detachment } = useDetachmentById(list?.detachment_id ?? undefined);
const { data: stratagems = [] } = useStratagemsByDetachment(list?.detachment_id ?? undefined);
```
**Critical pitfall:** Passing `faction.id` (integer) instead of Wahapedia string ID returns an empty array silently. `useWahapediaFactionId` is the required translation.

### Pattern 3: Stale-data 30-day check
**What:** Custom threshold check — NOT a direct call to `getSyncFreshness` because its "stale" tier is 14 days, not 30
**When to use:** ARMY-04 banner only
```typescript
// Source: src/lib/syncFreshness.ts — getSyncFreshness (for reference)
// Phase 54 needs a separate utility or inline check:
function isOverThirtyDays(lastSyncAt: string | null): boolean {
  if (!lastSyncAt) return true; // never synced = also show banner
  const ageDays = (Date.now() - new Date(lastSyncAt).getTime()) / (1000 * 60 * 60 * 24);
  return ageDays > 30;
}
// Used in StaleDataBanner:
const { data: syncMeta } = useRulesSyncMeta();
const showBanner = isOverThirtyDays(syncMeta?.last_sync_at ?? null);
```

### Pattern 4: Reminders section filter
**What:** `useRulesFavorites()` returns ALL favorites; filter client-side for `is_reminder === 1`
**When to use:** Reminders section in ArmyListDetailSheet
```typescript
// Source: src/hooks/useRulesFavorites.ts
const { data: favorites = [] } = useRulesFavorites();
const reminders = favorites.filter((f) => f.is_reminder === 1);
// rule_type badge: f.rule_type — one of 'stratagem' | 'detachment_ability' | 'shared_ability'
// Display: f.rule_name + Badge variant for rule_type
```

### Pattern 5: Mutation wiring for detachment selection
**What:** Use `useUpdateArmyList` to set detachment, `useClearArmyListDetachment` to clear
**Critical distinction:** COALESCE in `updateArmyList` SQL means passing `null` for detachment fields is a no-op (preserves existing value). `clearArmyListDetachment` explicitly sets both columns to NULL.
```typescript
// Source: src/db/queries/armyLists.ts — clearArmyListDetachment
const updateArmyList = useUpdateArmyList();
const clearDetachment = useClearArmyListDetachment();

// On picker select:
updateArmyList.mutate({
  id: list.id,
  detachment_id: selectedId,
  detachment_name: selectedName,
}, { onSuccess: () => toast.success("Detachment selected.") });

// On clear:
clearDetachment.mutate(list.id, {
  onSuccess: () => toast.success("Detachment cleared."),
});
```

### Anti-Patterns to Avoid
- **Nested dialog/portal inside Sheet:** DetachmentPicker must use inline Combobox — never open a Dialog inside the Sheet (Radix portal nesting pitfall, documented in STATE.md)
- **Passing faction.id (integer) to rules hooks:** Always go through `useWahapediaFactionId(faction.name)` first
- **Using getSyncFreshness "stale" return for the ARMY-04 banner:** The existing "stale" tier is 14 days. ARMY-04 requires 30 days — use a custom check
- **Passing null for detachment_id via updateArmyList to clear:** COALESCE blocks it — use `useClearArmyListDetachment` instead
- **Calling useDetachmentsByFaction before wahapediaFactionId resolves:** Pass `undefined` (not null) to skip the query while translating; the hook's `enabled: factionId !== undefined` guard handles it

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Searchable dropdown | Custom select with filter | Popover + Command (shadcn Combobox pattern) | Already in PaintCombobox; accessibility, keyboard navigation |
| Stratagem display card | Custom card component | StratagemCard from Phase 53 | Identical UI need; avoid duplicate code |
| Detachment ability card | Custom ability display | Inline render with ability.name + ability.description | DetachmentCard is collapsible/multi-ability — too heavy; CONTEXT.md says inline |
| Rules sync freshness | Custom date math | useRulesSyncMeta() + custom 30-day check | sync meta already in DB |
| Favorites list | New DB query | useRulesFavorites() filtered client-side | All favorites are already loaded; filter in JS |

---

## Common Pitfalls

### Pitfall 1: Stale freshness threshold mismatch
**What goes wrong:** Developer calls `getSyncFreshness(lastSyncAt) === "stale"` for the ARMY-04 banner, which triggers at 14 days instead of 30
**Why it happens:** `syncFreshness.ts` stale tier is 14 days (Wahapedia update cadence context); ARMY-04 requires 30 days
**How to avoid:** Write a separate `isOverThirtyDays(lastSyncAt)` helper or inline the check directly in StaleDataBanner — do not reuse the existing freshness tiers
**Warning signs:** Banner appears in testing with data synced 20 days ago

### Pitfall 2: Wahapedia faction ID not yet resolved
**What goes wrong:** `useDetachmentsByFaction` called with `null` instead of `undefined` — the `enabled` guard uses `!== undefined`, so null is treated as a valid (but wrong) faction ID
**Why it happens:** `useWahapediaFactionId` returns `null` while loading (not `undefined`)
**How to avoid:** Gate with `wahapediaFactionId ?? undefined` when passing to rules hooks. The hook returns `data: string | null | undefined` — always coerce null → undefined before passing downstream

### Pitfall 3: Clear button triggers updateArmyList with null
**What goes wrong:** Passing `{ id, detachment_id: null }` to updateArmyList — COALESCE preserves existing value; detachment is never cleared
**Why it happens:** Misunderstanding of the COALESCE SQL pattern in updateArmyList
**How to avoid:** Always use `useClearArmyListDetachment(list.id)` for the clear action — it runs the explicit `SET detachment_id = NULL` query
**Warning signs:** Clear button appears to work (no error) but detachment remains visible on sheet reopen

### Pitfall 4: Sibling portal nesting
**What goes wrong:** DetachmentPicker attempts to open a Dialog or Sheet for "no detachments found — go sync" UX inside the already-open ArmyListDetailSheet
**Why it happens:** Desire to be helpful to user when rules data is absent
**How to avoid:** Show the empty state text inline ("No rules data available — sync rules from the Rules Hub") — no portal opening. Confirmed by CONTEXT.md decisions.

### Pitfall 5: detachment_id type confusion (string vs number)
**What goes wrong:** Passing `list.detachment_id` (which is `string | null` — Wahapedia zero-padded 9-digit ID) to a hook expecting a number
**Why it happens:** Most HobbyForge IDs are integers; Wahapedia IDs are strings
**How to avoid:** `list.detachment_id` is typed as `string | null` in `ArmyList` interface. Pass directly to `useDetachmentById(list.detachment_id ?? undefined)` — no parseInt needed

### Pitfall 6: Rules sections render before list prop is set
**What goes wrong:** Rules hooks called unconditionally with `undefined` IDs during the brief moment when the sheet opens but `list` is null
**Why it happens:** The sheet conditionally renders `{list && (...)}` — but if hooks are called outside this guard, they may run with undefined values
**How to avoid:** All new hooks must be called at the top level of the component body (Rules of Hooks), then gate the rendered output on `list !== null`. The `enabled: id !== undefined` guards in each hook prevent actual queries from firing — this is safe.

---

## Code Examples

### DetachmentPicker prop interface
```typescript
// Source: derived from src/features/recipes/PaintCombobox.tsx pattern
interface DetachmentPickerProps {
  /** Wahapedia string faction ID — undefined while loading or no faction set */
  factionWahapediaId: string | undefined;
  /** Currently selected detachment Wahapedia ID */
  value: string | null;
  /** Denormalized name for display in trigger (survives rules.db wipe) */
  valueName: string | null;
  /** When true: renders disabled button with helper text */
  disabled: boolean;
  /** Called on selection — caller persists via useUpdateArmyList */
  onChange: (detachmentId: string, detachmentName: string) => void;
  /** Called on clear — caller persists via useClearArmyListDetachment */
  onClear: () => void;
}
```

### ArmyListDetailSheet hook additions
```typescript
// Additional hooks to add to ArmyListDetailSheet:
const { data: syncMeta } = useRulesSyncMeta();
const { data: wahapediaFactionId } = useWahapediaFactionId(faction?.name);
const { data: detachment } = useDetachmentById(list?.detachment_id ?? undefined);
const { data: detachmentAbilities = [] } = useDetachmentAbilitiesByDetachment(
  list?.detachment_id ?? undefined
);
const { data: stratagems = [] } = useStratagemsByDetachment(
  list?.detachment_id ?? undefined
);
const { data: favorites = [] } = useRulesFavorites();
const reminders = favorites.filter((f) => f.is_reminder === 1);
const updateArmyList = useUpdateArmyList(); // already imported
const clearDetachment = useClearArmyListDetachment();
```

### Stale data check (30-day threshold)
```typescript
// Inline check — do NOT use getSyncFreshness which has 14-day threshold
function isDataStale(lastSyncAt: string | null | undefined): boolean {
  if (!lastSyncAt) return true;
  const ageDays = (Date.now() - new Date(lastSyncAt).getTime()) / (1000 * 60 * 60 * 24);
  return ageDays > 30;
}
```

### RuleType badge label map
```typescript
// Source: src/types/rulesFavorite.ts — RULE_TYPES
const RULE_TYPE_LABELS: Record<string, string> = {
  stratagem: "Stratagem",
  detachment_ability: "Detachment Ability",
  shared_ability: "Shared Ability",
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No detachment data in army lists | detachment_id + detachment_name columns on army_lists | Phase 52 | Data layer ready; Phase 54 only adds UI |
| No rules display in army context | Phase 54 wires rules data into army list detail | Phase 54 | Closes the core rules-in-context gap |
| Combobox not used in army lists | Popover + Command pattern (established by PaintCombobox) | Phase 37+ | Proven pattern, no new risk |

---

## Open Questions

1. **Where exactly in the sheet layout does the DetachmentPicker go?**
   - What we know: CONTEXT.md says "below SheetHeader and faction badge, above the units table" — after ArmyListSummaryBar
   - What's unclear: Should it sit above or below the ArmyListSummaryBar?
   - Recommendation: Place after ArmyListSummaryBar and before the units toolbar (before the "Units" heading + Add Unit button) — the summary bar is header metadata, and the detachment picker is also metadata-level. Order: SheetHeader → ArmyListSummaryBar → DetachmentPicker → [stale banner] → [rules sections] → units toolbar → units table.

2. **DetachmentAbility: useDetachmentAbilitiesByDetachment vs useDetachmentById**
   - What we know: `useDetachmentById` returns the `RwDetachment` row (name, legend, type); `useDetachmentAbilitiesByDetachment` returns `RwDetachmentAbility[]` rows with description
   - What's unclear: "Detachment Ability" section in ARMY-02 — is it the detachment row's own legend/description, or the associated ability rows?
   - Recommendation: Show `detachmentAbilities` (from `useDetachmentAbilitiesByDetachment`) since those are the actual game-rule ability descriptions. The detachment row itself has only a `legend` field. This matches how DetachmentCard renders in Phase 53.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test -- tests/army-list/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ARMY-01 | DetachmentPicker renders with detachment options; onChange called on select; onClear called on clear; disabled state renders with helper text | unit | `pnpm test -- tests/army-list/DetachmentPicker.test.tsx` | ❌ Wave 0 |
| ARMY-01 | Selecting a detachment calls updateArmyList with detachment_id + detachment_name | unit | `pnpm test -- tests/army-list/ArmyListDetailSheet.test.tsx` | ❌ Wave 0 |
| ARMY-02 | DetachmentRulesSection renders ability name + description when detachment selected | unit | `pnpm test -- tests/army-list/DetachmentRulesSection.test.tsx` | ❌ Wave 0 |
| ARMY-02 | Empty state "Select a detachment" shown when no detachment_id | unit | `pnpm test -- tests/army-list/DetachmentRulesSection.test.tsx` | ❌ Wave 0 |
| ARMY-03 | DetachmentRulesSection renders StratagemCard for each stratagem | unit | `pnpm test -- tests/army-list/DetachmentRulesSection.test.tsx` | ❌ Wave 0 |
| ARMY-04 | StaleDataBanner renders when last_sync_at is null | unit | `pnpm test -- tests/army-list/StaleDataBanner.test.tsx` | ❌ Wave 0 |
| ARMY-04 | StaleDataBanner renders when data is > 30 days old | unit | `pnpm test -- tests/army-list/StaleDataBanner.test.tsx` | ❌ Wave 0 |
| ARMY-04 | StaleDataBanner does NOT render when data is < 30 days old | unit | `pnpm test -- tests/army-list/StaleDataBanner.test.tsx` | ❌ Wave 0 |
| ARMY-05 | RemindersSection renders rule_name + rule_type badge for each is_reminder=1 favorite | unit | `pnpm test -- tests/army-list/RemindersSection.test.tsx` | ❌ Wave 0 |
| ARMY-05 | RemindersSection hidden entirely when no is_reminder=1 favorites | unit | `pnpm test -- tests/army-list/RemindersSection.test.tsx` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/army-list/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/army-list/DetachmentPicker.test.tsx` — covers ARMY-01 (picker UX)
- [ ] `tests/army-list/DetachmentRulesSection.test.tsx` — covers ARMY-02, ARMY-03
- [ ] `tests/army-list/StaleDataBanner.test.tsx` — covers ARMY-04
- [ ] `tests/army-list/RemindersSection.test.tsx` — covers ARMY-05

Note: `tests/army-list/ArmyListsPage.test.tsx` and `tests/army-list/UnitDeleteDialog.test.tsx` already exist — no changes needed to those files for this phase.

---

## Sources

### Primary (HIGH confidence)
- `src/features/army-lists/ArmyListDetailSheet.tsx` — current sheet structure; exact insertion points identified
- `src/hooks/useArmyLists.ts` — useClearArmyListDetachment, useUpdateArmyList signatures confirmed
- `src/hooks/useRulesExtended.ts` — all hook signatures confirmed (useDetachmentsByFaction, useDetachmentById, useDetachmentAbilitiesByDetachment, useStratagemsByDetachment)
- `src/hooks/useRulesFavorites.ts` — useRulesFavorites signature + RulesFavorite type confirmed
- `src/hooks/useDatasheet.ts` — useWahapediaFactionId + useRulesSyncMeta confirmed
- `src/lib/syncFreshness.ts` — getSyncFreshness tiers confirmed (14-day stale, NOT 30-day)
- `src/types/armyList.ts` — ArmyList.detachment_id typed as `string | null` confirmed
- `src/types/rulesFavorite.ts` — RulesFavorite interface, RULE_TYPES const confirmed
- `src/features/rules-hub/StratagemCard.tsx` — ready for direct reuse, no modifications needed
- `src/features/rules-hub/DetachmentCard.tsx` — reference for ability display pattern
- `src/features/recipes/PaintCombobox.tsx` — canonical Combobox implementation pattern
- `tests/painting/PaintCombobox.test.tsx` — canonical Combobox test pattern
- `.planning/phases/54-army-lists-2-0-detachment-selection/54-CONTEXT.md` — all decisions locked

### Secondary (MEDIUM confidence)
- `src/db/queries/armyLists.ts` — COALESCE behavior in updateArmyList and clearArmyListDetachment confirmed by direct SQL inspection

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies already installed and used in project
- Architecture: HIGH — all hook signatures, component patterns, and data layer confirmed by direct code inspection
- Pitfalls: HIGH — pitfalls identified from direct codebase inspection and STATE.md accumulated decisions

**Research date:** 2026-05-11
**Valid until:** 2026-06-10 (30 days — stable codebase, no external dependencies changing)
