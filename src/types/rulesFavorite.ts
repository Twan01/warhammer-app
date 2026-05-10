export const RULE_TYPES = ['stratagem', 'detachment_ability', 'shared_ability'] as const;
export type RuleType = typeof RULE_TYPES[number];

export interface RulesFavorite {
  id: number;
  rule_id: string;
  rule_type: RuleType;
  rule_name: string;
  is_reminder: 0 | 1;
  created_at: string;
  updated_at: string;
}

export type UpsertRulesFavoriteInput = Omit<RulesFavorite, 'id' | 'created_at' | 'updated_at'>;
