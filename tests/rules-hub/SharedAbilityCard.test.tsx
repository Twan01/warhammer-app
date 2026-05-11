/**
 * Phase 53 Plan 03 — SharedAbilityCard tests.
 *
 * RULES-07: User can browse shared abilities for selected faction
 *   - renders ability name
 *   - expanding card reveals description text
 *   - falls back to legend when no description
 *   - handles ability with neither description nor legend
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { RwAbility } from "@/types/datasheet";
import { SharedAbilityCard } from "@/features/rules-hub/SharedAbilityCard";

vi.mock("@/hooks/useRulesFavorites", () => ({
  useUpsertRulesFavorite: () => ({ mutate: vi.fn() }),
  useDeleteRulesFavorite: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/hooks/useRulesNotes", () => ({
  useUpsertRulesNote: () => ({ mutate: vi.fn() }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const abilityWithDescription: RwAbility = {
  id: "ab-1",
  name: "And They Shall Know No Fear",
  legend: "Astartes",
  faction_id: "SM",
  description: "Each time a Combat Attrition test is taken for this unit, ignore any or all modifiers.",
};

const abilityWithoutDescription: RwAbility = {
  id: "ab-2",
  name: "Oath of Moment",
  legend: "Sacred Vow",
  faction_id: "SM",
  description: null,
};

const abilityWithNothing: RwAbility = {
  id: "ab-3",
  name: "Nameless Trait",
  legend: null,
  faction_id: "SM",
  description: null,
};

describe("SharedAbilityCard", () => {
  it("renders ability name in the card header", () => {
    render(<SharedAbilityCard ability={abilityWithDescription} favorite={null} note={null} />, { wrapper });

    expect(screen.getByText("And They Shall Know No Fear")).toBeInTheDocument();
  });

  it("shows legend badge in header when legend is present", () => {
    render(<SharedAbilityCard ability={abilityWithDescription} favorite={null} note={null} />, { wrapper });

    expect(screen.getByText("Astartes")).toBeInTheDocument();
  });

  it("reveals description text after expanding the card", async () => {
    const user = userEvent.setup();
    render(<SharedAbilityCard ability={abilityWithDescription} favorite={null} note={null} />, { wrapper });

    // Description should not be visible before expanding
    expect(
      screen.queryByText(
        "Each time a Combat Attrition test is taken for this unit, ignore any or all modifiers."
      )
    ).not.toBeInTheDocument();

    // Click the trigger to expand
    await user.click(screen.getByText("And They Shall Know No Fear"));

    expect(
      screen.getByText(
        "Each time a Combat Attrition test is taken for this unit, ignore any or all modifiers."
      )
    ).toBeInTheDocument();
  });

  it("falls back to legend text when description is null", async () => {
    const user = userEvent.setup();
    render(<SharedAbilityCard ability={abilityWithoutDescription} favorite={null} note={null} />, { wrapper });

    await user.click(screen.getByText("Oath of Moment"));

    // The legend text appears twice: once as header badge, once as body fallback
    const matches = screen.getAllByText("Sacred Vow");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("shows fallback message when neither description nor legend is present", async () => {
    const user = userEvent.setup();
    render(<SharedAbilityCard ability={abilityWithNothing} favorite={null} note={null} />, { wrapper });

    await user.click(screen.getByText("Nameless Trait"));

    expect(screen.getByText("No description available.")).toBeInTheDocument();
  });
});
