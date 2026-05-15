import { getDb } from "@/db/client";
import type { StrategyNote, UpsertStrategyNoteInput } from "@/types/strategyNote";

/**
 * StrategyNote queries (STRAT-01..06).
 *
 * Phase 6 deliverable: getStrategyNote returns null when no note exists for
 * the unit yet (the Phase 9 form starts blank in that case).
 *
 * upsertStrategyNote uses select-then-insert/update because there is NO
 * UNIQUE INDEX on unit_strategy_notes.unit_id (CONTEXT.md discretion +
 * RESEARCH.md recommendation: safer for an existing schema). Do NOT use
 * ON CONFLICT — it requires a UNIQUE constraint that doesn't exist.
 */

export async function getStrategyNote(unitId: number): Promise<StrategyNote | null> {
  const db = await getDb();
  const rows = await db.select<StrategyNote[]>(
    "SELECT * FROM unit_strategy_notes WHERE unit_id = $1 LIMIT 1",
    [unitId]
  );
  return rows[0] ?? null;
}

export async function appendStrategyNotes(
  unitId: number,
  appendText: string,
): Promise<void> {
  const db = await getDb();
  const existing = await db.select<{ id: number; notes: string | null }[]>(
    "SELECT id, notes FROM unit_strategy_notes WHERE unit_id = $1",
    [unitId],
  );
  if (existing.length > 0) {
    const current = existing[0].notes;
    const merged = current ? `${current}\n\n${appendText}` : appendText;
    await db.execute(
      "UPDATE unit_strategy_notes SET notes = $2, updated_at = datetime('now') WHERE unit_id = $1",
      [unitId, merged],
    );
  } else {
    await db.execute(
      "INSERT INTO unit_strategy_notes (unit_id, notes) VALUES ($1, $2)",
      [unitId, appendText],
    );
  }
}

export async function upsertStrategyNote(input: UpsertStrategyNoteInput): Promise<void> {
  const db = await getDb();
  const existing = await db.select<{ id: number }[]>(
    "SELECT id FROM unit_strategy_notes WHERE unit_id = $1",
    [input.unit_id]
  );
  if (existing.length > 0) {
    await db.execute(
      `UPDATE unit_strategy_notes SET
         move=$2, toughness=$3, save=$4, wounds=$5, leadership=$6,
         objective_control=$7, keywords=$8, abilities=$9,
         battlefield_role=$10, strengths=$11, weaknesses=$12,
         best_targets=$13, synergies=$14, mistakes_to_avoid=$15,
         rules_references=$16, notes=$17, updated_at=datetime('now')
       WHERE unit_id=$1`,
      [
        input.unit_id,
        input.move, input.toughness, input.save, input.wounds, input.leadership,
        input.objective_control, input.keywords, input.abilities,
        input.battlefield_role, input.strengths, input.weaknesses,
        input.best_targets, input.synergies, input.mistakes_to_avoid,
        input.rules_references, input.notes,
      ]
    );
  } else {
    await db.execute(
      `INSERT INTO unit_strategy_notes (
         unit_id, move, toughness, save, wounds, leadership,
         objective_control, keywords, abilities,
         battlefield_role, strengths, weaknesses,
         best_targets, synergies, mistakes_to_avoid,
         rules_references, notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        input.unit_id,
        input.move, input.toughness, input.save, input.wounds, input.leadership,
        input.objective_control, input.keywords, input.abilities,
        input.battlefield_role, input.strengths, input.weaknesses,
        input.best_targets, input.synergies, input.mistakes_to_avoid,
        input.rules_references, input.notes,
      ]
    );
  }
}
