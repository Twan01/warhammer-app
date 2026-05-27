/**
 * JOUR-03 â€” useDeletePaintingSession optimistic-delete tests.
 *
 * Mocks the query module + sonner toast. Renders a thin TestConsumer to invoke
 * the hook inside a real QueryClient so we can read cache state pre/post mutate.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const deleteSessionMock = vi.fn();

vi.mock("@/db/queries/paintingSessions", () => ({
  getSessionsByUnit: vi.fn(),
  createSession: vi.fn(),
  deleteSession: (id: number) => deleteSessionMock(id),
}));

const toastErrorMock = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: (msg: string) => toastErrorMock(msg), success: vi.fn() },
}));

import {
  useDeletePaintingSession,
  PAINTING_SESSIONS_KEY,
} from "@/hooks/useJournalSessions";
import type { PaintingSession } from "@/types/paintingSession";

beforeEach(() => {
  deleteSessionMock.mockReset();
  toastErrorMock.mockReset();
});

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const seed: PaintingSession[] = [
  { id: 1, unit_id: 7, session_date: "2026-05-03", duration_minutes: 45, notes: null, created_at: "2026-05-03" },
  { id: 2, unit_id: 7, session_date: "2026-05-02", duration_minutes: 30, notes: null, created_at: "2026-05-02" },
];

describe("useDeletePaintingSession", () => {
  it("JOUR-03: optimistically removes the row from query cache on mutate", async () => {
    deleteSessionMock.mockResolvedValueOnce(undefined);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    qc.setQueryData<PaintingSession[]>(PAINTING_SESSIONS_KEY(7), seed);

    const { result } = renderHook(() => useDeletePaintingSession(7), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      result.current.mutate(1);
    });

    await waitFor(() => {
      const cache = qc.getQueryData<PaintingSession[]>(PAINTING_SESSIONS_KEY(7));
      expect(cache).toEqual([
        { id: 2, unit_id: 7, session_date: "2026-05-02", duration_minutes: 30, notes: null, created_at: "2026-05-02" },
      ]);
    });
    expect(deleteSessionMock).toHaveBeenCalledWith(1);
  });

  it("JOUR-03: rolls back the cache to the previous snapshot when deleteSession rejects", async () => {
    deleteSessionMock.mockRejectedValueOnce(new Error("DB error"));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    qc.setQueryData<PaintingSession[]>(PAINTING_SESSIONS_KEY(7), seed);

    const { result } = renderHook(() => useDeletePaintingSession(7), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      result.current.mutate(1);
    });

    await waitFor(() => {
      // Rollback restored the original 2-row snapshot
      const cache = qc.getQueryData<PaintingSession[]>(PAINTING_SESSIONS_KEY(7));
      expect(cache).toEqual(seed);
    });
    expect(toastErrorMock).toHaveBeenCalledWith(
      "Failed to delete session â€” changes were not saved."
    );
  });
});
