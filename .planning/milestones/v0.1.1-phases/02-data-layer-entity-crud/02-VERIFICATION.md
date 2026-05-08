---
phase: 02-data-layer-entity-crud
verified: 2026-04-30T00:00:00Z
status: passed
score: 28/28 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Faction CRUD end-to-end (create/edit/delete) with FK error on delete"
    expected: "FK error toast appears when deleting a faction that has units"
    why_human: "Requires running pnpm tauri dev and interacting with the live app — already approved 2026-04-30"
  - test: "Unit persistence across app restart, painting_status dropdown order (UNIT-06)"
    expected: "Units survive restart; dropdown shows Not Started -> ... -> Completed in workflow order"
    why_human: "Requires live Tauri app — already approved 2026-04-30"
  - test: "Paint FK enforcement on delete (PAINT-02)"
    expected: "Deleting White Scar (used in recipe) shows 'Cannot delete paint — it's used in a recipe step.' toast"
    why_human: "Requires live Tauri app — already approved 2026-04-30"
  - test: "model_instances table is absent at runtime (DATA-04)"
    expected: "DevTools query for model_instances returns empty array"
    why_human: "Requires live Tauri app — already approved 2026-04-30"
---

# Phase 2: Data Layer + Entity CRUD Verification Report

**Phase Goal:** All 10 tables exist in a single migration, FK enforcement is verified, seed data is in place, and factions / units / paints are fully CRUD-able through a typed query + hook + UI stack
**Verified:** 2026-04-30
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can create, edit, and delete a faction — attempting to delete a faction with units shows an error (FK enforcement) | VERIFIED | `FactionDeleteDialog.tsx` catches `foreign key` in error message, fires `toast.error("Cannot delete faction — it still has units assigned.")`. Human-verified 2026-04-30 (all 8 criteria passed). |
| 2 | User can create a unit with all required fields (faction dropdown, category combobox with free-text, all status fields, points, notes) and the unit persists after an app restart | VERIFIED | `UnitSheet.tsx` (625 lines) has two-step layout with required + collapsible fields. All 16+ UNIT-01..03 fields present. Boolean coercion both directions (4 `? 1 : 0` calls). `useEffect` reset on unit change. Human-verified 2026-04-30 (all 14 criteria passed including restart persistence). |
| 3 | User can create and delete a paint; deleting a paint referenced by a recipe step is blocked with an error | VERIFIED | `PaintDeleteDialog.tsx` catches `foreign key`, fires `toast.error("Cannot delete paint — it's used in a recipe step.")`. 3 boolean coercions in `PaintSheet.tsx`. Human-verified 2026-04-30. |
| 4 | Seed data loads on first launch — four fictional factions appear in the factions list | VERIFIED | `002_seed_factions.sql` seeds Tau Empire, Ultramarines, Necrons, Tyranids with stable IDs 1-4 using `INSERT OR IGNORE`. `003_seed_data.sql` seeds 5 units, 6 paints, 3 recipes, 11 recipe_paints — all with `INSERT OR IGNORE` and stable IDs. Human-verified 2026-04-30. |
| 5 | The `model_instances` table does NOT exist in the schema; all other 10 tables do | VERIFIED | `grep -c "CREATE TABLE IF NOT EXISTS" 001_core_schema.sql` = 10. `grep -c "model_instances" 001_core_schema.sql` = 0. Human-verified at runtime via DevTools query returning `[]`. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Status | Evidence |
|----------|--------|----------|
| `src-tauri/migrations/001_core_schema.sql` | VERIFIED | Exists, 10 `CREATE TABLE IF NOT EXISTS` statements, no `model_instances`, starts with expected comment, FK constraints for factions RESTRICT, paints RESTRICT, recipe_paints CASCADE. |
| `src-tauri/migrations/002_seed_factions.sql` | VERIFIED | Exists, `INSERT OR IGNORE INTO factions` with all 4 factions (Tau Empire, Ultramarines, Necrons, Tyranids). |
| `src-tauri/migrations/003_seed_data.sql` | VERIFIED | Exists, contains `INSERT OR IGNORE INTO` for units (5), paints (6), painting_recipes (3), recipe_paints (11). |
| `src-tauri/src/lib.rs` | VERIFIED | Contains `include_str!("../migrations/001_core_schema.sql")`, `include_str!("../migrations/002_seed_factions.sql")`, `include_str!("../migrations/003_seed_data.sql")` as versions 1, 2, 3. |
| `README.md` | VERIFIED | Contains "Personal Use Disclaimer" (H2), "personal hobby-tracking tool", "Games Workshop", "%APPDATA%", "no redistribution". Size: 1441 bytes (>800 required). |
| `src/db/client.ts` | VERIFIED (pre-existing from Phase 1) | Exports `getDb()` singleton, runs `PRAGMA foreign_keys = ON` immediately after first load. |
| `src/types/faction.ts` | VERIFIED | Exports `Faction` interface, `CreateFactionInput`, `UpdateFactionInput`. |
| `src/types/unit.ts` | VERIFIED | Exports `PAINTING_STATUS_ORDER` in workflow order (Not Started → Built → Primed → Basecoated → Shaded → Layered → Highlighted → Details Done → Based → Varnished → Completed), `PaintingStatus` type, `Unit` interface with 4 `0 \| 1` boolean fields. |
| `src/types/paint.ts` | VERIFIED | Exports `Paint` interface with 3 `0 \| 1` boolean fields (owned, running_low, wishlist), `PAINT_TYPES` constant. |
| `src/types/recipe.ts` | VERIFIED | Exports `PaintingRecipe` interface. |
| `src/types/recipePaint.ts` | VERIFIED | Exports `RecipePaint` interface. |
| `src/types/index.ts` | VERIFIED | Barrel re-exports all entity types including `PAINTING_STATUS_ORDER` and `PAINT_TYPES`. |
| `src/db/queries/factions.ts` | VERIFIED | Imports `getDb` from `@/db/client`, no direct `@tauri-apps/plugin-sql` import. |
| `src/db/queries/units.ts` | VERIFIED | Imports `getDb`. |
| `src/db/queries/paints.ts` | VERIFIED | Imports `getDb`. |
| `src/db/queries/recipes.ts` | VERIFIED | Imports `getDb`. |
| `src/db/queries/recipePaints.ts` | VERIFIED | Imports `getDb`. |
| `src/hooks/useFactions.ts` | VERIFIED | Exports `FACTIONS_KEY`, `useFactions`, `useCreateFaction`, `useUpdateFaction`, `useDeleteFaction`. Uses `useMutation`, `useQueryClient`, `invalidateQueries`. |
| `src/hooks/useUnits.ts` | VERIFIED | Exports `UNITS_KEY`, unit CRUD hooks. All 3 mutations (create/update/delete) invalidate both `UNITS_KEY` and `["dashboard-stats"]` (DATA-09 forward compat). |
| `src/hooks/usePaints.ts` | VERIFIED | Exports `PAINTS_KEY`, paint CRUD hooks. |
| `src/hooks/useRecipes.ts` | VERIFIED | Exports `RECIPES_KEY`, recipe CRUD hooks. |
| `src/hooks/useRecipePaints.ts` | VERIFIED | Exports `RECIPE_PAINTS_KEY`, `useAddRecipePaint`, `useRemoveRecipePaint`. |
| `src/features/factions/FactionsPage.tsx` | VERIFIED | 147 lines (>60 required). Uses `useFactions`, `useUnits`, wires `UnitSheet` and `UnitDeleteDialog`. Key reset pattern: `key={editing?.id ?? "new"}` and `key={editingUnit?.id ?? \`new-${defaultFactionIdForCreate}\`}`. |
| `src/features/factions/FactionRow.tsx` | VERIFIED | Exports `FactionCard` with 4px `borderLeft` using `faction.color_theme` (FACT-05). Surfaces Add Unit / Edit Unit / Delete Unit per faction unit list. |
| `src/features/factions/FactionSheet.tsx` | VERIFIED | 223 lines (>80 required). Uses `useCreateFaction`, `useUpdateFaction`, `zodResolver(factionSchema)`, `type="color"` input, `rounded-full` preview swatch. |
| `src/features/factions/FactionDeleteDialog.tsx` | VERIFIED | Catches `foreign key` in error message (case-insensitive), fires correct FK toast. |
| `src/features/factions/FactionsEmptyState.tsx` | VERIFIED | Exists with correct copy. |
| `src/features/factions/factionSchema.ts` | VERIFIED | Exports `factionSchema` and `FactionFormValues`. |
| `src/app/factions/page.tsx` | VERIFIED | Thin wrapper importing from `@/features/factions/FactionsPage`. |
| `src/app/router.tsx` | VERIFIED | Contains `path: "/factions"`. |
| `src/components/common/AppSidebar.tsx` | VERIFIED | Contains `to: "/factions"` with label "Factions". |
| `src/components/common/AppLayout.tsx` | VERIFIED | Imports and renders `<Toaster richColors position="bottom-right" />`. |
| `src/features/units/unitSchema.ts` | VERIFIED | Imports `PAINTING_STATUS_ORDER`, uses `z.enum(PAINTING_STATUS_ORDER)`. |
| `src/features/units/CategoryCombobox.tsx` | VERIFIED | Contains "HQ/Leader" and all 10 suggestions, "Search or enter category..." placeholder, free-text via Enter key. |
| `src/features/units/UnitSheet.tsx` | VERIFIED | 625 lines (>200 required). Uses `useCreateUnit`, `useUpdateUnit`, `useFactions` (for dropdown population). 4 `? 1 : 0` boolean coercions. `useEffect` on unit change. "More details" toggle for collapsible. "New Unit"/"Edit Unit"/"Save Unit"/"Discard changes" copy verbatim. |
| `src/features/units/UnitDeleteDialog.tsx` | VERIFIED | Uses `useDeleteUnit`, has "Keep Unit" label. |
| `src/features/paints/paintSchema.ts` | VERIFIED | Uses `z.enum(PAINT_TYPES)`. |
| `src/features/paints/PaintsPage.tsx` | VERIFIED | Uses `usePaints`, `key={editing?.id ?? "new"}` key reset. |
| `src/features/paints/PaintRow.tsx` | VERIFIED | Has "Owned" and "Not owned" badge labels. |
| `src/features/paints/PaintSheet.tsx` | VERIFIED | 348 lines (>100 required). Uses `useCreatePaint`, `useUpdatePaint`, `useEffect` reset, 3 `? 1 : 0` boolean coercions. "New Paint"/"Edit Paint"/"Save Paint"/"Discard changes" copy verbatim. |
| `src/features/paints/PaintDeleteDialog.tsx` | VERIFIED | Catches `foreign key`, fires "Cannot delete paint — it's used in a recipe step." toast. |
| `src/features/paints/PaintsEmptyState.tsx` | VERIFIED | "No paints yet" / "Add paints to track your collection and link them to recipes." copy verbatim. |
| `src/features/paints/paintSchema.ts` | VERIFIED | Exists with `z.enum(PAINT_TYPES)`. |
| `src/app/paints/page.tsx` | VERIFIED | Replaced placeholder with thin wrapper rendering `PaintsPageContent`. No `PlaceholderPage` import. |

### Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| `src-tauri/src/lib.rs` | `001_core_schema.sql`, `002_seed_factions.sql`, `003_seed_data.sql` | `include_str!()` at compile time (versions 1, 2, 3) | WIRED | All 3 `include_str!` calls confirmed in lib.rs |
| `src/db/queries/*.ts` (all 5) | `src/db/client.ts getDb()` | `import { getDb } from "@/db/client"` | WIRED | All 5 query modules have this exact import; none import `@tauri-apps/plugin-sql` directly |
| `src/hooks/use*.ts` (all 5) | `src/db/queries/*.ts` | Import of typed query functions | WIRED | Confirmed by grep; hooks never touch `@tauri-apps/plugin-sql` |
| `src/features/factions/FactionsPage.tsx` | `src/hooks/useFactions.ts` | `useFactions()`, `useCreateFaction()`, `useUpdateFaction()`, `useDeleteFaction()` | WIRED | All 4 hooks imported and invoked |
| `src/features/factions/FactionDeleteDialog.tsx` | `sonner toast.error` | FK error message detection via `message.includes("foreign key")` | WIRED | Pattern confirmed |
| `src/features/units/UnitSheet.tsx` | `src/hooks/useUnits.ts` + `src/hooks/useFactions.ts` | `useCreateUnit`, `useUpdateUnit`, `useFactions` (faction dropdown population) | WIRED | All confirmed |
| `src/features/paints/PaintsPage.tsx` | `src/hooks/usePaints.ts` | `usePaints`, `useCreatePaint`, `useUpdatePaint`, `useDeletePaint` | WIRED | All confirmed |
| `src/features/paints/PaintDeleteDialog.tsx` | `sonner toast.error` | FK error message detection via `message.includes("foreign key")` | WIRED | Pattern confirmed |
| `src/app/router.tsx` | `src/app/factions/page.tsx` | `createRoute({ path: "/factions", component: FactionsPage })` | WIRED | `path: "/factions"` confirmed in router |
| `src/components/common/AppSidebar.tsx` | `/factions` | `MAIN_NAV` entry with `to: "/factions"` | WIRED | Confirmed |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DATA-01 | 02-02 (pre-existing Phase 1) | `getDb()` singleton calling `Database.load('sqlite:hobbyforge.db')` | SATISFIED | `src/db/client.ts` exports `getDb()` with singleton pattern |
| DATA-02 | 02-02 (pre-existing Phase 1) | `getDb()` runs `PRAGMA foreign_keys = ON` immediately | SATISFIED | `src/db/client.ts` line: `await _db.execute("PRAGMA foreign_keys = ON")` |
| DATA-03 | 02-01 | All 10 tables in single migration `001_core_schema.sql` | SATISFIED | 10 `CREATE TABLE IF NOT EXISTS` statements confirmed |
| DATA-04 | 02-01 | `model_instances` table NOT created | SATISFIED | Zero occurrences of `model_instances` in migration; human-verified at runtime |
| DATA-05 | 02-01 | Migrations append-only, numbered, managed by tauri-plugin-sql | SATISFIED | Versions 1, 2, 3 in lib.rs via `include_str!()`; files in `src-tauri/migrations/` |
| DATA-06 | 02-02 | TypeScript types for every entity in `src/types/` synced with SQL schema | SATISFIED | 5 entity type files + barrel index, `0 \| 1` boolean typing, no `boolean` or `Date` types |
| DATA-07 | 02-02 | Each entity has query module under `src/db/queries/` | SATISFIED | 5 query modules (factions, units, paints, recipes, recipePaints), all importing `getDb` |
| DATA-08 | 02-02 | Each entity has TanStack Query hooks module under `src/hooks/` | SATISFIED | 5 hook modules with exported query key constants and mutation hooks |
| DATA-09 | 02-02 | Mutations invalidate the right query keys; unit mutations also invalidate `["dashboard-stats"]` | SATISFIED | `useUnits.ts` has 3 `qc.invalidateQueries({ queryKey: ["dashboard-stats"] })` calls (create/update/delete) |
| FACT-01 | 02-03 | User can create a faction with name, game_system, description, color_theme, icon_path | SATISFIED | `FactionSheet.tsx` form with all fields, zod validation, hook wired |
| FACT-02 | 02-03 | User can edit any faction field | SATISFIED | Edit mode in `FactionSheet.tsx` pre-fills from `faction` prop, `useUpdateFaction` called on submit |
| FACT-03 | 02-03 | User can delete faction; FK blocks if units assigned | SATISFIED | `FactionDeleteDialog.tsx` catches FK error, shows specific toast; human-verified |
| FACT-04 | 02-03 | User can list all factions | SATISFIED | `FactionsPage.tsx` calls `useFactions()` and renders faction cards |
| FACT-05 | 02-03 | Faction `color_theme` applied as visible accent for units and recipes | SATISFIED | `FactionCard` applies `borderLeft: 4px solid faction.color_theme` to the entire faction card (which contains units). Requirement text: "sidebar badge, card border, or similar" — card border is the chosen implementation. |
| UNIT-01 | 02-04 | User can create unit with faction (required), name, category (combobox with 10 suggestions + free-text) and other fields | SATISFIED | `UnitSheet.tsx` with `CategoryCombobox` (10 suggestions, free-text via Enter), faction `Select` populated from `useFactions()` |
| UNIT-02 | 02-04 | Unit status fields (status_assembly, status_painting enum in order, painting_percentage, etc.) | SATISFIED | All status fields in `UnitSheet.tsx` collapsible section; `PAINTING_STATUS_ORDER` used for Select options |
| UNIT-03 | 02-04 | Unit stores purchase_date, purchase_price, storage_location, main_image_path, notes | SATISFIED | All optional fields in `UnitSheet.tsx` "More details" collapsible section |
| UNIT-04 | 02-04 | User can edit any unit field | SATISFIED | Edit mode in `UnitSheet.tsx`, `useUpdateUnit` called on submit; human-verified |
| UNIT-05 | 02-04 | User can delete a unit with confirmation modal | SATISFIED | `UnitDeleteDialog.tsx` with "Delete unit?" / "Keep Unit" / "Delete"; human-verified |
| UNIT-06 | 02-02 | `PAINTING_STATUS_ORDER` constant in `src/types/` drives ordering | SATISFIED | Exported from `src/types/unit.ts` in correct workflow order (Not Started → Completed, not alphabetical); imported by `unitSchema.ts` |
| PAINT-01 | 02-04 | User can create a paint with all required fields | SATISFIED | `PaintSheet.tsx` with brand, name, paint_type (Select from PAINT_TYPES), color_family, hex_color, owned/running_low/wishlist (checkboxes), quantity, notes |
| PAINT-02 | 02-04 | User can edit and delete paints; FK from recipe_paints blocks delete | SATISFIED | `PaintDeleteDialog.tsx` catches FK error, fires "Cannot delete paint — it's used in a recipe step."; human-verified |
| SEED-01 | 02-02 | Seed factions: Tau Empire, Ultramarines, Necrons, Tyranids | SATISFIED | `002_seed_factions.sql` has all 4 with stable IDs 1-4 |
| SEED-02 | 02-02 | Seed units: Tau Fire Warriors, Crisis Battlesuits, Commander in Battlesuit, Necron Warriors, Intercessors | SATISFIED | `003_seed_data.sql` has all 5 units with correct faction IDs, categories, model_count, points |
| SEED-03 | 02-02 | Seed paints: Abaddon Black, White Scar, Nuln Oil, Leadbelcher, Macragge Blue, Retributor Armour | SATISFIED | `003_seed_data.sql` has all 6 Citadel paints with hex colors |
| SEED-04 | 02-02 | Seed recipes: Tau White Armor, Ultramarines Blue Armor, Necron Ancient Metal with paint linkages | SATISFIED | `003_seed_data.sql` has all 3 recipes and 11 recipe_paint links |
| SEED-05 | 02-02 | Seed uses `INSERT OR IGNORE` with stable IDs for idempotency | SATISFIED | All 4 seed INSERT statements use `INSERT OR IGNORE INTO ... (id, ...)` with explicit integer IDs |
| SEED-06 | 02-01 | README contains personal-use, no-redistribution disclaimer for GW-named data | SATISFIED | README.md has "Personal Use Disclaimer" H2, "personal hobby-tracking tool", "Games Workshop", "%APPDATA%", no-redistribution language; 1441 bytes |

**All 28 requirements SATISFIED.**

### Anti-Patterns Found

None blocking. No `TODO`/`FIXME`/`PLACEHOLDER` comments found in feature files. No `console.log`-only implementations. No empty `return null` stubs. No direct `@tauri-apps/plugin-sql` imports in features or hooks. No direct `@/db/queries` imports in features. The one false positive from the grep scan (line 596 of UnitSheet.tsx) was the Tailwind `placeholder:text-muted-foreground` CSS class in a textarea definition — not an anti-pattern.

### Human Verification Required

The following items were verified by the human developer on 2026-04-30 and are documented in the SUMMARY files:

1. **Faction CRUD with FK enforcement** (02-03 SUMMARY — all 8 criteria approved)
   - Test: Create, edit, delete faction; attempt to delete Tau Empire (has seeded units)
   - Expected: FK error toast "Cannot delete faction — it still has units assigned."
   - Result: APPROVED 2026-04-30

2. **Unit persistence and PAINTING_STATUS_ORDER dropdown order** (02-04 SUMMARY — all 14 criteria approved)
   - Test: Create unit, restart app, verify it persists; verify painting_status dropdown shows workflow order
   - Expected: Unit persists across restart; dropdown: Not Started → Built → ... → Completed (not alphabetical)
   - Result: APPROVED 2026-04-30

3. **Paint FK enforcement** (02-04 SUMMARY)
   - Test: Delete White Scar (referenced by recipe_paints seed data)
   - Expected: "Cannot delete paint — it's used in a recipe step." toast; paint remains
   - Result: APPROVED 2026-04-30

4. **model_instances table absent at runtime** (02-04 SUMMARY)
   - Test: DevTools `SELECT name FROM sqlite_master WHERE type='table' AND name='model_instances'`
   - Expected: `[]`
   - Result: APPROVED 2026-04-30

### Gaps Summary

No gaps. All 28 requirements are satisfied and all 5 Phase 2 success criteria (ROADMAP) are achieved.

The phase goal — "All 10 tables exist in a single migration, FK enforcement is verified, seed data is in place, and factions / units / paints are fully CRUD-able through a typed query + hook + UI stack" — is fully realized:

- 10-table schema: DONE (`001_core_schema.sql`, verified statically and at runtime)
- FK enforcement: DONE (PRAGMA in client.ts, RESTRICT/CASCADE in schema, FK error handling in both FactionDeleteDialog and PaintDeleteDialog)
- Seed data: DONE (4 factions, 5 units, 6 paints, 3 recipes, 11 recipe_paints — all `INSERT OR IGNORE` idempotent)
- Typed query + hook + UI stack for factions/units/paints: DONE (5 query modules → 5 hook modules → 3 feature directories with full CRUD UI, all TypeScript-type-safe with 0|1 boolean discipline)

---
_Verified: 2026-04-30_
_Verifier: Claude (gsd-verifier)_
