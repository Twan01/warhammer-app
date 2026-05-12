# Phase 58: Recipe Form & Timeline Display - Pattern Map

**Mapped:** 2026-05-12
**Files analyzed:** 4 (2 modified components + 2 test files extended)
**Analogs found:** 4 / 4 — all from the files being modified themselves (exact self-analogs)

---

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------|------|-----------|----------------|---------------|
| `src/features/recipes/RecipeSectionCard.tsx` | component | request-response (form) | Self — existing Collapsible + Select patterns within the file | exact |
| `src/features/recipes/SectionedTimeline.tsx` | component | transform (read-only display) | Self — existing Badge + conditional rendering patterns within the file | exact |
| `src/features/recipes/RecipeSectionList.tsx` | component | transform | Self — existing prop-threading to `RecipeSectionCard` | exact |
| `tests/painting/recipeSectionCard.test.tsx` | test | — | Self — existing `makeSection` fixture and `renderCard` helper | exact |
| `tests/painting/sectionedTimeline.test.tsx` | test | — | Self — existing `makeSection` fixture and render helpers | exact |

---

## Pattern Assignments

### `src/features/recipes/RecipeSectionCard.tsx` — Add Workflow nested Collapsible

**Analog:** Self (lines 1–171 read in full above)

**Imports pattern** (lines 1–28 — nothing new required):
```tsx
import { useState } from "react";
import { GripVertical, Trash2, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { type DraftSection } from "./recipeSection";
```

New imports to add — const arrays from Phase 57:
```tsx
import { SECTION_TYPES, TECHNIQUES, EXECUTION_MODES } from "@/types/recipeSection";
```

**Props interface — add `sectionsCount`** (lines 30–35):
```tsx
interface RecipeSectionCardProps {
  section: DraftSection;
  onChange: (updated: DraftSection) => void;
  onRemove: () => void;
  onCreateNewPaint: (stepLocalId: string) => void;
  // NEW: required for D-04 progressive disclosure guard
  sectionsCount: number;
}
```

**Outer Collapsible pattern to nest inside** (lines 66–151 — the pattern to copy for the inner one):
```tsx
// Outer (section expand/collapse) — already exists; keep unchanged
const [open, setOpen] = useState(true);

<Collapsible open={open} onOpenChange={setOpen}>
  <div className="flex items-center gap-2 p-3">
    ...
    <CollapsibleTrigger asChild>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </Button>
    </CollapsibleTrigger>
    ...
  </div>
  <CollapsibleContent>
    <div className="px-3 pb-3">
      {/* Workflow inner Collapsible inserts HERE, before RecipeStepList */}
      <RecipeStepList ... />
    </div>
  </CollapsibleContent>
</Collapsible>
```

**Inner (Workflow) Collapsible — new state + predicate pattern:**
```tsx
// New state alongside existing `open` state (line 47)
const [workflowOpen, setWorkflowOpen] = useState(false);

// Progressive disclosure predicate (D-04, D-05)
function hasAnyWorkflowMetadata(s: DraftSection): boolean {
  return !!(s.section_type || s.technique || s.execution_mode || s.applies_to);
}
const showWorkflowCollapsible = sectionsCount > 1 || hasAnyWorkflowMetadata(section);
```

**Select with `__none__` sentinel pattern** (lines 87–102 — existing surface select, exact pattern to copy for workflow selects):
```tsx
<Select
  value={section.surface ?? "__none__"}
  onValueChange={(v) => onChange({ ...section, surface: v === "__none__" ? null : v })}
>
  <SelectTrigger className="h-7 w-[120px] text-xs">
    <SelectValue placeholder="Surface" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="__none__">-- surface --</SelectItem>
    {RECIPE_SURFACES.map((s) => (
      <SelectItem key={s} value={s}>{s}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

Apply same pattern for the three workflow selects:
```tsx
// section_type select (copy surface pattern, swap array + field name)
<Select
  value={section.section_type ?? "__none__"}
  onValueChange={(v) => onChange({ ...section, section_type: v === "__none__" ? null : v })}
>
  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
  <SelectContent>
    <SelectItem value="__none__">-- type --</SelectItem>
    {SECTION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
  </SelectContent>
</Select>

// technique select — same pattern with TECHNIQUES
// execution_mode select — same pattern with EXECUTION_MODES
```

**`applies_to` Input — null-safe controlled input pattern** (from RESEARCH pitfall 2):
```tsx
// Matches the `area` field pattern used elsewhere in RecipeFormSheet
<Input
  value={section.applies_to ?? ""}
  onChange={(e) => onChange({ ...section, applies_to: e.target.value || null })}
  placeholder="Applies to"
  className="h-7 text-xs"
/>
```

**2×2 grid layout pattern** (D-01 — new, no existing analog; use Tailwind grid):
```tsx
<div className="grid grid-cols-2 gap-2 pt-2">
  {/* Row 1: section_type | technique */}
  {/* Row 2: execution_mode | applies_to */}
</div>
```

**Full inner Collapsible structure:**
```tsx
{showWorkflowCollapsible && (
  <Collapsible open={workflowOpen} onOpenChange={setWorkflowOpen}>
    <CollapsibleTrigger asChild>
      <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs">
        <ChevronDown className={cn("h-3 w-3 transition-transform", workflowOpen && "rotate-180")} />
        Workflow
      </Button>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <div className="grid grid-cols-2 gap-2 pt-2 pb-2">
        {/* section_type */}
        {/* technique */}
        {/* execution_mode */}
        {/* applies_to */}
      </div>
    </CollapsibleContent>
  </Collapsible>
)}
```

---

### `src/features/recipes/RecipeSectionList.tsx` — Thread `sectionsCount` to cards

**Analog:** Self (lines 1–65 read in full above)

**Current card render** (lines 52–58 — add `sectionsCount` prop):
```tsx
// BEFORE
<RecipeSectionCard
  key={section.localId}
  section={section}
  onChange={(updated) => updateSection(section.localId, updated)}
  onRemove={() => removeSection(section.localId)}
  onCreateNewPaint={onCreateNewPaint}
/>

// AFTER — add sectionsCount
<RecipeSectionCard
  key={section.localId}
  section={section}
  onChange={(updated) => updateSection(section.localId, updated)}
  onRemove={() => removeSection(section.localId)}
  onCreateNewPaint={onCreateNewPaint}
  sectionsCount={sections.length}
/>
```

No other changes to this file.

---

### `src/features/recipes/SectionedTimeline.tsx` — Add section_type Badge + dot string

**Analog:** Self (lines 1–133 read in full above)

**Existing Badge conditional rendering pattern** (lines 72–80 — copy this pattern for section_type):
```tsx
{section.surface && (
  <Badge variant="outline" className="text-xs">
    {section.surface}
  </Badge>
)}
{section.optional === 1 && (
  <Badge variant="outline" className="text-xs">
    Optional
  </Badge>
)}
```

**New section_type Badge** — insert after the optional badge, before the `ml-auto` span:
```tsx
{section.section_type && (
  <Badge variant="outline" className="text-xs">
    {section.section_type}
  </Badge>
)}
```

**Dot-separated metadata string** — pure derivation (D-07/D-09/D-10):
```tsx
// Compute before JSX return (inside the sections.map callback)
const metaParts = [
  section.surface,
  section.technique,
  section.execution_mode,
].filter(Boolean) as string[];
const metaString = metaParts.join(" . ");

// Insert in the header, after badges, before ml-auto span:
{metaString && (
  <span className="text-xs text-muted-foreground">{metaString}</span>
)}
```

**Full updated section header structure** (derived from lines 70–120):
```tsx
<div className="flex items-center gap-2" data-testid="section-header">
  <span className="text-sm font-semibold">{section.name}</span>
  {section.surface && (
    <Badge variant="outline" className="text-xs">{section.surface}</Badge>
  )}
  {section.optional === 1 && (
    <Badge variant="outline" className="text-xs">Optional</Badge>
  )}
  {/* NEW — Phase 58 */}
  {section.section_type && (
    <Badge variant="outline" className="text-xs">{section.section_type}</Badge>
  )}
  {metaString && (
    <span className="text-xs text-muted-foreground">{metaString}</span>
  )}
  {/* Right-side metadata — unchanged, ml-auto pushes it right */}
  <span className="text-xs text-muted-foreground ml-auto flex items-center gap-3">
    ...
  </span>
</div>
```

**Note on D-10 format:** `metaParts` includes `surface`, `technique`, `execution_mode` — NOT `section_type` (which is a Badge per D-08). The surface badge AND the dot string both show surface; this is intentional per D-10's example `"Armor Blue . Armor . Drybrush . Sequential"`.

---

### `tests/painting/recipeSectionCard.test.tsx` — Extend with RUI-01 and RUI-02 test cases

**Analog:** Self (lines 1–364 read in full above)

**Fixture factory — `makeSection` already includes workflow fields** (lines 75–89):
```tsx
function makeSection(over: Partial<DraftSection> = {}): DraftSection {
  return {
    localId: "local-sec-001",
    name: "Armor",
    surface: null,
    optional: 0,
    notes: null,
    section_type: null,   // already present from Phase 57
    technique: null,
    execution_mode: null,
    applies_to: null,
    steps: [],
    ...over,
  };
}
```

**`renderCard` helper — add `sectionsCount` prop** (lines 107–124):
```tsx
// BEFORE signature
function renderCard(section: DraftSection, overrides: {
  onChange?: (s: DraftSection) => void;
  onRemove?: () => void;
  onCreateNewPaint?: (id: string) => void;
} = {})

// AFTER — add sectionsCount (default 1 for backwards compat)
function renderCard(section: DraftSection, overrides: {
  onChange?: (s: DraftSection) => void;
  onRemove?: () => void;
  onCreateNewPaint?: (id: string) => void;
  sectionsCount?: number;
} = {}) {
  const { sectionsCount = 1, ...rest } = overrides;
  // ...pass sectionsCount to RecipeSectionCard
  render(
    <RecipeSectionCard
      section={section}
      onChange={onChange}
      onRemove={onRemove}
      onCreateNewPaint={onCreateNewPaint}
      sectionsCount={sectionsCount}
    />
  );
}
```

**New describe blocks to add** (following existing pattern of `describe("RecipeSectionCard — GAP label"):`):
```tsx
// RUI-01 — Workflow collapsible renders with all 4 fields
describe("RecipeSectionCard — RUI-01 workflow collapsible visible", () => {
  it("shows Workflow trigger when sectionsCount > 1", () => { ... });
  it("shows Workflow trigger when section has metadata (single-section)", () => { ... });
  it("Workflow collapsible content shows section_type select when opened", () => { ... });
  it("changing section_type calls onChange with updated section_type", () => { ... });
  it("changing technique calls onChange with updated technique", () => { ... });
  it("changing execution_mode calls onChange with updated execution_mode", () => { ... });
  it("changing applies_to input calls onChange with updated applies_to", () => { ... });
  it("clearing applies_to input sets applies_to to null", () => { ... });
});

// RUI-02 — Progressive disclosure guard
describe("RecipeSectionCard — RUI-02 workflow collapsible hidden for simple recipe", () => {
  it("hides Workflow trigger when sectionsCount === 1 and no metadata set", () => { ... });
  it("shows Workflow trigger when sectionsCount === 1 but section_type is set", () => { ... });
});
```

---

### `tests/painting/sectionedTimeline.test.tsx` — Extend with RUI-03 and RUI-04 test cases

**Analog:** Self (lines 1–316 read in full above)

**Fixture factory — `makeSection` already includes workflow fields** (lines 39–56):
```tsx
function makeSection(over: Partial<RecipeSection> = {}): RecipeSection {
  return {
    id: 1, recipe_id: 1, name: "Section A",
    surface: null, optional: 0, order_index: 0, notes: null,
    section_type: null,   // already present from Phase 57
    technique: null, execution_mode: null, applies_to: null,
    created_at: "2026-01-01", updated_at: "2026-01-01",
    ...over,
  };
}
```

**New describe blocks to add** (following existing `describe("SectionedTimeline — VIEW-XX")` pattern):
```tsx
// RUI-03 — section_type Badge
describe("SectionedTimeline — RUI-03 (section_type badge)", () => {
  it("shows section_type badge text when section_type is set", () => {
    const sections = [makeSection({ id: 1, section_type: "basecoat" })];
    render(<SectionedTimeline sections={sections} steps={[]} paintMap={new Map()} />);
    expect(screen.getByText("basecoat")).toBeInTheDocument();
  });
  it("does not render section_type badge when section_type is null", () => { ... });
});

// RUI-04 — Dot-separated technique / execution_mode
describe("SectionedTimeline — RUI-04 (dot-separated metadata string)", () => {
  it("shows dot-separated string with surface, technique, execution_mode when all set", () => {
    const sections = [makeSection({ id: 1, surface: "Armor", technique: "drybrush", execution_mode: "sequential" })];
    render(<SectionedTimeline sections={sections} steps={[]} paintMap={new Map()} />);
    expect(screen.getByText("Armor . drybrush . sequential")).toBeInTheDocument();
  });
  it("omits null fields from dot string", () => {
    const sections = [makeSection({ id: 1, technique: "drybrush", execution_mode: null })];
    render(<SectionedTimeline sections={sections} steps={[]} paintMap={new Map()} />);
    expect(screen.getByText("drybrush")).toBeInTheDocument();
    // No trailing " . " from null execution_mode
  });
  it("renders no dot string when all three fields are null", () => { ... });
});
```

---

## Shared Patterns

### Collapsible (Radix via shadcn)
**Source:** `src/features/recipes/RecipeSectionCard.tsx` lines 5, 66–151
**Apply to:** Workflow inner Collapsible in RecipeSectionCard
```tsx
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

const [workflowOpen, setWorkflowOpen] = useState(false);

<Collapsible open={workflowOpen} onOpenChange={setWorkflowOpen}>
  <CollapsibleTrigger asChild>
    <Button type="button" variant="ghost" size="sm" ...>
      <ChevronDown className={cn("h-3 w-3 transition-transform", workflowOpen && "rotate-180")} />
      Workflow
    </Button>
  </CollapsibleTrigger>
  <CollapsibleContent>...</CollapsibleContent>
</Collapsible>
```

### `__none__` sentinel for nullable Select values
**Source:** `src/features/recipes/RecipeSectionCard.tsx` lines 87–102
**Apply to:** All three workflow Select controls (section_type, technique, execution_mode)
```tsx
value={section.FIELD ?? "__none__"}
onValueChange={(v) => onChange({ ...section, FIELD: v === "__none__" ? null : v })}
```

### Null-safe controlled Input for nullable text
**Source:** RESEARCH pitfall 2 + recipeSection.ts DraftSection interface
**Apply to:** `applies_to` Input in Workflow collapsible
```tsx
value={section.applies_to ?? ""}
onChange={(e) => onChange({ ...section, applies_to: e.target.value || null })}
```

### Badge conditional rendering
**Source:** `src/features/recipes/SectionedTimeline.tsx` lines 72–80
**Apply to:** `section_type` Badge in SectionedTimeline
```tsx
{section.section_type && (
  <Badge variant="outline" className="text-xs">{section.section_type}</Badge>
)}
```

### onChange bubble pattern
**Source:** `src/features/recipes/RecipeSectionCard.tsx` lines 83, 89, 109
**Apply to:** All four new form controls in Workflow collapsible
```tsx
// Pattern: spread section, override one field
onChange({ ...section, FIELD: newValue })
```

---

## No Analog Found

None — all patterns are directly available in the two files being modified. No greenfield components are being created.

---

## Key Anti-Patterns (from RESEARCH.md)

| Anti-Pattern | Correct Approach |
|--------------|-----------------|
| Sharing `open` state between outer and inner Collapsibles | Independent `useState` for each Collapsible |
| Always rendering Workflow collapsible | Guard: `sectionsCount > 1 \|\| hasAnyWorkflowMetadata(section)` |
| Hardcoding dropdown option strings | Import `SECTION_TYPES`, `TECHNIQUES`, `EXECUTION_MODES` from `src/types/recipeSection.ts` |
| Including `section_type` in the dot string | `section_type` is a Badge only; dot string = `surface . technique . execution_mode` |
| `value={section.applies_to}` (passes null) | `value={section.applies_to ?? ""}` |

---

## Metadata

**Analog search scope:** `src/features/recipes/` (primary), `src/types/recipeSection.ts`, `tests/painting/`
**Files read:** RecipeSectionCard.tsx, SectionedTimeline.tsx, RecipeSectionList.tsx, recipeSection.ts, recipeSection (types), recipeSectionCard.test.tsx, sectionedTimeline.test.tsx
**Pattern extraction date:** 2026-05-12
