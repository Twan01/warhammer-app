/**
 * Phase 55 Plan 01 — StratagemCard tests.
 *
 * Tests that the annotation controls are integrated correctly.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { RwStratagem } from "@/types/datasheet";
import type { RulesFavorite } from "@/types/rulesFavorite";
import type { RulesNote } from "@/types/rulesNote";
import type { UseMutationResult } from "@tanstack/react-query";

const mockUpsertMutate = vi.fn();
const mockDeleteMutate = vi.fn();

vi.mock("@/hooks/useRulesFavorites", () => ({
  useUpsertRulesFavorite: () =>
    ({ mutate: mockUpsertMutate }) as unknown as ReturnType<typeof import("@/hooks/useRulesFavorites").useUpsertRulesFavorite>,
  useDeleteRulesFavorite: () =>
    ({ mutate: mockDeleteMutate }) as unknown as ReturnType<typeof import("@/hooks/useRulesFavorites").useDeleteRulesFavorite>,
}));

vi.mock("@/hooks/useRulesNotes", () => ({
  useUpsertRulesNote: () => ({ mutate: vi.fn() }) as unknown as UseMutationResult<void, Error, unknown>,
}));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

// Import component AFTER mocks
import { StratagemCard } from "@/features/rules-hub/StratagemCard";

const mockStratagem: RwStratagem = {
  id: "s-1",
  faction_id: "SM",
  name: "Honour the Chapter",
  type: null,
  cp_cost: "1",
  phase: "Fight",
  turn: null,
  legend: null,
  detachment: null,
  detachment_id: null,
  description: "Use this stratagem in the fight phase.",
};

const mockFavorite: RulesFavorite = {
  id: 1,
  rule_id: "s-1",
  rule_type: "stratagem",
  rule_name: "Honour the Chapter",
  is_reminder: 0,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockFavoriteReminder: RulesFavorite = {
  ...mockFavorite,
  is_reminder: 1,
};

const mockNote: RulesNote = {
  id: 1,
  rule_id: "s-1",
  rule_type: "stratagem",
  rule_name: "Honour the Chapter",
  note_text: "Remember to use this in turn 3",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("StratagemCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders stratagem name and phase badge", () => {
    render(
      <StratagemCard stratagem={mockStratagem} favorite={null} note={null} />,
      { wrapper }
    );

    expect(screen.getByText("Honour the Chapter")).toBeInTheDocument();
    expect(screen.getByText("Fight")).toBeInTheDocument();
  });

  it("shows filled yellow star when favorite prop is non-null", () => {
    render(
      <StratagemCard stratagem={mockStratagem} favorite={mockFavorite} note={null} />,
      { wrapper }
    );

    const starBtn = screen.getByRole("button", { name: "Remove from favorites" });
    expect(starBtn.querySelector("svg")).toHaveClass("fill-yellow-500");
  });

  it("shows outline star when favorite prop is null", () => {
    render(
      <StratagemCard stratagem={mockStratagem} favorite={null} note={null} />,
      { wrapper }
    );

    const starBtn = screen.getByRole("button", { name: "Add to favorites" });
    expect(starBtn.querySelector("svg")).not.toHaveClass("fill-yellow-500");
  });

  it("shows filled blue flag when favorite.is_reminder === 1", () => {
    render(
      <StratagemCard stratagem={mockStratagem} favorite={mockFavoriteReminder} note={null} />,
      { wrapper }
    );

    const flagBtn = screen.getByRole("button", { name: "Remove Game Day reminder" });
    expect(flagBtn.querySelector("svg")).toHaveClass("fill-blue-500");
  });

  it("applies border-l-primary and bg-primary/5 classes when favorite is non-null", () => {
    const { container } = render(
      <StratagemCard stratagem={mockStratagem} favorite={mockFavorite} note={null} />,
      { wrapper }
    );

    const collapsible = container.firstChild as HTMLElement;
    expect(collapsible).toHaveClass("border-l-primary");
    expect(collapsible).toHaveClass("bg-primary/5");
  });

  it("does NOT apply annotation classes when both favorite and note are null", () => {
    const { container } = render(
      <StratagemCard stratagem={mockStratagem} favorite={null} note={null} />,
      { wrapper }
    );

    const collapsible = container.firstChild as HTMLElement;
    expect(collapsible).not.toHaveClass("border-l-primary");
    expect(collapsible).not.toHaveClass("bg-primary/5");
  });

  it("shows StickyNote indicator when note prop is non-null", () => {
    render(
      <StratagemCard stratagem={mockStratagem} favorite={null} note={mockNote} />,
      { wrapper }
    );

    // StickyNote indicator renders alongside star+flag controls — 3 SVGs in the controls div
    const starBtn = screen.getByRole("button", { name: "Add to favorites" });
    const controlsDiv = starBtn.parentElement;
    expect(controlsDiv?.querySelectorAll("svg").length).toBeGreaterThanOrEqual(3);
  });
});
