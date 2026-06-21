import { z } from "zod";

// Re-export recipe enums — technique metadata reuses the same enums (Area 3 decision).
// DO NOT redefine these arrays — import and re-export from the canonical source.
export {
  RECIPE_EFFECTS,
  RECIPE_DIFFICULTIES,
  PAINTING_PHASES,
} from "@/features/recipes/recipeSchema";

export type { RecipeEffect, RecipeDifficulty } from "@/features/recipes/recipeSchema";

/**
 * Zod schema for the technique create/edit form.
 *
 * Covers only the 4 columns that migration 051 defines on the techniques table:
 * name, effect, difficulty, notes. Fields not backed by a DB column are NOT
 * included here — adding them would cause silent data loss on save.
 *
 * Slot validation (name non-empty, max 80 chars) and step validation
 * (step_name required, ≥1 step) are enforced in saveTechniqueGraph via toast,
 * NOT in this schema — consistent with the recipe authoring pattern.
 *
 * STRIDE T-142-01: name max 120, notes max 2000 applied here.
 */
export const techniqueSchema = z.object({
  name: z
    .string()
    .min(1, "Technique name is required.")
    .max(120, "Name must be 120 characters or fewer"),
  effect: z.string().nullable(),
  difficulty: z.string().nullable(),
  notes: z
    .string()
    .max(2000, "Notes must be 2000 characters or fewer")
    .nullable(),
});

export type TechniqueFormValues = z.infer<typeof techniqueSchema>;
