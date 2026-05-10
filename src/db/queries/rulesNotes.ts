/**
 * Phase 52 — CRUD for rules_notes table in hobbyforge.db.
 * User personal notes attached to rules entries.
 * Uses INSERT OR REPLACE on UNIQUE(rule_id, rule_type) for upsert.
 * COALESCE subquery preserves original created_at on replace.
 */
import { getDb } from "@/db/client";
import type { RulesNote, UpsertRulesNoteInput } from "@/types/rulesNote";

export async function getRulesNotes(): Promise<RulesNote[]> {
  const db = await getDb();
  return db.select<RulesNote[]>(
    "SELECT * FROM rules_notes ORDER BY rule_name ASC"
  );
}

export async function getRulesNoteByKey(
  ruleId: string,
  ruleType: string
): Promise<RulesNote | null> {
  const db = await getDb();
  const rows = await db.select<RulesNote[]>(
    "SELECT * FROM rules_notes WHERE rule_id = $1 AND rule_type = $2",
    [ruleId, ruleType]
  );
  return rows[0] ?? null;
}

export async function upsertRulesNote(
  input: UpsertRulesNoteInput
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT OR REPLACE INTO rules_notes
       (rule_id, rule_type, rule_name, note_text,
        created_at, updated_at)
     VALUES ($1, $2, $3, $4,
       COALESCE((SELECT created_at FROM rules_notes WHERE rule_id = $1 AND rule_type = $2), datetime('now')),
       datetime('now'))`,
    [input.rule_id, input.rule_type, input.rule_name, input.note_text]
  );
}
