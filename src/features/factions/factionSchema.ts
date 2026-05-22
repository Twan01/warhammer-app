import { z } from "zod";

/**
 * Zod schema for the faction form (FACT-01).
 * Single source of truth for both create and edit modes.
 *
 * Notes:
 *  - Zod v4 uses .min(1, "msg") not .nonempty() (RESEARCH State of the Art).
 *  - color_theme defaults to a standard slate-blue if the user does not pick one.
 *  - description and icon_path are optional in the UI but stored as null in DB.
 */
export const factionSchema = z.object({
  name: z.string().min(1, "Name is required").max(80, "Name must be 80 characters or fewer"),
  game_system: z.string().min(1, "Game system is required"),
  description: z.string().max(500, "Description must be 500 characters or fewer").nullable(),
  color_theme: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a 6-digit hex like #4A90D9"),
  icon_path: z.string().nullable(),
  lore_notes: z.string().nullable(),
});

export type FactionFormValues = z.infer<typeof factionSchema>;
