import { z } from "zod";
import { PAINTING_STATUS_ORDER } from "@/types/unit";

export const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Critical"] as const;
export type Priority = typeof PRIORITY_OPTIONS[number];

export const unitSchema = z.object({
  // Required
  faction_id: z.number().int().positive("Faction is required"),
  name: z.string().min(1, "Name is required").max(120, "Name must be 120 characters or fewer"),
  category: z.string().min(1, "Category is required").max(60, "Category must be 60 characters or fewer"),

  // Optional metadata
  model_count: z.number().int().min(0).optional().nullable(),
  owned_count: z.number().int().min(0).optional().nullable(),
  points: z.number().int().min(0).optional().nullable(),

  // Status fields — auto-managed by recipe sync, kept in schema for DB compat
  status_assembly: z.boolean(),
  status_painting: z.enum(PAINTING_STATUS_ORDER),
  painting_percentage: z.number().int().min(0).max(100),
  status_basing: z.boolean(),
  status_varnished: z.boolean(),
  is_active_project: z.boolean(),
  priority: z.string().optional().nullable(),
  target_completion_date: z.string().optional().nullable(),

  // Purchase + storage
  purchase_date: z.string().optional().nullable(),
  purchase_price_pounds: z.number().min(0).optional().nullable(),
  storage_location: z.string().max(120).optional().nullable(),
  main_image_path: z.string().max(255).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),

  // Enrichment
  undercoat: z.string().max(120, "Undercoat must be 120 characters or fewer").optional().nullable(),
});

export type UnitFormValues = z.infer<typeof unitSchema>;
