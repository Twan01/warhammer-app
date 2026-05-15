import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getStrategyNote, upsertStrategyNote, appendStrategyNotes } from "@/db/queries/strategyNotes";
import type { UpsertStrategyNoteInput } from "@/types/strategyNote";

/**
 * StrategyNote query keys (STRAT-01..06).
 *
 * Per-unit factory: each unit's note is its own query subtree.
 * Phase 9 PlaybookTab opens the strategy note for the currently selected unit.
 */
export const STRATEGY_NOTE_KEY = (unitId: number) => ["strategy-note", unitId] as const;

/**
 * Loads the strategy note for a single unit, or null if none exists.
 * Returns immediately (no fetch) when unitId is undefined — supports the
 * Phase 9 sheet that mounts before a unit is selected.
 *
 * staleTime: Infinity — the note only changes via useUpsertStrategyNote in
 * the same Phase 9 form. Local SQLite IPC is sub-5ms; we trade a hard
 * staleness contract for fewer refetches.
 */
export function useStrategyNote(unitId: number | undefined) {
  return useQuery({
    queryKey: unitId !== undefined ? STRATEGY_NOTE_KEY(unitId) : (["strategy-note"] as const),
    queryFn: () => (unitId !== undefined ? getStrategyNote(unitId) : Promise.resolve(null)),
    enabled: unitId !== undefined,
    staleTime: Infinity,
  });
}

export function useAppendStrategyNotes() {
  const qc = useQueryClient();
  return useMutation<void, Error, { unit_id: number; text: string }>({
    mutationFn: ({ unit_id, text }) => appendStrategyNotes(unit_id, text),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: STRATEGY_NOTE_KEY(variables.unit_id) });
    },
  });
}

export function useUpsertStrategyNote() {
  const qc = useQueryClient();
  return useMutation<void, Error, UpsertStrategyNoteInput>({
    mutationFn: upsertStrategyNote,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: STRATEGY_NOTE_KEY(variables.unit_id) });
      // Intentionally NO invalidation of ['units'] or ['dashboard-stats'] —
      // strategy notes are not surfaced in the collection table or dashboard.
    },
  });
}
