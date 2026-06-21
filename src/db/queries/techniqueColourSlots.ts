import { getDb } from "@/db/client";
import type { TechniqueColourSlot } from "@/types/technique";

/**
 * Returns all colour slots for a technique, ordered by order_index then id as a tiebreaker.
 */
export async function getTechniqueColourSlots(techniqueId: number): Promise<TechniqueColourSlot[]> {
  const db = await getDb();
  return db.select<TechniqueColourSlot[]>(
    "SELECT * FROM technique_colour_slots WHERE technique_id = $1 ORDER BY order_index ASC, id ASC",
    [techniqueId],
  );
}
