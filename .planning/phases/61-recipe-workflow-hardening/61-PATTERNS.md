# Phase 61: Recipe Workflow Hardening — Pattern Map

**Mapped:** 2026-05-13
**Files analyzed:** 4 (2 new test files, 2 verified-unchanged files, plus build/manual verification tasks)
**Analogs found:** 4 / 4

---

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------------|------|-----------|----------------|---------------|
| `tests/painting/computeWorkflowPosition.test.ts` | test (pure-fn) | transform | `tests/dashboard/computeStats.test.ts` | exact |
| `tests/painting/RecipeSectionCard.test.tsx` | test (component) | request-response | `tests/dashboard/CurrentFocusCard.test.tsx` | exact |
| `src-tauri/src/lib.rs` (verify only) | config | — | self — already fixed | verified |
| `src/features/recipes/RecipeSectionCard.tsx` (verify only) | component | request-response | self — progressive disclosure already correct | verified |

> **Note:** This is a hardening phase. The two canonical source files (`lib.rs`, `RecipeSectionCard.tsx`) require
> no code changes — only verification. The deliverables are two new test files and a manual smoke-test protocol.

---

## Pattern Assignments

### `tests/painting/computeWorkflowPosition.test.ts` (test, pure-fn transform)

**Analog:** `tests/dashboard/computeStats.test.ts`

**File header / import pattern** (`tests/dashboard/computeStats.test.ts` lines 1–12):
```typescript
/**
 * [REQ-ID] — [description of what is tested]
 *
 * Test fixture pattern: a builder function with all fields defaulted,
 * callers override only what their assertion cares about.
 */
import { describe, it, expect } from "vitest";
import { computeWorkflowPosition } from "@/lib/computeWorkflowPosition";
import type { RecipeSection } from "@/types/recipeSection";
import type { RecipeStep } from "@/types/recipePaint";
```

**Fixture builder pattern** (`tests/dashboard/computeStats.test.ts` lines 14–38):
```typescript
// Minimal builder — override only the field under test
function makeSection(over: Partial<RecipeSection> = {}): RecipeSection {
  return {
    id: 1,
    recipe_id: 1,
    name: "Steps",
    surface: null,
    optional: 0,
    order_index: 0,
    notes: null,
    section_type: null,
    technique: null,
    execution_mode: null,
    applies_to: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}
```

**Core assertion pattern** (pure-fn: call → assert return value, no mocks needed):
```typescript
describe("RH-02: D-04 degradation — section renamed, step ID stale", () => {
  it("returns null when lastSessionSectionName does not match any section name", () => {
    const sections = [makeSection({ name: "Armour (v2)" })]; // renamed
    const steps: RecipeStep[] = [];
    const result = computeWorkflowPosition(null, "Armour", sections, steps);
    expect(result).toBeNull();
  });

  it("returns section-level position when name still matches after rename is NOT applied", () => {
    const sections = [makeSection({ name: "Armour" })];
    const result = computeWorkflowPosition(null, "Armour", sections, []);
    expect(result).not.toBeNull();
    expect(result!.sectionName).toBe("Armour");
  });
});
```

**No-mock guarantee:** `computeWorkflowPosition` is a pure function. No `vi.mock` needed.
No `QueryClient` wrapper needed. Import directly and call.

**What tests must cover (RH-02):**
- `null, null` inputs → returns `null` (D-05 early exit)
- Valid step ID found → returns full position with sectionName, stepName, isComplete
- Stale section name (renamed) → `find()` returns undefined → function returns `null` (D-04 fallback)
- Valid section name match → returns section-level position (sectionName set, stepName null)
- Flat recipe (no sections, step ID given) → returns step-only position (sectionIndex/sectionName null)

---

### `tests/painting/RecipeSectionCard.test.tsx` (test, component)

**Analog:** `tests/dashboard/CurrentFocusCard.test.tsx`

**File header / mock pattern** (`tests/dashboard/CurrentFocusCard.test.tsx` lines 1–22):
```tsx
/**
 * RH-03 — RecipeSectionCard progressive disclosure threshold.
 *
 * Verifies that showWorkflowCollapsible is false for single-section + no metadata,
 * and true whenever sectionsCount > 1 or any metadata field is non-null.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecipeSectionCard } from "@/features/recipes/RecipeSectionCard";
import type { DraftSection } from "@/features/recipes/recipeSection";

// DnD context required by useSortable inside RecipeSectionCard
// Mock the DnD kit to avoid needing a full DndContext in every test
vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));
```

**Fixture builder pattern** (mirrors `CurrentFocusCard.test.tsx` lines 28–57):
```tsx
function makeDraftSection(over: Partial<DraftSection> = {}): DraftSection {
  return {
    localId: "local-1",
    name: "Steps",
    surface: null,
    optional: 0,
    order_index: 0,
    notes: null,
    section_type: null,
    technique: null,
    execution_mode: null,
    applies_to: null,
    steps: [],
    ...over,
  };
}
```

**Core RTL render + assertion pattern** (`tests/dashboard/CurrentFocusCard.test.tsx`):
```tsx
it("hides workflow collapsible when sectionsCount=1 and no metadata", () => {
  render(
    <RecipeSectionCard
      section={makeDraftSection()}
      onChange={vi.fn()}
      onRemove={vi.fn()}
      onCreateNewPaint={vi.fn()}
      sectionsCount={1}
    />
  );
  // The "Workflow" trigger button should not appear
  expect(screen.queryByText("Workflow")).toBeNull();
});

it("shows workflow collapsible when sectionsCount > 1", () => {
  render(
    <RecipeSectionCard
      section={makeDraftSection()}
      onChange={vi.fn()}
      onRemove={vi.fn()}
      onCreateNewPaint={vi.fn()}
      sectionsCount={2}
    />
  );
  expect(screen.getByText("Workflow")).toBeInTheDocument();
});
```

**What tests must cover (RH-03):**
- `sectionsCount=1` + all metadata null → "Workflow" button absent from DOM
- `sectionsCount=2` + all metadata null → "Workflow" button present
- `sectionsCount=1` + `section_type="basecoat"` → "Workflow" button present
- `sectionsCount=1` + `applies_to="armor panels"` → "Workflow" button present
- Optional: verify SECTION_TYPES array has exactly 7 values matching the const in `src/types/recipeSection.ts`

---

### `src-tauri/src/lib.rs` — migration registration (verify-only)

**No code changes.** Verification only.

**Pattern to confirm** (lines 108–127, RESEARCH.md verified excerpt):
```rust
Migration {
    version: 18,
    description: "recipe_sections",
    sql: include_str!("../migrations/018_recipe_sections.sql"),
    kind: MigrationKind::Up,
},
Migration {
    version: 19,
    description: "rules_favorites_notes",
    sql: include_str!("../migrations/019_rules_favorites_notes.sql"),
    kind: MigrationKind::Up,
},
Migration {
    version: 20,
    description: "workflow_metadata",
    sql: include_str!("../migrations/020_workflow_metadata.sql"),
    kind: MigrationKind::Up,
},
```

**Verification commands:**
```
cargo check --manifest-path src-tauri/Cargo.toml
pnpm build
pnpm tauri dev  → PRAGMA table_info(recipe_sections) must show section_type, technique, execution_mode, applies_to
```

---

### `src/features/recipes/RecipeSectionCard.tsx` — progressive disclosure (verify-only)

**No code changes.** Logic already correct per RESEARCH.md.

**Pattern to confirm** (lines 39–43 and line 66):
```tsx
function hasAnyWorkflowMetadata(section: DraftSection): boolean {
  return Boolean(
    section.section_type || section.technique || section.execution_mode || section.applies_to,
  );
}

// line 66:
const showWorkflowCollapsible = sectionsCount > 1 || hasAnyWorkflowMetadata(section);
```

**JSX guard pattern** (line 157):
```tsx
{showWorkflowCollapsible && (
  <Collapsible open={workflowOpen} onOpenChange={setWorkflowOpen}>
    {/* workflow metadata fields */}
  </Collapsible>
)}
```

---

## Shared Patterns

### Pure-function test structure (no mocks, no QueryClient)
**Source:** `tests/dashboard/computeStats.test.ts`
**Apply to:** `tests/painting/computeWorkflowPosition.test.ts`
```typescript
// No vi.mock, no wrapper, no async — just import and call
import { describe, it, expect } from "vitest";
import { targetFn } from "@/lib/targetFn";

describe("behavior group", () => {
  it("returns X when given Y", () => {
    expect(targetFn(input)).toEqual(expectedOutput);
  });
});
```

### Component test with DnD mock
**Source:** `tests/dashboard/CurrentFocusCard.test.tsx` (vi.mock pattern for external hooks)
**Apply to:** `tests/painting/RecipeSectionCard.test.tsx`
```tsx
// Mock any hook that calls Tauri APIs or requires complex context
vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({ attributes: {}, listeners: {}, setNodeRef: vi.fn(),
    transform: null, transition: null, isDragging: false }),
}));
```

### Test runner commands
**Per-task check:**
```
pnpm test -- tests/painting/recipeSections.test.ts
```
**Per-wave merge check:**
```
pnpm test
```
Expected baseline: 1316 passing, 5 pre-existing failures in `tests/rules-hub/` and
`tests/datasheet/datasheetQueries.test.ts` — these are NOT regressions.

### Section name snapshot (LogSessionSheet)
**Source:** `src/features/dashboard/LogSessionSheet.tsx` lines 343–351
**Relevant to:** RH-02 verification — section_name is stored by value (name string), not by ID
```tsx
ctrl.onChange(
  v === "__none__"
    ? null
    : sections.find((s) => s.id === numId)?.name ?? null  // snapshot: name, not ID
);
```
After recipe save, `RECIPE_SECTIONS_KEY(recipeId)` is invalidated → LogSessionSheet re-fetches
current sections. Old sessions keep their historical name — this is correct behavior.

---

## No Analog Found

None. All deliverables have strong existing analogs in the codebase.

---

## Pre-existing Bug Fixes (Wave 0 prerequisite — D-11)

These must be committed BEFORE Phase 61 implementation tasks run. They are in uncommitted changes:

| Fix | File | Pattern |
|-----|------|---------|
| Migration 18/19/20 registration | `src-tauri/src/lib.rs` | Already applied — verify with cargo check |
| React error #185 infinite loop | `src/features/recipes/RecipeDetailSheet.tsx` | `stepsKey` string dependency instead of `steps` object; guard on `setStepPhotoUrls` |
| Faction resolution | `src/db/queries/datasheets.ts` | In uncommitted changes |

---

## Metadata

**Analog search scope:** `tests/dashboard/`, `tests/painting/`, `src/features/recipes/`, `src/lib/`
**Files scanned:** 7 source files read, 3 test files examined
**Pattern extraction date:** 2026-05-13
