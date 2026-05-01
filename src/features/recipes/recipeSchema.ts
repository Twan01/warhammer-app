import { z } from "zod";

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
});

export type RecipeFormValues = z.infer<typeof recipeSchema>;
