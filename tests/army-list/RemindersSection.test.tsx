/**
 * ARMY-05 — RemindersSection tests.
 * Covers: hidden when no reminders, shown with Star header, rule_type badge labels,
 * ignores is_reminder=0 entries.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RemindersSection } from "@/features/army-lists/RemindersSection";
import { useRulesFavorites } from "@/hooks/useRulesFavorites";
import type { RulesFavorite } from "@/types/rulesFavorite";

vi.mock("@/hooks/useRulesFavorites", () => ({
  useRulesFavorites: vi.fn(),
}));

const mockUseRulesFavorites = vi.mocked(useRulesFavorites);

function makeFavorite(over: Partial<RulesFavorite> = {}): RulesFavorite {
  return {
    id: 1,
    rule_id: "STRAT001",
    rule_type: "stratagem",
    rule_name: "Honour the Chapter",
    is_reminder: 1,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

function renderSection() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <RemindersSection />
    </QueryClientProvider>,
  );
}

describe("RemindersSection", () => {
  it("returns null when no is_reminder=1 favorites exist", () => {
    mockUseRulesFavorites.mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useRulesFavorites>);

    const { container } = renderSection();
    expect(container.firstChild).toBeNull();
  });

  it("renders Star icon header 'Reminders' and reminder entries when is_reminder=1 favorites exist", () => {
    mockUseRulesFavorites.mockReturnValue({
      data: [makeFavorite()],
      isLoading: false,
    } as unknown as ReturnType<typeof useRulesFavorites>);

    renderSection();
    expect(screen.getByText("Reminders")).toBeInTheDocument();
    expect(screen.getByText("Honour the Chapter")).toBeInTheDocument();
  });

  it("renders rule_type badge with correct label text", () => {
    mockUseRulesFavorites.mockReturnValue({
      data: [
        makeFavorite({ id: 1, rule_id: "STRAT001", rule_type: "stratagem", rule_name: "Bolter Drill" }),
        makeFavorite({ id: 2, rule_id: "ABIL001", rule_type: "detachment_ability", rule_name: "Adeptus Astartes", is_reminder: 1 }),
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useRulesFavorites>);

    renderSection();
    expect(screen.getByText("Stratagem")).toBeInTheDocument();
    expect(screen.getByText("Detachment Ability")).toBeInTheDocument();
  });

  it("ignores favorites with is_reminder=0 — only shows is_reminder=1 entries", () => {
    mockUseRulesFavorites.mockReturnValue({
      data: [
        makeFavorite({ id: 1, rule_id: "STRAT001", rule_type: "stratagem", rule_name: "Favourite Strat", is_reminder: 0 }),
        makeFavorite({ id: 2, rule_id: "STRAT002", rule_type: "stratagem", rule_name: "Reminder Strat", is_reminder: 1 }),
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useRulesFavorites>);

    renderSection();
    expect(screen.getByText("Reminder Strat")).toBeInTheDocument();
    expect(screen.queryByText("Favourite Strat")).not.toBeInTheDocument();
  });
});
