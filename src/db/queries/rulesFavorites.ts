/**
 * Phase 52 — CRUD for rules_favorites table in hobbyforge.db.
 * User favorites and Game Day reminders for rules entries.
 * Uses INSERT OR REPLACE on UNIQUE(rule_id, rule_type) for upsert.
 * COALESCE subquery preserves original created_at on replace.
 */
import { getDb } from "@/db/client";
import type { RulesFavorite, UpsertRulesFavoriteInput } from "@/types/rulesFavorite";

export async function getRulesFavorites(): Promise<RulesFavorite[]> {
  const db = await getDb();
  return db.select<RulesFavorite[]>(
    "SELECT * FROM rules_favorites ORDER BY rule_name ASC"
  );
}

export async function getRulesFavoritesByType(
  ruleType: string
): Promise<RulesFavorite[]> {
  const db = await getDb();
  return db.select<RulesFavorite[]>(
    "SELECT * FROM rules_favorites WHERE rule_type = $1 ORDER BY rule_name ASC",
    [ruleType]
  );
}

export async function upsertRulesFavorite(
  input: UpsertRulesFavoriteInput
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT OR REPLACE INTO rules_favorites
       (rule_id, rule_type, rule_name, is_reminder,
        created_at, updated_at)
     VALUES ($1, $2, $3, $4,
       COALESCE((SELECT created_at FROM rules_favorites WHERE rule_id = $1 AND rule_type = $2), datetime('now')),
       datetime('now'))`,
    [input.rule_id, input.rule_type, input.rule_name, input.is_reminder]
  );
}

export async function deleteRulesFavorite(
  ruleId: string,
  ruleType: string
): Promise<void> {
  const db = await getDb();
  await db.execute(
    "DELETE FROM rules_favorites WHERE rule_id = $1 AND rule_type = $2",
    [ruleId, ruleType]
  );
}
