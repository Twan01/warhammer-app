import { getDb } from "@/db/client";
import type { TechniqueSection, TechniqueStep } from "@/types/technique";

/**
 * Returns all sections for a technique, ordered by order_index then id as a tiebreaker.
 */
export async function getTechniqueSections(techniqueId: number): Promise<TechniqueSection[]> {
  const db = await getDb();
  return db.select<TechniqueSection[]>(
    "SELECT * FROM technique_sections WHERE technique_id = $1 ORDER BY order_index ASC, id ASC",
    [techniqueId],
  );
}

/**
 * Returns all steps for a technique, joined through technique_sections.
 *
 * CRITICAL: technique_steps has NO technique_id column — steps join to a technique
 * via technique_section_id -> technique_sections.technique_id.
 * Ordered by section order_index then step order_index.
 */
export async function getTechniqueSteps(techniqueId: number): Promise<TechniqueStep[]> {
  const db = await getDb();
  return db.select<TechniqueStep[]>(
    `SELECT ts.*
     FROM technique_steps ts
     JOIN technique_sections sec ON sec.id = ts.technique_section_id
     WHERE sec.technique_id = $1
     ORDER BY sec.order_index ASC, ts.order_index ASC`,
    [techniqueId],
  );
}
