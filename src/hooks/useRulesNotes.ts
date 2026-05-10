/**
 * Phase 52 — React Query hooks for rules_notes (hobbyforge.db).
 * Provides read and upsert mutation.
 * Cache key: RULES_NOTES_KEY = ["rules-notes"]
 * NOT invalidated by rules sync — notes live in hobbyforge.db.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRulesNotes, upsertRulesNote } from "@/db/queries/rulesNotes";
import type { UpsertRulesNoteInput } from "@/types/rulesNote";

export const RULES_NOTES_KEY = ["rules-notes"] as const;

export function useRulesNotes() {
  return useQuery({
    queryKey: RULES_NOTES_KEY,
    queryFn: getRulesNotes,
  });
}

export function useUpsertRulesNote() {
  const qc = useQueryClient();
  return useMutation<void, Error, UpsertRulesNoteInput>({
    mutationFn: upsertRulesNote,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: RULES_NOTES_KEY });
    },
  });
}
