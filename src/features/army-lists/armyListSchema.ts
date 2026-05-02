import { z } from "zod";

/**
 * ARMY-01 — Zod schema for the army list create/edit form.
 *
 * The DB column army_lists.list_type is TEXT (free string), but the UI restricts
 * to these 5 values per 08-CONTEXT.md and 08-UI-SPEC.md. Adding new list types
 * means editing this enum and the Select options in ArmyListSheet.tsx.
 *
 * NOTE: .default() is deliberately NOT used (decision 02-03 in STATE.md: zod v4
 * .default() breaks Resolver type inference with react-hook-form). Form
 * defaultValues handle defaults instead.
 */
export const ARMY_LIST_TYPES = [
  "Casual",
  "Learning",
  "Narrative",
  "Competitive",
  "Test",
] as const;

export type ArmyListType = typeof ARMY_LIST_TYPES[number];

export const armyListSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(120, "Name must be 120 characters or fewer"),
  faction_id: z.number().int().positive().nullable(),
  list_type: z.enum(ARMY_LIST_TYPES).nullable(),
  points_limit: z.number().int().min(0).nullable(),
  notes: z.string().max(2000).nullable(),
});

export type ArmyListFormValues = z.infer<typeof armyListSchema>;
