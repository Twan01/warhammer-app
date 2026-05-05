/**
 * Phase 22 — GoalSheet component tests.
 *
 * Mocks React Query hooks with vi.mock — no real DB or Tauri bridge needed.
 * Mirrors tests/wishlist/ Sheet test pattern.
 *
 * Covers ANLY-01 (GoalSheet renders correct fields, submits with derived period, pre-fills in edit mode).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { GoalSheet } from "@/features/goals/GoalSheet";
import type { HobbyGoal } from "@/types/goal";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCreateMutateAsync = vi.fn().mockResolvedValue(1);
const mockUpdateMutateAsync = vi.fn().mockResolvedValue(undefined);

vi.mock("@/hooks/useGoals", () => ({
  useCreateGoal: () => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
  }),
  useUpdateGoal: () => ({
    mutateAsync: mockUpdateMutateAsync,
    isPending: false,
  }),
}));

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------

function Wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateMutateAsync.mockResolvedValue(1);
  mockUpdateMutateAsync.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const mockGoal: HobbyGoal = {
  id: 1,
  name: "Paint 5 infantry",
  target_count: 5,
  timeframe: "month",
  period: "2026-05",
  created_at: "2026-05-01T00:00:00",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GoalSheet (ANLY-01)", () => {
  it("renders Name, Target, and Timeframe fields in create mode", async () => {
    render(
      <GoalSheet open={true} onOpenChange={vi.fn()} editingGoal={null} />,
      { wrapper: Wrapper }
    );

    await waitFor(() => {
      expect(screen.getByText("New Goal")).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/target unit count/i)).toBeInTheDocument();
    expect(screen.getByText(/timeframe/i)).toBeInTheDocument();
  });

  it("calls useCreateGoal on submit with name, target_count, timeframe, period", async () => {
    const user = userEvent.setup();
    render(
      <GoalSheet open={true} onOpenChange={vi.fn()} editingGoal={null} />,
      { wrapper: Wrapper }
    );

    await waitFor(() => {
      expect(screen.getByText("New Goal")).toBeInTheDocument();
    });

    // Fill the name field
    const nameInput = screen.getByLabelText(/^name$/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Paint 10 units");

    // Fill target count
    const targetInput = screen.getByLabelText(/target unit count/i);
    await user.clear(targetInput);
    await user.type(targetInput, "10");

    // Submit
    const submitBtn = screen.getByRole("button", { name: /create goal/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Paint 10 units",
          target_count: 10,
          timeframe: "month",
          period: expect.any(String),
        })
      );
    });
  });

  it("pre-fills fields when editingGoal is provided", async () => {
    render(
      <GoalSheet open={true} onOpenChange={vi.fn()} editingGoal={mockGoal} />,
      { wrapper: Wrapper }
    );

    await waitFor(() => {
      expect(screen.getByText("Edit Goal")).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/^name$/i) as HTMLInputElement;
    expect(nameInput.value).toBe("Paint 5 infantry");

    const targetInput = screen.getByLabelText(/target unit count/i) as HTMLInputElement;
    expect(targetInput.value).toBe("5");
  });
});
