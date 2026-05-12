import { z } from "zod";
import { PAINTING_STATUS_ORDER } from "@/types/unit";

/**
 * DASH-02 — Zod schema for the LogSessionSheet form (dashboard Quick Action).
 *
 * NOTE: `.default()` is deliberately NOT used (zod v4 + react-hook-form
 * zodResolver type inference breaks with .default() — same issue as
 * armyListSchema and battleLogSchema, documented in STATE.md Phase 18 decisions).
 * defaultValues are supplied via the `buildDefaultValues()` pattern in
 * LogSessionSheet.tsx.
 *
 * DATA-01: new_status is an optional nullable PaintingStatus enum field.
 * Omitting or passing null means "no status change" — only a truthy value
 * triggers the updateUnit mutation in LogSessionSheet.
 */
export const logSessionSchema = z.object({
  unit_id: z
    .number({ message: "Select a unit" })
    .int()
    .positive("Select a unit"),
  session_date: z
    .string()
    .min(1, "Date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  duration_minutes: z
    .number({ message: "Duration is required" })
    .int()
    .positive("Duration must be greater than 0")
    .max(1440, "Duration cannot exceed 24 hours"),
  notes: z.string().max(2000).nullable(),
  new_status: z.enum(PAINTING_STATUS_ORDER).nullable().optional(),
  // Phase 41 — INTEG-01 (recipe+step selector in LogSessionSheet)
  recipe_id: z.number().int().positive().nullable().optional(),
  recipe_step_id: z.number().int().positive().nullable().optional(),
  // Phase 59 — SESS-01/05 (section cascade)
  section_name: z.string().nullable().optional(),
});

export type LogSessionFormValues = z.infer<typeof logSessionSchema>;
