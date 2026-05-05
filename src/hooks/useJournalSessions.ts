import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getSessionsByUnit,
  createSession,
  deleteSession,
} from "@/db/queries/paintingSessions";
import type { PaintingSession, CreateSessionInput } from "@/types/paintingSession";

/**
 * paintingSessions query keys (JOUR-01..03).
 * Per-unit factory: each unit's session list is its own query subtree.
 */
export const PAINTING_SESSIONS_KEY = (unitId: number) =>
  ["painting-sessions", unitId] as const;

/**
 * Loads the painting session list for a single unit, sorted newest first.
 * staleTime: Infinity — sessions only change via the mutations in this file.
 * Mirrors useStrategyNote.ts.
 */
export function useJournalSessions(unitId: number | undefined) {
  return useQuery({
    queryKey:
      unitId !== undefined
        ? PAINTING_SESSIONS_KEY(unitId)
        : (["painting-sessions"] as const),
    queryFn: () =>
      unitId !== undefined ? getSessionsByUnit(unitId) : Promise.resolve([] as PaintingSession[]),
    enabled: unitId !== undefined,
    staleTime: Infinity,
  });
}

export function useCreatePaintingSession() {
  const qc = useQueryClient();
  return useMutation<void, Error, CreateSessionInput>({
    mutationFn: createSession,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: PAINTING_SESSIONS_KEY(variables.unit_id) });
      qc.invalidateQueries({ queryKey: ["hobby-analytics"] });
      qc.invalidateQueries({ queryKey: ["recent-activity"] });
      qc.invalidateQueries({ queryKey: ["goal-progress"] });
    },
  });
}

/**
 * Optimistic delete (JOUR-03). Removes the row from cache on mutate,
 * rolls back if the mutation rejects.
 *
 * The hook accepts the unitId at hook-call time so the optimistic update
 * targets the right cache key. Pass { id: sessionId } to mutate().
 */
export function useDeletePaintingSession(unitId: number) {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    number,
    { previous: PaintingSession[] | undefined }
  >({
    mutationFn: (sessionId: number) => deleteSession(sessionId),
    onMutate: async (sessionId) => {
      await qc.cancelQueries({ queryKey: PAINTING_SESSIONS_KEY(unitId) });
      const previous = qc.getQueryData<PaintingSession[]>(PAINTING_SESSIONS_KEY(unitId));
      qc.setQueryData<PaintingSession[]>(PAINTING_SESSIONS_KEY(unitId), (old) =>
        (old ?? []).filter((s) => s.id !== sessionId)
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      qc.setQueryData(PAINTING_SESSIONS_KEY(unitId), context?.previous);
      toast.error("Failed to delete session — changes were not saved.");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: PAINTING_SESSIONS_KEY(unitId) });
      qc.invalidateQueries({ queryKey: ["hobby-analytics"] });
    },
  });
}
