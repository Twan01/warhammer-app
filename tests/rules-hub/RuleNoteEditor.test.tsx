/**
 * Phase 55 Plan 01 — RuleNoteEditor tests.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { RuleNoteEditor } from "@/features/rules-hub/RuleNoteEditor";
import type { RulesNote } from "@/types/rulesNote";

const mockMutate = vi.fn();

vi.mock("@/hooks/useRulesNotes", () => ({
  useUpsertRulesNote: () => ({
    mutate: mockMutate,
  }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const existingNote: RulesNote = {
  id: 1,
  rule_id: "strat-1",
  rule_type: "stratagem",
  rule_name: "Test Stratagem",
  note_text: "My existing note",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("RuleNoteEditor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockMutate.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders textarea with existing note text", () => {
    render(
      <RuleNoteEditor
        ruleId="strat-1"
        ruleType="stratagem"
        ruleName="Test Stratagem"
        note={existingNote}
      />,
      { wrapper }
    );

    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveValue("My existing note");
  });

  it("renders empty textarea when note is null", () => {
    render(
      <RuleNoteEditor
        ruleId="strat-1"
        ruleType="stratagem"
        ruleName="Test Stratagem"
        note={null}
      />,
      { wrapper }
    );

    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveValue("");
  });

  it("renders 'Your Notes' label", () => {
    render(
      <RuleNoteEditor
        ruleId="strat-1"
        ruleType="stratagem"
        ruleName="Test Stratagem"
        note={null}
      />,
      { wrapper }
    );

    expect(screen.getByText("Your Notes")).toBeInTheDocument();
  });

  it("does not call mutate before debounce completes", () => {
    render(
      <RuleNoteEditor
        ruleId="strat-1"
        ruleType="stratagem"
        ruleName="Test Stratagem"
        note={null}
      />,
      { wrapper }
    );

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Hello" } });

    // Before debounce completes
    vi.advanceTimersByTime(499);
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("calls upsertNote.mutate after debounce delay", () => {
    render(
      <RuleNoteEditor
        ruleId="strat-1"
        ruleType="stratagem"
        ruleName="Test Stratagem"
        note={null}
      />,
      { wrapper }
    );

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Hello" } });

    // Advance past debounce
    vi.advanceTimersByTime(500);

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        rule_id: "strat-1",
        rule_type: "stratagem",
        rule_name: "Test Stratagem",
        note_text: "Hello",
      })
    );
  });
});
