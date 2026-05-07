# Stack Research

**Domain:** Local-first Windows desktop — HobbyForge v2.5 Recipes 2.0 / Painting Studio
**Researched:** 2026-05-06
**Confidence:** HIGH — verified against package.json, existing source files, and migration history

---

## Executive Decision: 0 New npm Packages, 0 New Rust Crates

Every v2.5 feature is solved by the existing stack. Structured recipe steps with
photos, metadata enums, paint availability computation, recipe duplication, and the
studio card/timeline UX all use tools already installed and battle-tested across 36
prior phases.

---

## Feature-by-Feature Dependency Analysis

| Feature | New Package Needed? | Justification |
|---------|---------------------|---------------|
| Reorderable step list (drag-and-drop) | NO | `@dnd-kit/core` 6.3.1 + `@dnd-kit/sortable` 10.0.0 already installed and wired in `RecipeStepList.tsx` + `RecipeStepRow.tsx`. Extending from 3 fields to 6-7 fields per step requires no API changes. |
| Step photo per step | NO | Proven pattern from `JournalTab.tsx`: `open()` (plugin-dialog) → `readFile`/`writeFile` (plugin-fs) → UUID filename → `convertFileSrc(join(appDir, file_path))` → `<img src>`. Apply identically for `recipe_steps.photo_path`. |
| Recipe metadata enums (style/surface/effect/difficulty) | NO | `as const` arrays + inferred union types (e.g. `PAINTING_STATUS_ORDER` pattern). Rendered as shadcn `<Select>`. No external enum library. |
| Paint availability computation (owned/missing/running-low per recipe) | NO | Pure SQL join: `LEFT JOIN paints ON recipe_steps.paint_id = paints.id`, aggregate `SUM(CASE WHEN owned=1 THEN 1 ELSE 0 END)` etc. Same COALESCE-in-SQL approach used for `effective_points`. |
| Recipe duplication | NO | Two-step SQL: `INSERT INTO painting_recipes SELECT ... WHERE id = $1` captures `lastInsertId`, then `INSERT INTO recipe_steps SELECT ..., $newId WHERE recipe_id = $1`. Runs in a single transaction via `tauri-plugin-sql`. |
| Studio card view | NO | shadcn `<Card>` grid with `columns-2 md:columns-3` (CSS columns, same as existing gallery). No masonry library needed. |
| Studio timeline view | NO | Vertical list of step cards — pure Tailwind with `border-l` connector line. Same pattern used for `painting_sessions` in `JournalTab`. No timeline library needed. |
| Filters (surface/style/difficulty/missing-paints) | NO | Zustand store (same pattern as `useCollectionFilters`). Pure `applyRecipeFilters` function over the loaded list. |
| Step content fields (tool, dilution, technique, duration) | NO | Additional `<Input>` / `<Select>` / `<Textarea>` fields in `RecipeStepRow`. All shadcn primitives already installed. |
| Paint substitutions per step | NO | `recipe_paint_substitutions` join table + a new Combobox field in `RecipeStepRow` mirroring the existing `PaintCombobox`. |
| Recipe-to-session linking | NO | Two-column `ALTER TABLE` on `painting_sessions` (`recipe_id`, `recipe_step_id`). FK references + a `<Select>` in `LogSessionSheet`. |
| useFieldArray for controlled step list | NO | Current `RecipeStepList` uses a local `DraftStep[]` state array managed manually. This works fine and avoids the bridging complexity of `useFieldArray` + `useSortable` (documented as tricky in the community). Keep the existing pattern. |
| Estimated minutes / result photo on recipe header | NO | `ALTER TABLE painting_recipes ADD COLUMN` (×2). Form field additions only. |

---

## Confirmed Existing Stack — All v2.5 Capabilities Covered

| Technology | Installed Version | v2.5 Role |
|------------|------------------|-----------|
| `@dnd-kit/core` | 6.3.1 | DndContext + sensors for step reordering — already wired |
| `@dnd-kit/sortable` | 10.0.0 | `useSortable`, `SortableContext`, `arrayMove` — already wired |
| `@dnd-kit/utilities` | 3.2.2 | `CSS.Transform.toString` — already wired |
| `@tauri-apps/plugin-fs` | ^2.5.1 | `readFile`, `writeFile`, `BaseDirectory.AppData` for step photos |
| `@tauri-apps/plugin-dialog` | ^2.7.1 | `open()` for photo file picker — already used in JournalTab |
| `@tauri-apps/api` | ^2.0.0 | `appDataDir`, `join`, `convertFileSrc` — proven pattern in `useUnitPhotos` |
| `@tauri-apps/plugin-sql` | ^2.4.0 | Recipe duplication transaction, availability JOIN, step CRUD |
| `@tanstack/react-query` | ^5.100.6 | New query keys: `recipe-steps`, `recipe-availability`, cache invalidation |
| `react-hook-form` | ^7.74.0 | Recipe header form (metadata fields). Steps stay as uncontrolled `DraftStep[]`. |
| `zod` | ^4.4.1 | Extended `recipeSchema` with style/surface/effect/difficulty fields |
| `zustand` | ^5.0.12 | `useRecipeStudioFilters` store (mirrors `useCollectionFilters`) |
| `shadcn/ui` | CLI v4 | `<Select>` for enums, `<Card>` for studio view, `<Badge>` for availability, `<Textarea>` for technique notes |
| Tailwind CSS v4 | 4.2.4 | `columns-2 md:columns-3` for studio card grid, `border-l` timeline connector |
| `lucide-react` | ^0.460.0 | Step icons (tool, timer, camera, etc.) |
| `sonner` | ^2.0.7 | Toast on duplicate, save, step photo upload |

---

## Key Integration Patterns (Existing, Reuse Directly)

### Step Photo Upload (same as JournalTab)

```tsx
// Proven in src/features/units/JournalTab.tsx
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { appDataDir, join } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/core";

async function pickStepPhoto(stepLocalId: string) {
  const selected = await openDialog({ filters: [{ name: "Images", extensions: ["png","jpg","jpeg","webp"] }] });
  if (!selected || typeof selected !== "string") return;
  const bytes = await readFile(selected);
  const uuid = crypto.randomUUID();
  const filename = `${uuid}.${selected.split(".").pop()}`;
  await writeFile(filename, bytes, { baseDir: BaseDirectory.AppData });
  // Store filename in DraftStep.photo_path — not the absolute path
  updateStep(stepLocalId, { photo_path: filename });
}

// Resolve for display
const appDir = await appDataDir();
const absolute = await join(appDir, step.photo_path);
const assetUrl = convertFileSrc(absolute);
```

**Critical:** Store only the UUID filename in `recipe_steps.photo_path`, never an
absolute path. `convertFileSrc(join(appDir, filename))` resolves it at display time.
This is exactly what `image_assets.file_path` does.

### Paint Availability (SQL aggregation, no library)

```sql
-- Computes owned/missing/running-low counts for a single recipe
-- Run per-recipe on demand; cache under ["recipe-availability", recipeId]
SELECT
  COUNT(DISTINCT rs.id)                                          AS total_steps,
  SUM(CASE WHEN p.owned = 1 THEN 1 ELSE 0 END)                 AS owned_count,
  SUM(CASE WHEN p.owned = 0 OR p.id IS NULL THEN 1 ELSE 0 END) AS missing_count,
  SUM(CASE WHEN p.running_low = 1 AND p.owned = 1 THEN 1 ELSE 0 END) AS low_count
FROM recipe_steps rs
LEFT JOIN paints p ON rs.paint_id = p.id
WHERE rs.recipe_id = $1
```

No library. Pure SQL aggregation. Same COALESCE/SUM pattern as `effective_points`
in army lists.

### Recipe Duplication (two-step INSERT SELECT)

```typescript
// In src/db/queries/recipes.ts
export async function duplicateRecipe(sourceId: number): Promise<number> {
  const db = await getDb();
  // Step 1: clone the recipe header
  const result = await db.execute(
    `INSERT INTO painting_recipes (name, faction_id, unit_id, area, style, surface,
       effect, difficulty, estimated_minutes, notes, tutorial_link)
     SELECT name || ' (Copy)', faction_id, unit_id, area, style, surface,
       effect, difficulty, estimated_minutes, notes, tutorial_link
     FROM painting_recipes WHERE id = $1`,
    [sourceId]
  );
  const newId = result.lastInsertId!;
  // Step 2: clone all steps (photo_path refs shared — same files, no copy needed)
  await db.execute(
    `INSERT INTO recipe_steps (recipe_id, order_index, title, phase, paint_id,
       tool, dilution, technique, duration_minutes, notes, photo_path)
     SELECT $2, order_index, title, phase, paint_id,
       tool, dilution, technique, duration_minutes, notes, photo_path
     FROM recipe_steps WHERE recipe_id = $1`,
    [sourceId, newId]
  );
  return newId;
}
```

Photo files are shared between original and duplicate (same `photo_path` UUID).
Only delete a photo file when ALL steps referencing it are deleted — requires a
reference check before `fs.remove()`.

### Studio Card Grid (CSS columns, no library)

```tsx
// Same Tailwind columns approach used for collection gallery
<div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
  {recipes.map(recipe => (
    <RecipeStudioCard key={recipe.id} recipe={recipe} className="break-inside-avoid mb-4" />
  ))}
</div>
```

Variable-height cards (step count varies) make CSS columns the right choice over
CSS grid rows. `break-inside-avoid` prevents cards from splitting across columns.

### Studio Timeline View (CSS `border-l`, no library)

```tsx
// Vertical step list — pure Tailwind connector line
<div className="relative pl-6">
  <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
  {steps.map((step, i) => (
    <div key={step.id} className="relative mb-4">
      <div className="absolute -left-4 w-3 h-3 rounded-full bg-muted-foreground border-2 border-background" />
      <StepCard step={step} index={i} />
    </div>
  ))}
</div>
```

This is the same vertical connector pattern used in the painting session timeline
in `JournalTab`. No timeline library adds value here.

---

## Schema Requirements (SQL Only — No New npm/Cargo)

Migration `012_recipes_studio.sql` covers all new schema. No new libraries required.

```sql
-- New tables
CREATE TABLE IF NOT EXISTS recipe_steps (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id        INTEGER NOT NULL REFERENCES painting_recipes(id) ON DELETE CASCADE,
  order_index      INTEGER NOT NULL DEFAULT 0,
  title            TEXT    NOT NULL DEFAULT '',
  phase            TEXT,          -- Primer / Base / Shade / Layer / Highlight / etc.
  paint_id         INTEGER REFERENCES paints(id) ON DELETE SET NULL,
  tool             TEXT,          -- Brush size/type
  dilution         TEXT,          -- e.g. "1:1 with medium"
  technique        TEXT,          -- e.g. "stipple, feather out"
  duration_minutes INTEGER,
  notes            TEXT,
  photo_path       TEXT,          -- UUID filename only, resolved via appDataDir()
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recipe_paint_substitutions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_step_id  INTEGER NOT NULL REFERENCES recipe_steps(id) ON DELETE CASCADE,
  original_paint_id    INTEGER REFERENCES paints(id) ON DELETE SET NULL,
  substitute_paint_id  INTEGER REFERENCES paints(id) ON DELETE SET NULL,
  notes           TEXT
);

-- painting_recipes gets metadata columns
ALTER TABLE painting_recipes ADD COLUMN style            TEXT;  -- NMM / TMM / Contrast / OSL / etc.
ALTER TABLE painting_recipes ADD COLUMN surface          TEXT;  -- Power Armour / Skin / Cloth / etc.
ALTER TABLE painting_recipes ADD COLUMN effect           TEXT;  -- Battle-Worn / Clean / Gritty / etc.
ALTER TABLE painting_recipes ADD COLUMN difficulty       TEXT;  -- Beginner / Intermediate / Advanced
ALTER TABLE painting_recipes ADD COLUMN estimated_minutes INTEGER;
ALTER TABLE painting_recipes ADD COLUMN result_photo_path TEXT; -- UUID filename for finished result

-- painting_sessions links to recipe context
ALTER TABLE painting_sessions ADD COLUMN recipe_id      INTEGER REFERENCES painting_recipes(id) ON DELETE SET NULL;
ALTER TABLE painting_sessions ADD COLUMN recipe_step_id INTEGER REFERENCES recipe_steps(id) ON DELETE SET NULL;
```

**Data migration:** Existing `recipe_paints` rows can be preserved as-is (they
reference the old flat schema). New recipe steps live in `recipe_steps`. The
`recipe_paints` table becomes legacy storage for recipes created before v2.5;
query logic reads from `recipe_steps` preferentially.

---

## Alternatives Considered

| Our Approach | Alternative | Why We Rejected It |
|--------------|-------------|-------------------|
| Manual `DraftStep[]` state + dnd-kit | `useFieldArray` + dnd-kit | `useFieldArray` generates its own `id` field that conflicts with `useSortable`'s `id` requirement. Known integration complexity (React Hook Form discussions #10607). The existing manual pattern already works in production. |
| CSS columns for studio card grid | `react-masonry-css` / `masonry-layout` | External library for a card grid the CSS `columns` property handles natively. Zero value added. |
| CSS `border-l` timeline | `react-chrono` / `react-vertical-timeline-component` | Heavy libraries for a simple vertical list. No interactivity needed beyond expand/collapse, which shadcn `<Collapsible>` handles. |
| SQL JOIN for availability | React-side computation | DB-side aggregation is one round-trip vs. loading all steps + all paints into JS and computing there. Stays consistent with the COALESCE-in-SQL principle established in army lists. |
| Shared `photo_path` on duplication | Copy photo files on duplicate | File copy requires Tauri FS read+write per step, is slow, and creates orphaned files if the new recipe is deleted before the copy completes. Sharing refs is simpler; cleanup only needed when all referencing steps are deleted. |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `react-beautiful-dnd` | Deprecated in 2023, no React 19 support. `@dnd-kit` is already installed and proven in the Kanban board and recipe steps. | `@dnd-kit/sortable` (already installed) |
| `react-chrono` / `react-vertical-timeline-component` | Opinionated styling conflicts with zinc dark theme. Overkill for a static ordered step list. | CSS `border-l` connector + `<div>` steps |
| `react-masonry-css` / `masonry-layout` | CSS `columns-*` handles variable-height recipe cards without JS layout recalculation. | Tailwind `columns-2 md:columns-3` |
| `useFieldArray` from react-hook-form for steps | The dnd-kit + useFieldArray integration requires workarounds (custom `id` → `key` bridging, move vs arrayMove coordination). The existing manual `DraftStep[]` pattern already works. | Existing `useState<DraftStep[]>` in `RecipeStepList` |
| Any ORM / query builder | `tauri-plugin-sql` with raw typed queries handles all new JOIN patterns. The `duplicateRecipe` two-step INSERT SELECT pattern does not require ORM support. | Raw typed query functions in `src/db/queries/` |
| `sharp` / image processing library | Step photos are display-only local files. No resizing pipeline needed — `<img loading="lazy">` with `onError` fallback is sufficient, same as unit gallery. | Native `<img>` |
| `framer-motion` | Step expand/collapse, card hover effects, and timeline transitions are all covered by `tw-animate-css` + Tailwind `transition-*`. | Tailwind `transition-all duration-200` |

---

## Version Compatibility — No Changes

No new packages means no new compatibility surface. All existing packages stay at
their current locked versions.

| Package | Version | v2.5 Usage | Compatibility |
|---------|---------|------------|---------------|
| `@dnd-kit/core` | 6.3.1 | Extended step fields — same API surface | Confirmed: already in production for recipe steps and Kanban |
| `@dnd-kit/sortable` | 10.0.0 | `arrayMove`, `useSortable` — same call signatures | Confirmed: no breaking changes to existing usage |
| `@tauri-apps/plugin-fs` | ^2.5.1 | `writeFile` to `BaseDirectory.AppData` — same as JournalTab | Confirmed: proven for unit photos across v2.1+ |
| `@tauri-apps/plugin-sql` | ^2.4.0 | `INSERT ... SELECT` duplication, JOIN availability queries | Confirmed: `lastInsertId` available on INSERT result |
| `zod` | ^4.4.1 | New enum fields on `recipeSchema` | No change to Zod API |
| `react-hook-form` | ^7.74.0 | Recipe header form only; steps remain uncontrolled | No change to RHF API |

---

## Sources

- `package.json` (project root) — confirmed all installed versions [HIGH confidence]
- `src/features/recipes/RecipeStepList.tsx` — confirmed `@dnd-kit` integration pattern already wired [HIGH confidence]
- `src/features/recipes/RecipeStepRow.tsx` — confirmed `useSortable` + field structure of `DraftStep` [HIGH confidence]
- `src/features/units/JournalTab.tsx` — confirmed `plugin-dialog` + `plugin-fs` + `convertFileSrc` photo upload pattern [HIGH confidence]
- `src/hooks/useUnitPhotos.ts` — confirmed `appDataDir` + `join` + `convertFileSrc` URL resolution pattern [HIGH confidence]
- `src/db/queries/recipes.ts` — confirmed `lastInsertId` is available; INSERT SELECT pattern is valid for `tauri-plugin-sql` [HIGH confidence]
- `.planning/V3_ARCHITECTURE_AUDIT.md` §4 — confirmed recipe schema gap analysis: 7 ALTER + 3 CREATE TABLE for migration 012 [HIGH confidence]
- [dnd-kit npm: @dnd-kit/core](https://www.npmjs.com/package/@dnd-kit/core) — 6.3.1 latest stable, last published ~December 2024 [HIGH confidence]
- [dnd-kit npm: @dnd-kit/sortable](https://www.npmjs.com/package/@dnd-kit/sortable) — 10.0.0 latest stable [HIGH confidence]
- [React Hook Form discussion #10607](https://github.com/orgs/react-hook-form/discussions/10607) — `useFieldArray` + `useSortable` integration has known ID-collision complexity; manual state pattern is the pragmatic alternative [MEDIUM confidence]
- [Tauri v2 file system docs](https://v2.tauri.app/plugin/file-system/) — `BaseDirectory.AppData`, `writeFile`, `readFile` API confirmed [HIGH confidence]

---

*Stack research for: HobbyForge v2.5 — Recipes 2.0 / Painting Studio*
*Researched: 2026-05-06*
