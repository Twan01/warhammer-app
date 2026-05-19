import { z } from "zod";

// NOTE: do NOT use .default() — zodResolver + react-hook-form type inference
// breaks with .default() (same documented pitfall as logSessionSchema.ts).
// defaultValues are supplied via buildDefaultValues() in PaintingSessionSheet.tsx.
export const paintingSessionSchema = z.object({
  duration_minutes: z
    .number({ message: "Duration is required" })
    .int()
    .positive("Duration must be greater than 0")
    .max(1440, "Duration cannot exceed 24 hours"),
  notes: z.string().max(2000).nullable(),
});

export type PaintingSessionFormValues = z.infer<typeof paintingSessionSchema>;
