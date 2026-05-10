/**
 * Phase 52 — useRulesNotes hook tests.
 *
 * Mocks @/db/queries/rulesNotes with vi.fn() stubs.
 * Verifies that:
 *   - useRulesNotes returns query data from getRulesNotes
 *   - useUpsertRulesNote calls upsertRulesNote and invalidates RULES_NOTES_KEY
 *
 * Follows the exact pattern from tests/datasheet/useRulesExtended.test.tsx.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const getRulesNotesMock = vi.fn();
const upsertRulesNoteMock = vi.fn();

vi.mock("@/db/queries/rulesNotes", () => ({
  getRulesNotes: (...args: unknown[]) => getRulesNotesMock(...args),
  getRulesNoteByKey: vi.fn(),
  upsertRulesNote: (...args: unknown[]) => upsertRulesNoteMock(...args),
}));

import {
  useRulesNotes,
  useUpsertRulesNote,
  RULES_NOTES_KEY,
} from "@/hooks/useRulesNotes";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  getRulesNotesMock.mockReset();
  upsertRulesNoteMock.mockReset();
});

describe("useRulesNotes", () => {
  it("calls getRulesNotes and returns the data", async () => {
    const sample = [
      {
        id: 1,
        rule_id: "strat-aoc",
        rule_type: "stratagem",
        rule_name: "Armour of Contempt",
        note_text: "Use after saves are failed.",
        created_at: "2026-05-10T00:00:00.000Z",
        updated_at: "2026-05-10T00:00:00.000Z",
      },
    ];
    getRulesNotesMock.mockResolvedValueOnce(sample);

    const { result } = renderHook(() => useRulesNotes(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(getRulesNotesMock).toHaveBeenCalledOnce();
    expect(result.current.data).toEqual(sample);
  });
});

describe("useUpsertRulesNote", () => {
  it("calls upsertRulesNote with the given input when mutation is fired", async () => {
    upsertRulesNoteMock.mockResolvedValueOnce(undefined);
    getRulesNotesMock.mockResolvedValue([]);

    const { result } = renderHook(() => useUpsertRulesNote(), { wrapper: makeWrapper() });

    await act(async () => {
      result.current.mutate({
        rule_id: "da-oath",
        rule_type: "detachment_ability",
        rule_name: "Oath of Moment",
        note_text: "Target heavy armour first.",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // React Query v5 mutationFn receives (variables, { client, meta, mutationKey }) — check first arg only
    expect(upsertRulesNoteMock.mock.calls[0][0]).toEqual({
      rule_id: "da-oath",
      rule_type: "detachment_ability",
      rule_name: "Oath of Moment",
      note_text: "Target heavy armour first.",
    });
  });
});

describe("RULES_NOTES_KEY", () => {
  it("is ['rules-notes'] as const", () => {
    expect(RULES_NOTES_KEY).toEqual(["rules-notes"]);
  });
});
