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
 * Mirrors recipeSchema with recipe-specific fields removed and a description
 * field added (short summary, max 500 chars).
 *
 * Slot validation (name non-empty, max 80 chars) and step validation
 * (step_name required, ≥1 step) are enforced in saveTechniqueGraph via toast,
 * NOT in this schema — consistent with the recipe authoring pattern.
 *
 * STRIDE T-142-01: name max 120, description max 500, notes max 2000 applied here.
 */
export const techniqueSchema = z.object({
  name: z
    .string()
    .min(1, "Technique name is required.")
    .max(120, "Name must be 120 characters or fewer"),
  description: z
    .string()
    .max(500, "Description must be 500 characters or fewer")
    .nullable(),
  effect: z.string().nullable(),
  difficulty: z.string().nullable(),
  estimated_minutes: z.number().int().min(1).nullable(),
  result_photo_path: z.string().nullable(),
  notes: z
    .string()
    .max(2000, "Notes must be 2000 characters or fewer")
    .nullable(),
});

export type TechniqueFormValues = z.infer<typeof techniqueSchema>;
