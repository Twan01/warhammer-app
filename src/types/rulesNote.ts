import type { RuleType } from './rulesFavorite';

export interface RulesNote {
  id: number;
  rule_id: string;
  rule_type: RuleType;
  rule_name: string;
  note_text: string;
  created_at: string;
  updated_at: string;
}

export type UpsertRulesNoteInput = Omit<RulesNote, 'id' | 'created_at' | 'updated_at'>;
