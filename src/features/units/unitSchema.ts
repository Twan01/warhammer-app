import { z } from "zod";
import { PAINTING_STATUS_ORDER } from "@/types/unit";

/**
 * Zod schema for the unit form (UNIT-01..03).
 *
 * Strategy: required fields are non-empty; optional fields use .nullable().optional()
 * so the form can hold "" / null / undefined and the submit handler coerces to null
 * before sending to the DB (NULLs in SQL, not empty strings).
 *
 * Booleans are stored as 0|1 in the DB (Pitfall 1). The schema accepts boolean from the
 * form layer (checkbox returns true/false) and the submit handler coerces ? 1 : 0.
 *
 * NOTE: .default() is deliberately NOT used here (see decision 02-03: zod v4 .default()
 * makes input type optional, causing Resolver mismatch with react-hook-form). Form
 * defaultValues handle defaults instead.
 */
export const unitSchema = z.object({
  // Required
  faction_id: z.number().int().positive("Faction is required"),
  name: z.string().min(1, "Name is required").max(120, "Name must be 120 characters or fewer"),
  category: z.string().min(1, "Category is required").max(60, "Category must be 60 characters or fewer"),

  // Optional metadata
  unit_type: z.string().max(60).optional().nullable(),
  model_count: z.number().int().min(0).optional().nullable(),
  owned_count: z.number().int().min(0).optional().nullable(),
  points: z.number().int().min(0).optional().nullable(),

  // Status fields
  status_assembly: z.boolean(),
  status_painting: z.enum(PAINTING_STATUS_ORDER),
  painting_percentage: z.number().int().min(0).max(100),
  status_basing: z.boolean(),
  status_varnished: z.boolean(),
  is_active_project: z.boolean(),
  priority: z.number().int().optional().nullable(),
  target_completion_date: z.string().optional().nullable(), // ISO date "YYYY-MM-DD" from <input type="date">

  // Purchase + storage
  purchase_date: z.string().optional().nullable(),
  purchase_price_pence: z.number().int().min(0).optional().nullable(),
  storage_location: z.string().max(120).optional().nullable(),
  main_image_path: z.string().max(255).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type UnitFormValues = z.infer<typeof unitSchema>;
