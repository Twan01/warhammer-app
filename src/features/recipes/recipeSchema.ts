import { z } from "zod";

export const RECIPE_STYLES = [
  "Battle Ready", "Parade Ready", "Display", "Tabletop", "Speed Paint", "Competition",
] as const;
export type RecipeStyle = typeof RECIPE_STYLES[number];

export const RECIPE_SURFACES = [
  "Armor", "Skin", "Cloth", "Metal", "Bone", "Leather", "Wood", "Stone",
  "Energy/Glow", "Fur/Hair", "Eyes/Lenses", "Base", "Weapon", "Other",
] as const;
export type RecipeSurface = typeof RECIPE_SURFACES[number];

export const RECIPE_EFFECTS = [
  "Clean", "Weathered", "Battle Damaged", "OSL", "NMM", "TMM",
  "Zenithal", "Wet Blend", "Contrast", "Dry Brush", "Other",
] as const;
export type RecipeEffect = typeof RECIPE_EFFECTS[number];

export const RECIPE_DIFFICULTIES = [
  "Beginner", "Intermediate", "Advanced", "Expert",
] as const;
export type RecipeDifficulty = typeof RECIPE_DIFFICULTIES[number];

export const PAINTING_PHASES = [
  "prime", "basecoat", "shade", "layer", "highlight",
  "glaze", "weathering", "basing", "varnish", "other",
] as const;
export type PaintingPhase = typeof PAINTING_PHASES[number];

export const recipeSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(120, "Name must be 120 characters or fewer"),
  faction_id: z.number().int().nullable(),
  unit_id: z.number().int().nullable(),
  area: z
    .string()
    .max(80, "Area must be 80 characters or fewer")
    .nullable(),
  notes: z
    .string()
    .max(2000, "Notes must be 2000 characters or fewer")
    .nullable(),
  tutorial_link: z
    .string()
    .nullable()
    .refine((v) => v === null || v === "" || /^https?:\/\/.+/.test(v), {
      message: "Must be a valid URL starting with http:// or https://",
    }),
  // v2.5 metadata fields
  style: z.string().nullable(),
  surface: z.string().nullable(),
  effect: z.string().nullable(),
  difficulty: z.string().nullable(),
  estimated_minutes: z.number().int().min(1).nullable(),
  result_photo_path: z.string().nullable(),
});

export type RecipeFormValues = z.infer<typeof recipeSchema>;
