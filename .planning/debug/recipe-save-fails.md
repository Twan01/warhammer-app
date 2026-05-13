---
status: resolved
trigger: "Creating a recipe and saving it shows 'failed to save, changes were not saved' toast"
created: 2026-05-12T00:00:00Z
updated: 2026-05-12T00:00:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: Migrations 018, 019, 020 were never registered in lib.rs get_migrations()
test: Check if recipe_sections table exists at runtime
expecting: Table missing — SQL errors caught silently by RecipeFormSheet catch block
next_action: fix applied — registered missing migrations in lib.rs

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: Recipe saves successfully with a success toast notification
actual: Toast shows "failed to save, changes were not saved" — recipe is not persisted
errors: Only the toast notification, no dev console errors reported
reproduction: Create any recipe (with or without steps), try to save — always fails
timeline: Used to work, recently broke

## Evidence
<!-- APPEND only -->

- timestamp: 2026-05-12 — RecipeFormSheet.tsx line 322-323: catch block shows toast "Failed to save recipe. Changes were not saved." — confirms error thrown inside onSubmit
- timestamp: 2026-05-12 — lib.rs get_migrations() ends at version 17 (unit_overrides). Migrations 018 (recipe_sections), 019 (rules_favorites_notes), 020 (workflow_metadata) exist as .sql files but are NOT registered in the Rust migration list
- timestamp: 2026-05-12 — Migration 018 creates recipe_sections table and adds section_id column to recipe_steps. Without it: (1) INSERT INTO recipe_sections fails with "no such table", (2) INSERT INTO recipe_steps with section_id column fails with "no such column"
- timestamp: 2026-05-12 — RecipeFormSheet onSubmit always calls createRecipeSection() (even for minimal recipe with no steps), which hits the missing table immediately after createRecipe succeeds
- timestamp: 2026-05-12 — TypeScript compiles clean (tsc --noEmit passes), all 1320 tests pass — bug is purely a runtime SQL schema mismatch

## Eliminated
<!-- APPEND only - prevents re-investigating -->

- Zod validation: form validation passes (onSubmit is reached, confirmed by toast from catch block)
- createRecipe query: 21 columns, 21 params — matches painting_recipes schema exactly
- addRecipePaint query: 13 columns, 13 params — correct
- React Query hook wiring: mutations correctly delegate to query functions
- Cargo.lock dependency change: only version bump + sqlx addition, no plugin-sql version change

## Resolution
<!-- Populated when fixed -->

root_cause: Migrations 018 (recipe_sections table + section_id column), 019 (rules_favorites_notes), and 020 (workflow_metadata columns) were created as .sql files but never registered in src-tauri/src/lib.rs get_migrations(). The Tauri plugin-sql migration runner only executes registered migrations, so the recipe_sections table was never created and recipe_steps.section_id column was never added. Every recipe save calls createRecipeSection() which fails with "no such table: recipe_sections", caught by the generic catch block that shows the toast.
fix: Added Migration entries for versions 18, 19, and 20 to get_migrations() in lib.rs, matching the existing pattern. On next app start, tauri-plugin-sql will auto-run the three pending migrations.
verification: cargo check passes. Next pnpm tauri dev will apply migrations and recipe save should succeed.
files_changed: src-tauri/src/lib.rs
