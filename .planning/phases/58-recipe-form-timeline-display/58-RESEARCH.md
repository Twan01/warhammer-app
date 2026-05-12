# Phase 58: Recipe Form & Timeline Display - Research

**Researched:** 2026-05-12
**Domain:** React component modification — collapsible form controls + timeline badge rendering
**Confidence:** HIGH

---

## Summary

Phase 58 is a pure UI modification phase. Phase 57 delivered the complete data layer: migration, const arrays (`SECTION_TYPES`, `TECHNIQUES`, `EXECUTION_MODES`), TypeScript types (`RecipeSection`, `DraftSection`), and save-path wiring that already persists all four workflow metadata fields. This phase adds the missing read/write UI in two existing components.

The work divides cleanly into two independent subproblems. First, `RecipeSectionCard.tsx` gets a nested Workflow collapsible (inside the existing section Collapsible) that surfaces three selects and one text input for `section_type`, `technique`, `execution_mode`, and `applies_to`. The collapsible is conditionally rendered based on a `hasAnyWorkflowMetadata()` predicate and the section count. Second, `SectionedTimeline.tsx` gets extended section headers: a `section_type` Badge and a dot-separated inline metadata string.

No new files are required. No DB, query, or hook changes are needed — the save path already includes all four fields. No new UI primitives are needed — Collapsible, Badge, Select, and Input are already imported in these files or their direct neighbors.

**Primary recommendation:** Implement as two sequential plans — Plan 01 modifies `RecipeSectionCard`, Plan 02 modifies `SectionedTimeline`. Each plan produces its own test coverage.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Four workflow fields arranged in a 2x2 grid of compact selects inside a Collapsible: section_type + technique on row 1, execution_mode + applies_to on row 2
- **D-02:** Use existing Radix Collapsible component (already used in RecipeSectionCard for section expand/collapse)
- **D-03:** applies_to is a simple text input (free-text per WF-04), not a combobox
- **D-04:** Hide the Workflow collapsible when `sections.length === 1 && !hasAnyWorkflowMetadata(section)` — once any metadata field is set or a second section exists, the collapsible appears
- **D-05:** "Has metadata" check: `section.section_type || section.technique || section.execution_mode || section.applies_to` — any non-null field counts
- **D-06:** Implements success criterion 2: single-section, no-metadata recipes remain visually uncluttered
- **D-07:** SectionedTimeline renders workflow metadata as a dot-separated inline string after the section name: `"Section Name . Surface . Technique . ExecutionMode"`
- **D-08:** section_type renders as a single compact Badge (variant="outline") before the dot-separated metadata
- **D-09:** Only non-null fields appear in the dot-separated string — no empty placeholders
- **D-10:** Format matches success criterion 4 example: `"Armor Blue . Armor . Drybrush . Sequential"`

### Claude's Discretion

- Exact Collapsible trigger/content markup and Tailwind classes for the 2x2 grid
- Badge color variants for section_type values (or all using outline variant)
- Whether to capitalize technique/execution_mode display values or show as-is
- Exact dot separator styling (literal " . " text or styled spans)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RUI-01 | RecipeSectionCard shows workflow metadata fields under a progressive disclosure "Workflow" collapsible | Collapsible already imported; DraftSection already has all 4 fields; `onChange({ ...section, field: value })` pattern established |
| RUI-02 | Simple recipes (single section, no metadata) remain visually uncluttered — workflow collapsible hidden | D-04/D-05 specify exact predicate; `sections` count must be passed into `RecipeSectionCard` as a prop or derived from context |
| RUI-03 | SectionedTimeline displays section_type and execution_mode as compact badges alongside existing surface badge | Badge with variant="outline" already used in the section header row; `RecipeSection` type already has both fields |
| RUI-04 | SectionedTimeline displays technique inline when set | Dot-separated string derivation is pure; integrates into existing header `<span>` block |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Workflow metadata editing (section_type, technique, execution_mode, applies_to) | Frontend — RecipeSectionCard | — | Form state lives in DraftSection; onChange bubble pattern is established |
| Progressive disclosure logic (show/hide collapsible) | Frontend — RecipeSectionCard | RecipeSectionList (sections count) | Requires both section count AND metadata presence; both are available at the card level if sections count is threaded down |
| Timeline badge rendering (section_type, execution_mode) | Frontend — SectionedTimeline | — | RecipeSection is already passed in; read-only display |
| Dot-separated metadata string (technique, execution_mode) | Frontend — SectionedTimeline | — | Pure string derivation from existing RecipeSection fields |

---

## Standard Stack

### Core (already present — no installs required)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| Radix Collapsible (via `radix-ui`) | in use | Nested Workflow collapsible | Already imported in RecipeSectionCard [VERIFIED: codebase] |
| shadcn Badge | in use | section_type badge in timeline | Already used in SectionedTimeline [VERIFIED: codebase] |
| shadcn Select | in use | section_type, technique, execution_mode dropdowns | Already imported in RecipeSectionCard [VERIFIED: codebase] |
| shadcn Input | in use | applies_to free-text field | Already imported in RecipeSectionCard [VERIFIED: codebase] |
| SECTION_TYPES, TECHNIQUES, EXECUTION_MODES | Phase 57 | Dropdown option values | Live in `src/types/recipeSection.ts` [VERIFIED: codebase] |

**Installation:** None required.

---

## Architecture Patterns

### System Architecture Diagram

```
User edits section in RecipeFormSheet
         |
         v
RecipeSectionList (has `sections` array + `onChange`)
         |
         v
RecipeSectionCard (receives `section: DraftSection`, `onChange`, `sectionsCount: number`)
         |
   [hasWorkflowMetadata OR sectionsCount > 1]
         |
         v
  Workflow Collapsible (nested inside existing Collapsible)
    ├── Select: section_type   → onChange({ ...section, section_type: v })
    ├── Select: technique      → onChange({ ...section, technique: v })
    ├── Select: execution_mode → onChange({ ...section, execution_mode: v })
    └── Input:  applies_to    → onChange({ ...section, applies_to: v })
         |
         v (no new save path — already wired in RecipeFormSheet.onSubmit)
     createRecipeSection / DB

RecipeDetailSheet
         |
         v (reads RecipeSection[] from useRecipeSections hook)
SectionedTimeline (receives `sections: RecipeSection[]`)
         |
         v (per section header)
    [section_type] → Badge variant="outline"
    [surface . technique . execution_mode] → dot-separated inline text
```

### Recommended Project Structure
```
src/features/recipes/
  RecipeSectionCard.tsx    ← Plan 01: add Workflow nested Collapsible
  SectionedTimeline.tsx    ← Plan 02: add section_type Badge + dot string
  (no new files)
```

### Pattern 1: Nested Collapsible (Workflow inside Section)

**What:** A second `<Collapsible>` component rendered inside the `<CollapsibleContent>` of the outer section collapsible, before `<RecipeStepList>`.

**When to use:** When `sectionsCount > 1 || hasAnyWorkflowMetadata(section)` — respects D-04.

**Key structural point:** The outer Collapsible controls section expand/collapse. The inner (Workflow) collapsible is an independent `open`/`onOpenChange` state. Both use the same imported Collapsible component.

**Example structure (illustrative):**
```tsx
// Source: src/components/ui/collapsible.tsx (Radix wrapper — verified in codebase)
<CollapsibleContent>
  <div className="px-3 pb-3 flex flex-col gap-3">
    {showWorkflowCollapsible && (
      <Collapsible open={workflowOpen} onOpenChange={setWorkflowOpen}>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs">
            <ChevronDown className={cn("h-3 w-3 transition-transform", workflowOpen && "rotate-180")} />
            Workflow
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid grid-cols-2 gap-2 pt-2">
            {/* section_type select */}
            {/* technique select */}
            {/* execution_mode select */}
            {/* applies_to input */}
          </div>
        </CollapsibleContent>
      </Collapsible>
    )}
    <RecipeStepList ... />
  </div>
</CollapsibleContent>
```

### Pattern 2: Select with `__none__` sentinel for nullable fields

**What:** The existing pattern in RecipeSectionCard uses `value={section.surface ?? "__none__"}` and `onValueChange={(v) => onChange({ ...section, surface: v === "__none__" ? null : v })}`. The three workflow selects follow the same pattern.

**Why:** Radix Select requires a non-empty string value; `__none__` represents the null DB value.

**Example (from existing RecipeSectionCard surface select — verified):**
```tsx
// Source: src/features/recipes/RecipeSectionCard.tsx (verified in codebase)
<Select
  value={section.surface ?? "__none__"}
  onValueChange={(v) => onChange({ ...section, surface: v === "__none__" ? null : v })}
>
  <SelectTrigger className="h-7 w-[120px] text-xs">
    <SelectValue placeholder="Surface" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="__none__">-- surface --</SelectItem>
    {RECIPE_SURFACES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
  </SelectContent>
</Select>
```

The three workflow selects use identical pattern with their respective const arrays.

### Pattern 3: Dot-separated metadata string in SectionedTimeline

**What:** A pure derivation — collect non-null fields into an array, `.join(" . ")`.

**When to use:** Whenever at least one of `surface`, `technique`, `execution_mode` is set on the section. If none are set, render nothing.

**Example:**
```tsx
// Source: derived from SectionedTimeline.tsx analysis (ASSUMED display approach)
const metaParts = [
  section.surface,
  section.technique,
  section.execution_mode,
].filter(Boolean);
const metaString = metaParts.join(" . ");  // e.g. "Armor . Drybrush . Sequential"

// In the header JSX:
{metaString && (
  <span className="text-xs text-muted-foreground">{metaString}</span>
)}
```

**Note on D-07 vs D-08:** D-07 describes the full format as `"Section Name . Surface . Technique . ExecutionMode"`. But D-08 says `section_type` is a Badge (not part of the dot string). Looking at D-10's example `"Armor Blue . Armor . Drybrush . Sequential"` — this is the section name followed by surface/technique/execution_mode. So `section_type` is a standalone Badge, and the dot string is `surface . technique . execution_mode`.

### Anti-Patterns to Avoid

- **Two-state Collapsible coupling:** Do not share `open` state between the outer section collapsible and the Workflow collapsible. They are independent. The outer controls the step list; the inner controls the workflow fields.
- **Rendering Workflow collapsible always:** Without the D-04 guard (`sections.length === 1 && !hasAnyWorkflowMetadata`), the form will show the Workflow UI on every new recipe — violating RUI-02.
- **Hardcoding dropdown labels:** Import from `SECTION_TYPES`, `TECHNIQUES`, `EXECUTION_MODES` const arrays in `src/types/recipeSection.ts` — do not repeat the values.
- **Empty dot-string placeholders:** Only include fields with non-null values in the dot string per D-09.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Collapsible animation | Custom CSS height transition | Radix Collapsible (already imported) | Already handles enter/exit animation, keyboard nav, ARIA |
| Dropdown for enum fields | `<select>` HTML element | shadcn Select (already imported) | Consistent visual design, proper z-index in Sheet |
| Dropdown options | Hardcoded `<option>` strings | `SECTION_TYPES`, `TECHNIQUES`, `EXECUTION_MODES` const arrays | Single source of truth delivered by Phase 57 |
| Badge rendering | Styled `<span>` | shadcn Badge (already imported in SectionedTimeline) | Consistent pill styling with existing surface/optional badges |

---

## Common Pitfalls

### Pitfall 1: sections count not threaded to RecipeSectionCard
**What goes wrong:** `RecipeSectionCard` renders in isolation — it doesn't know if other sections exist. D-04 requires hiding the Workflow collapsible when `sections.length === 1` AND no metadata is set. If `sectionsCount` is not passed as a prop, the card cannot implement this check.
**Why it happens:** `RecipeSectionList` maps over sections and renders each `RecipeSectionCard` independently; the section count is in the list, not the card.
**How to avoid:** Add a `sectionsCount: number` prop to `RecipeSectionCard`. `RecipeSectionList` passes `sections.length`. `RecipeFormSheet` passes `sections.length` directly when rendering sections inline (the `sections.length <= 1` code path).
**Warning signs:** Workflow collapsible appears on brand-new single-section recipes before any metadata is entered.

### Pitfall 2: applies_to input type="text" value prop needs null handling
**What goes wrong:** React `<Input value={null}>` renders a warning and behaves as uncontrolled.
**Why it happens:** `applies_to` defaults to `null` in DraftSection; naive `value={section.applies_to}` passes null.
**How to avoid:** Use `value={section.applies_to ?? ""}` and `onChange={(e) => onChange({ ...section, applies_to: e.target.value || null })}` — matching the exact pattern used for `area` in RecipeFormSheet.
**Warning signs:** React console warning about switching controlled/uncontrolled input.

### Pitfall 3: Workflow collapsible inside a Sheet causes z-index issues with Select dropdowns
**What goes wrong:** The Select dropdown (`SelectContent`) inside a Sheet may render below the Sheet overlay.
**Why it happens:** Radix portals — `SelectContent` is portalled to body but z-index stacking can be affected by parent context.
**How to avoid:** This is already solved in `RecipeFormSheet` which uses Select inside a Sheet successfully (surface, style, effect, difficulty selects). The same Radix Select component will work inside RecipeSectionCard's nested Collapsible without additional z-index handling.
**Warning signs:** Dropdown appears but is invisible or clipped.

### Pitfall 4: Timeline dot string includes section_type when it should be a Badge
**What goes wrong:** D-08 makes section_type a Badge; D-07's format string mentions it as part of the dot string. Implementing both produces a duplicate display.
**Why it happens:** D-07 describes the full conceptual format; D-08 overrides the visual treatment of section_type specifically.
**How to avoid:** The dot-separated string contains ONLY `surface`, `technique`, `execution_mode`. The `section_type` Badge is rendered separately before (or after) the dot string, not inside it. D-10's example `"Armor Blue . Armor . Drybrush . Sequential"` confirms this: the four parts are name, surface, technique, execution_mode — no section_type token.
**Warning signs:** section_type value appears twice in the timeline header (once as Badge, once in the dot string).

---

## Code Examples

### Verified: Existing Collapsible usage in RecipeSectionCard
```tsx
// Source: src/features/recipes/RecipeSectionCard.tsx (verified in codebase)
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

const [open, setOpen] = useState(true);

<Collapsible open={open} onOpenChange={setOpen}>
  <div className="flex items-center gap-2 p-3">
    <CollapsibleTrigger asChild>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </Button>
    </CollapsibleTrigger>
  </div>
  <CollapsibleContent>
    <div className="px-3 pb-3">
      <RecipeStepList ... />
    </div>
  </CollapsibleContent>
</Collapsible>
```

### Verified: Existing section header in SectionedTimeline
```tsx
// Source: src/features/recipes/SectionedTimeline.tsx (verified in codebase)
<div className="flex items-center gap-2" data-testid="section-header">
  <span className="text-sm font-semibold">{section.name}</span>
  {section.surface && (
    <Badge variant="outline" className="text-xs">{section.surface}</Badge>
  )}
  {section.optional === 1 && (
    <Badge variant="outline" className="text-xs">Optional</Badge>
  )}
  {/* Right-side metadata (step count, time, availability) */}
  <span className="text-xs text-muted-foreground ml-auto flex items-center gap-3">
    ...
  </span>
</div>
```

New badges and dot string insert between the optional badge and the `ml-auto` span.

### Verified: hasAnyWorkflowMetadata predicate (from D-05)
```tsx
// Source: CONTEXT.md D-05 (user decision)
function hasAnyWorkflowMetadata(section: DraftSection): boolean {
  return !!(section.section_type || section.technique || section.execution_mode || section.applies_to);
}
```

### Verified: DraftSection workflow fields
```typescript
// Source: src/features/recipes/recipeSection.ts (verified in codebase)
export interface DraftSection {
  localId: string;
  name: string;
  surface: string | null;
  optional: number;
  notes: string | null;
  section_type: string | null;   // Phase 57 — WF-01
  technique: string | null;       // Phase 57 — WF-02
  execution_mode: string | null;  // Phase 57 — WF-03
  applies_to: string | null;      // Phase 57 — WF-04
  steps: DraftStep[];
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Steps only, no sections | Sections with DnD reorder | Phase 48-51 (v0.2.7) | DraftSection/RecipeSectionCard already exist |
| No workflow metadata | 4 nullable metadata columns + const arrays | Phase 57 (v0.2.9) | All data is ready; this phase is UI only |

**Deprecated/outdated:** None relevant to this phase.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The dot-separated string in D-10 uses `surface . technique . execution_mode` (not `section_type`) based on reading D-07, D-08, and D-10 together | Architecture Patterns Pattern 3 | If section_type should also appear in the dot string, the format logic and test assertions would need updating — low impact to fix |
| A2 | `applies_to` input renders as a plain `<Input>` sized to match the grid cell (no separate width class needed — the 2x2 grid handles it) | Standard Stack | Minor layout issue only; easy to adjust during implementation |
| A3 | The Workflow collapsible starts closed by default (`useState(false)`) — users open it on demand | Architecture Patterns | If it should start open when metadata is set, the initial state would need to derive from `hasAnyWorkflowMetadata(section)` |

---

## Open Questions

1. **Workflow collapsible initial open state when metadata already exists**
   - What we know: New sections have no metadata → closed. D-04 only controls visibility, not initial open state.
   - What's unclear: When editing a recipe that already has `section_type` set, should the Workflow collapsible auto-expand to show the existing values?
   - Recommendation: Default to closed (`useState(false)`) — the metadata is visible in the timeline, not in the form collapsible. The user can open it if they need to edit. This keeps the form uncluttered on load.

2. **sections count prop name and propagation path**
   - What we know: RecipeSectionCard needs to know `sections.length` to implement D-04. RecipeSectionList passes sections to cards individually.
   - What's unclear: Whether to name the prop `sectionsCount: number` or `totalSections: number`, and whether RecipeFormSheet's direct render path (`sections.length <= 1`) passes it.
   - Recommendation: Name it `sectionsCount`. Pass `sections.length` from both RecipeSectionList and from RecipeFormSheet's inline step list path. The inline path (single-section) always passes `1` — the collapsible will be hidden unless metadata is set, matching D-04.

---

## Environment Availability

Step 2.6: SKIPPED — no external dependencies. This phase modifies two existing TypeScript/React files using only already-imported UI primitives.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vite.config.ts` (vitest config inline) |
| Quick run command | `pnpm test -- tests/painting/recipeSectionCard.test.tsx tests/painting/sectionedTimeline.test.tsx` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RUI-01 | RecipeSectionCard shows Workflow collapsible with 4 fields | component | `pnpm test -- tests/painting/recipeSectionCard.test.tsx` | Extend existing ✅ |
| RUI-02 | Collapsible hidden for single-section, no-metadata recipes | component | `pnpm test -- tests/painting/recipeSectionCard.test.tsx` | Extend existing ✅ |
| RUI-03 | SectionedTimeline renders section_type Badge | component | `pnpm test -- tests/painting/sectionedTimeline.test.tsx` | Extend existing ✅ |
| RUI-04 | SectionedTimeline renders dot-separated technique/execution_mode string | component | `pnpm test -- tests/painting/sectionedTimeline.test.tsx` | Extend existing ✅ |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/painting/recipeSectionCard.test.tsx tests/painting/sectionedTimeline.test.tsx`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
None — both test files exist and cover the components being modified. New test cases for RUI-01 through RUI-04 are added to the existing files, not in new files.

---

## Security Domain

No security-relevant concerns for this phase. The changes are:
- Read-only rendering of already-stored enum string values (no user-controlled HTML injection — Badge and text span use React's JSX escaping)
- Form inputs for nullable text/enum fields — values are written to `DraftSection` state, then persisted via the existing parameterized query layer (no raw SQL concatenation in this phase)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | Minimal | Values written to DraftSection state and then to DB via parameterized `$1, $2` queries (Phase 57 query layer) — no additional validation needed in UI layer for constrained enum selects |
| V6 Cryptography | No | — |

---

## Sources

### Primary (HIGH confidence)
- `src/features/recipes/RecipeSectionCard.tsx` — verified imports, component structure, Collapsible usage, Select pattern, onChange callback shape
- `src/features/recipes/SectionedTimeline.tsx` — verified section header structure, Badge usage, existing metadata display
- `src/types/recipeSection.ts` — verified SECTION_TYPES, TECHNIQUES, EXECUTION_MODES const arrays and RecipeSection interface with workflow fields
- `src/features/recipes/recipeSection.ts` — verified DraftSection interface with workflow fields, makeDraftSection, buildDraftSections
- `src/features/recipes/RecipeFormSheet.tsx` — verified save path already includes all 4 fields; `sections.length <= 1` branching logic
- `tests/painting/recipeSectionCard.test.tsx` — verified existing test coverage and fixture structure
- `tests/painting/sectionedTimeline.test.tsx` — verified existing test coverage and section fixture structure
- `.planning/phases/58-recipe-form-timeline-display/58-CONTEXT.md` — locked decisions D-01 through D-10

### Secondary (MEDIUM confidence)
- CONTEXT.md D-10 example `"Armor Blue . Armor . Drybrush . Sequential"` — informs which fields compose the dot string (surface, technique, execution_mode — not section_type)

### Tertiary (LOW confidence — ASSUMED)
- A1: interpretation of D-07/D-08/D-10 ordering (surface not section_type in dot string) — flagged in Assumptions Log

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified present in codebase
- Architecture: HIGH — both files read in full; component boundaries clear
- Pitfalls: HIGH — derived from direct code reading, not speculation
- Test map: HIGH — both test files verified present with correct structure

**Research date:** 2026-05-12
**Valid until:** Stable — only changes if RecipeSectionCard or SectionedTimeline are refactored before planning starts
