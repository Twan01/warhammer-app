/**
 * FBK-05: RuleNoteEditor shows "Saved" text with opacity transition after auto-save.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Mock: capture onSuccess callback from mutate calls
// ---------------------------------------------------------------------------
let capturedOnSuccess: (() => void) | null = null;
const mockMutate = vi.fn().mockImplementation((_data: unknown, opts?: { onSuccess?: () => void }) => {
  capturedOnSuccess = opts?.onSuccess ?? null;
});

vi.mock("@/hooks/useRulesNotes", () => ({
  useUpsertRulesNote: () => ({
    mutate: mockMutate,
  }),
}));

import { RuleNoteEditor } from "@/features/rules-hub/RuleNoteEditor";

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("FBK-05: RuleNoteEditor saved indicator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockMutate.mockClear();
    capturedOnSuccess = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders 'Saved' span that starts with opacity-0", () => {
    render(
      <RuleNoteEditor ruleId="strat-1" ruleType="stratagem" ruleName="Test" note={null} />,
      { wrapper },
    );

    const savedSpan = screen.getByText("Saved");
    expect(savedSpan).toBeInTheDocument();
    expect(savedSpan).toHaveClass("opacity-0");
  });

  it("'Saved' span has transition-opacity class for fade effect", () => {
    render(
      <RuleNoteEditor ruleId="strat-1" ruleType="stratagem" ruleName="Test" note={null} />,
      { wrapper },
    );

    const savedSpan = screen.getByText("Saved");
    expect(savedSpan).toHaveClass("transition-opacity");
  });

  it("shows 'Saved' with opacity-100 after onSuccess fires, then fades back", () => {
    render(
      <RuleNoteEditor ruleId="strat-1" ruleType="stratagem" ruleName="Test" note={null} />,
      { wrapper },
    );

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "New note" } });

    // Advance past debounce (500ms)
    act(() => { vi.advanceTimersByTime(500); });

    expect(mockMutate).toHaveBeenCalledTimes(1);
    // mutate was called with onSuccess callback
    expect(capturedOnSuccess).not.toBeNull();

    // Simulate mutation success
    act(() => { capturedOnSuccess!(); });

    const savedSpan = screen.getByText("Saved");
    expect(savedSpan).toHaveClass("opacity-100");

    // After 2 seconds, should fade back to opacity-0
    act(() => { vi.advanceTimersByTime(2000); });
    expect(savedSpan).toHaveClass("opacity-0");
  });
});
