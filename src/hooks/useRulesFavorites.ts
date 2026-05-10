/**
 * Phase 52 — React Query hooks for rules_favorites (hobbyforge.db).
 * Provides read, upsert (with optimistic update), and delete mutations.
 * Cache key: RULES_FAVORITES_KEY = ["rules-favorites"]
 * NOT invalidated by rules sync — favorites live in hobbyforge.db.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRulesFavorites,
  upsertRulesFavorite,
  deleteRulesFavorite,
} from "@/db/queries/rulesFavorites";
import type { RulesFavorite, UpsertRulesFavoriteInput } from "@/types/rulesFavorite";

export const RULES_FAVORITES_KEY = ["rules-favorites"] as const;

export function useRulesFavorites() {
  return useQuery({
    queryKey: RULES_FAVORITES_KEY,
    queryFn: getRulesFavorites,
  });
}

export function useUpsertRulesFavorite() {
  const qc = useQueryClient();
  return useMutation<void, Error, UpsertRulesFavoriteInput, { previous: RulesFavorite[] | undefined }>({
    mutationFn: upsertRulesFavorite,
    onMutate: async (variables) => {
      await qc.cancelQueries({ queryKey: RULES_FAVORITES_KEY });
      const previous = qc.getQueryData<RulesFavorite[]>(RULES_FAVORITES_KEY);
      qc.setQueryData<RulesFavorite[]>(RULES_FAVORITES_KEY, (old) => {
        if (!old) return old;
        const idx = old.findIndex(
          (f) => f.rule_id === variables.rule_id && f.rule_type === variables.rule_type
        );
        if (idx >= 0) {
          return old.map((f, i) =>
            i === idx ? { ...f, ...variables, updated_at: new Date().toISOString() } : f
          );
        }
        // New entry — use placeholder id; onSettled will refetch real data
        return [
          ...old,
          {
            ...variables,
            id: -1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as RulesFavorite,
        ];
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        qc.setQueryData(RULES_FAVORITES_KEY, context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: RULES_FAVORITES_KEY });
    },
  });
}

export function useDeleteRulesFavorite() {
  const qc = useQueryClient();
  return useMutation<void, Error, { ruleId: string; ruleType: string }, { previous: RulesFavorite[] | undefined }>({
    mutationFn: ({ ruleId, ruleType }) => deleteRulesFavorite(ruleId, ruleType),
    onMutate: async (variables) => {
      await qc.cancelQueries({ queryKey: RULES_FAVORITES_KEY });
      const previous = qc.getQueryData<RulesFavorite[]>(RULES_FAVORITES_KEY);
      qc.setQueryData<RulesFavorite[]>(RULES_FAVORITES_KEY, (old) =>
        old?.filter(
          (f) => !(f.rule_id === variables.ruleId && f.rule_type === variables.ruleType)
        )
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        qc.setQueryData(RULES_FAVORITES_KEY, context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: RULES_FAVORITES_KEY });
    },
  });
}
