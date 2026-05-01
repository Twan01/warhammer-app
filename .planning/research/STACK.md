# Stack Research

**Domain:** Local-first Windows desktop CRUD app (Tauri + React + SQLite)
**Researched:** 2026-05-01 (v1.1 milestone update)
**Confidence:** HIGH (verified against actual codebase in package.json and src/db/queries/*)

---

## v1.1 Stack Decision: No New Dependencies Required

All three v1.1 features — Paint Inventory UI, Army List Builder, Unit Playbook — can be built entirely with packages already installed. The analysis below justifies each feature's requirements against the existing stack.

### Feature-by-Feature Dependency Analysis

| Feature | New Library Needed? | Existing Packages That Cover It |
|---------|--------------------|---------------------------------|
| Paint Inventory page | NO | `@tanstack/react-table`, `zustand`, `@tauri-apps/plugin-sql`, shadcn `Table/Badge/Select` |
| Army List Builder | NO | `react-hook-form`, `zod`, `@tanstack/react-table`, `@tanstack/react-query`, shadcn `Sheet/Dialog/Badge` |
| Unit Playbook (stats + notes) | NO | `react-hook-form`, `zod`, `@tanstack/react-query`, shadcn `Sheet/Form/Textarea/Input` |
| PDF/print export of army lists | NOT IN SCOPE | — (deferred to Phase 9 per REQUIREMENTS.md) |

---

## Confirmed Existing Stack (What v1.1 Builds On)

These are verified against `package.json` and `src/db/queries/*.ts`. The ORM recommendation in the original STACK.md (Drizzle proxy) was superseded — the actual codebase uses raw `@tauri-apps/plugin-sql` directly, which is the correct call for v1 per REQUIREMENTS.md Out of Scope.

### Core Technologies

| Technology | Installed Version | Purpose | v1.1 Role |
|------------|------------------|---------|------------|
| Tauri 2 | ^2.0.0 (cli/api) | Desktop shell | Unchanged — SQLite access via plugin-sql |
| React | ^19.0.0 | UI framework | Unchanged |
| TypeScript | ^5.6.3 | Type safety | New types needed: `ArmyList`, `ArmyListUnit`, `UnitStrategyNote` |
| @tauri-apps/plugin-sql | ^2.4.0 | Raw SQLite access | New query modules: `armyLists.ts`, `armyListUnits.ts`, `strategyNotes.ts` |
| Tailwind CSS | 4.2.4 | Utility styling | Unchanged |
| shadcn/ui | CLI v4 (components copied in) | UI primitives | All needed components already installed (Table, Sheet, Dialog, Badge, Progress, Select, Form, Textarea) |

### Supporting Libraries (All Already Installed)

| Library | Installed Version | v1.1 Usage |
|---------|------------------|------------|
| @tanstack/react-table | ^8.21.3 | Paint Inventory filterable table; Army List unit table |
| @tanstack/react-query | ^5.100.6 | Query hooks for all three features (`useArmyLists`, `useStrategyNote`, etc.) |
| @tanstack/react-router | ^1.168.26 | New routes: `/paints` (upgrade), `/army-lists`, `/playbook` |
| react-hook-form | ^7.74.0 | Forms: army list create/edit, strategy note editor, paint inventory quick-edit |
| zod | ^4.4.1 | Validation schemas for army list, strategy notes inputs |
| @hookform/resolvers | ^5.2.2 | Unchanged — zod resolver for react-hook-form |
| zustand | ^5.0.12 | Filter store for Paint Inventory (mirrors collection filter pattern) |
| lucide-react | ^0.460.0 | Icons for new pages (Shield, BookOpen, FlaskConical) |
| sonner | ^2.0.7 | Toast on mutation success/error — unchanged pattern |

---

## What Each Feature Needs From Existing Stack

### 1. Paint Inventory Page

The `paints` table and CRUD already exist. This feature promotes the existing basic table to a full-featured inventory view.

**New code required (no new packages):**
- `src/db/queries/paints.ts` — add `getPaintsByFilter(filter)` for running-low/wishlist boolean flags, and `getPaintsWithRecipeCount()` for back-link counts (JOIN query with `recipe_paints`)
- `src/hooks/usePaints.ts` — add filter-aware query hooks
- `src/features/paint-inventory/` — new feature folder with dedicated PaintInventoryPage, filter toolbar (running-low toggle, wishlist toggle, brand/type select), and "used in X recipes" badge per row
- Zustand filter store for paint inventory — same pattern as `src/stores/collectionFilters.ts`

**Why no new library:** `@tanstack/react-table` handles filtering/sorting/pagination. shadcn `Toggle` or `Tabs` handles the running-low/wishlist view switch. The "used in recipes" back-link is a SQLite JOIN that returns a count — no graph library needed.

**shadcn components already installed:** Table, Badge, Select, Input, Button, Skeleton — all confirmed in POLISH-06.

### 2. Army List Builder

The `army_lists` and `army_list_units` tables are already in the schema (`001_core_schema.sql` lines 102-123). Auto-calculated points and painted readiness % are pure arithmetic on query results.

**New code required (no new packages):**
- `src/db/queries/armyLists.ts` — CRUD for `army_lists` (create/read/update/delete)
- `src/db/queries/armyListUnits.ts` — add/remove units from a list, fetch list with unit details (JOIN to `units` table for name, points, painting_percentage)
- `src/hooks/useArmyLists.ts` — TanStack Query hooks
- `src/features/army-lists/` — ArmyListsPage (table of lists), ArmyListDetailSheet (list contents + calculated stats), ArmyListFormSheet (create/edit), UnitPicker (combobox-style picker from collection)
- Computed values: `totalPoints = sum(points_override ?? unit.points ?? 0)`, `paintedPoints = sum((painting_percentage === 100 ? points_override ?? unit.points ?? 0 : 0))`, `readiness = paintedPoints / totalPoints * 100` — all calculated in the hook or query layer, no library needed

**Why no PDF library:** PDF/print export is explicitly deferred to Phase 9 (BAK-01 through BAK-05). ARMY-01 through ARMY-06 in REQUIREMENTS.md contain no export requirement. Adding `@react-pdf/renderer` now would be premature. When export lands in Phase 9, `@react-pdf/renderer` (~860K weekly downloads, React-native API) is the correct choice over jsPDF for React-component-based layout.

**Why no drag-and-drop library:** Army list unit ordering is not specified in ARMY-01 through ARMY-06. If priority ordering is needed, use a simple `order_index` column + up/down buttons — same approach as recipe step ordering in `recipe_paints`. `@dnd-kit` is already installed if drag-reorder becomes needed.

### 3. Unit Playbook (Stats + Strategy Notes)

The `unit_strategy_notes` table is already in the schema (`001_core_schema.sql` lines 126-141) with all required fields: `battlefield_role`, `strengths`, `weaknesses`, `best_targets`, `synergies`, `mistakes_to_avoid`, `rules_references`, `notes`.

The M/T/Sv/W/Ld/OC stat fields are NOT in the current schema — they need a migration. These are simple INTEGER/TEXT columns on a new `unit_stats` table or added directly to `unit_strategy_notes` via a new migration.

**New code required (no new packages):**
- `src-tauri/migrations/004_unit_stats.sql` — add `move`, `toughness`, `save`, `wounds`, `leadership`, `objective_control`, `abilities`, `keywords` columns to `unit_strategy_notes` (or as an ALTER TABLE if SQLite supports it cleanly via plugin-sql)
- `src/db/queries/strategyNotes.ts` — CRUD for `unit_strategy_notes`
- `src/hooks/useStrategyNote.ts` — TanStack Query hooks (per-unit query)
- `src/features/unit-playbook/` — PlaybookPage (unit picker), UnitPlaybookSheet (stats grid + notes form integrated into UnitDetailSheet or standalone)
- Stats grid: a 6-cell display grid (M / T / Sv / W / Ld / OC) rendered with Tailwind grid classes — no specialized component library needed; shadcn `Input` with `type="number"` for each field in edit mode

**Schema note:** SQLite's `ALTER TABLE ... ADD COLUMN` is supported and works through tauri-plugin-sql. A new migration file (`004_unit_stats.sql`) is the correct approach — append-only, same pattern as existing migrations.

---

## The One Genuine Decision: Stats Schema Placement

The Unit Playbook needs somewhere to store M/T/Sv/W/Ld/OC. Two options:

| Option | Table | Migration | Recommended |
|--------|-------|-----------|-------------|
| Add columns to `unit_strategy_notes` | Existing table | `ALTER TABLE unit_strategy_notes ADD COLUMN move INTEGER` etc. | YES |
| New `unit_stats` table | New table | Full `CREATE TABLE unit_stats` | No — unnecessary join for a 1:1 relationship |

**Recommendation:** Add the stat columns and `abilities`/`keywords` text columns to `unit_strategy_notes` via `ALTER TABLE` in `004_unit_stats.sql`. The table is already 1:1 with units (one strategy notes row per unit). Keeping them together means a single query for the full playbook view.

SQLite `ALTER TABLE ... ADD COLUMN` limitation: columns added this way cannot have constraints other than `DEFAULT` and `NOT NULL` (only if a default is provided). For nullable integer stats this is fine — `ALTER TABLE unit_strategy_notes ADD COLUMN move INTEGER;` is valid SQLite.

---

## What NOT to Add for v1.1

| Library | Why Not Now | When to Add |
|---------|-------------|-------------|
| `@react-pdf/renderer` | PDF export deferred to Phase 9; no v1.1 requirement for export | Phase 9 (BAK-01 through BAK-05) |
| `jsPDF` | Same reason; `@react-pdf/renderer` is the better choice when export is needed due to React-native API | Phase 9 if needed |
| `react-to-print` | `window.print()` works in Tauri WebView per official Tauri docs, but print styling is complex and export is out of scope | Phase 9 only if PDF renderer is insufficient |
| `drizzle-orm` | Explicitly deferred in REQUIREMENTS.md Out of Scope: "raw typed query functions are correct for v1"; codebase confirms direct plugin-sql usage | Phase 9 or never — only if schema complexity outgrows hand-written queries |
| `@tauri-apps/plugin-fs` | Image upload deferred to Phase 8 (IMG-01 through IMG-05) | Phase 8 |
| Any charting library (recharts, etc.) | Army list readiness % is a single number + progress bar; shadcn `Progress` component covers it | Only if a full analytics dashboard is added in v1.2+ |

---

## Installation (v1.1 Additions)

```bash
# No new npm packages required for v1.1
# All features build on the existing installed stack
```

```sql
-- 004_unit_stats.sql (new migration for Unit Playbook stats)
ALTER TABLE unit_strategy_notes ADD COLUMN move INTEGER;
ALTER TABLE unit_strategy_notes ADD COLUMN toughness INTEGER;
ALTER TABLE unit_strategy_notes ADD COLUMN save INTEGER;
ALTER TABLE unit_strategy_notes ADD COLUMN wounds INTEGER;
ALTER TABLE unit_strategy_notes ADD COLUMN leadership INTEGER;
ALTER TABLE unit_strategy_notes ADD COLUMN objective_control INTEGER;
ALTER TABLE unit_strategy_notes ADD COLUMN abilities TEXT;
ALTER TABLE unit_strategy_notes ADD COLUMN keywords TEXT;
```

---

## Version Compatibility (No Changes)

The v1.1 features use no new packages. All existing version compatibility notes from v1.0 STACK.md remain valid. Key confirmed compatibilities:

| Package | Compatible With | Status |
|---------|-----------------|--------|
| @tauri-apps/plugin-sql ^2.4.0 | tauri-plugin-sql crate 2.x | Confirmed working in production |
| @tanstack/react-table ^8.21.3 | React 19 | Confirmed working (Collection page ships with it) |
| react-hook-form ^7.74.0 | zod ^4.4.1 via @hookform/resolvers | Confirmed working (Recipe and Paint forms ship with it) |
| zustand ^5.0.12 | React 19 | Confirmed working (collection filter store ships with it) |

---

## Sources

- `package.json` (actual installed versions) — HIGH confidence
- `src/db/queries/paints.ts`, `units.ts` — confirmed raw plugin-sql pattern, no ORM [HIGH confidence]
- `src-tauri/migrations/001_core_schema.sql` — confirmed `army_lists`, `army_list_units`, `unit_strategy_notes` tables already exist [HIGH confidence]
- `src/features/paints/PaintsPage.tsx` — confirmed existing paints page scope (no filters yet) [HIGH confidence]
- REQUIREMENTS.md Out of Scope — "Drizzle ORM at runtime — Adds proxy + migration runner complexity for no v1 win; raw typed query functions are correct for v1" [HIGH confidence]
- REQUIREMENTS.md v2 Requirements — ARMY-01 through ARMY-06, STRAT-01 through STRAT-03 — no export/print requirement [HIGH confidence]
- github.com/tauri-apps/tauri/issues/4917 and discussions/2591 — Tauri print/PDF limitations confirmed; `window.print()` works but silent PDF export requires third-party library [MEDIUM confidence]
- medium.com/codex — `@react-pdf/renderer` + Web Workers pattern for Tauri PDF generation [MEDIUM confidence — community guide]
- npmjs.com — `@react-pdf/renderer` 860K weekly downloads; `jsPDF` 2.6M weekly downloads [MEDIUM confidence]
- SQLite documentation — `ALTER TABLE ... ADD COLUMN` constraints confirmed [HIGH confidence]

---

*Stack research for: HobbyForge v1.1 — Paint Inventory UI, Army List Builder, Unit Playbook*
*Researched: 2026-05-01*
