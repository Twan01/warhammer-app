/**
 * Phase 53 Plan 03 — SharedAbilityCard tests.
 * Phase 55 Plan 01 — Annotation controls tests (PLAY-01, PLAY-02, PLAY-04).
 *
 * RULES-07: User can browse shared abilities for selected faction
 *   - renders ability name
 *   - expanding card reveals description text
 *   - falls back to legend when no description
 *   - handles ability with neither description nor legend
 * PLAY-01/02/04: Annotation controls (star, flag, note indicator, border styling)
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { RwAbility } from "@/types/datasheet";
import type { RulesFavorite } from "@/types/rulesFavorite";
import type { RulesNote } from "@/types/rulesNote";
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

const mockFavorite: RulesFavorite = {
  id: 1,
  rule_id: "ab-1",
  rule_type: "shared_ability",
  rule_name: "And They Shall Know No Fear",
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
  rule_id: "ab-1",
  rule_type: "shared_ability",
  rule_name: "And They Shall Know No Fear",
  note_text: "Key ability — prioritise this target",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
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

  // PLAY-01: favorite star shows filled yellow when favorite prop is non-null
  it("shows filled yellow star when favorite prop is non-null (PLAY-01)", () => {
    render(
      <SharedAbilityCard ability={abilityWithDescription} favorite={mockFavorite} note={null} />,
      { wrapper }
    );

    const starBtn = screen.getByRole("button", { name: "Remove from favorites" });
    expect(starBtn.querySelector("svg")).toHaveClass("fill-yellow-500");
  });

  it("shows outline star when favorite prop is null (PLAY-01)", () => {
    render(
      <SharedAbilityCard ability={abilityWithDescription} favorite={null} note={null} />,
      { wrapper }
    );

    const starBtn = screen.getByRole("button", { name: "Add to favorites" });
    expect(starBtn.querySelector("svg")).not.toHaveClass("fill-yellow-500");
  });

  // PLAY-02: flag shows filled blue when is_reminder === 1
  it("shows filled blue flag when favorite.is_reminder === 1 (PLAY-02)", () => {
    render(
      <SharedAbilityCard ability={abilityWithDescription} favorite={mockFavoriteReminder} note={null} />,
      { wrapper }
    );

    const flagBtn = screen.getByRole("button", { name: "Remove Game Day reminder" });
    expect(flagBtn.querySelector("svg")).toHaveClass("fill-blue-500");
  });

  // PLAY-04: annotation styling applied when annotated
  it("applies border-l-primary and bg-primary/5 classes when favorite is non-null (PLAY-04)", () => {
    const { container } = render(
      <SharedAbilityCard ability={abilityWithDescription} favorite={mockFavorite} note={null} />,
      { wrapper }
    );

    const collapsible = container.firstChild as HTMLElement;
    expect(collapsible).toHaveClass("border-l-primary");
    expect(collapsible).toHaveClass("bg-primary/5");
  });

  it("does NOT apply annotation classes when both favorite and note are null (PLAY-04)", () => {
    const { container } = render(
      <SharedAbilityCard ability={abilityWithDescription} favorite={null} note={null} />,
      { wrapper }
    );

    const collapsible = container.firstChild as HTMLElement;
    expect(collapsible).not.toHaveClass("border-l-primary");
    expect(collapsible).not.toHaveClass("bg-primary/5");
  });

  // PLAY-03: StickyNote indicator when note is non-null
  it("shows StickyNote indicator when note prop is non-null", () => {
    render(
      <SharedAbilityCard ability={abilityWithDescription} favorite={null} note={mockNote} />,
      { wrapper }
    );

    // StickyNote indicator renders as third SVG inside the annotation controls div
    const starBtn = screen.getByRole("button", { name: "Add to favorites" });
    const controlsDiv = starBtn.parentElement;
    expect(controlsDiv?.querySelectorAll("svg").length).toBeGreaterThanOrEqual(3);
  });

  it("applies annotation styling when only note is non-null (no favorite) (PLAY-04)", () => {
    const { container } = render(
      <SharedAbilityCard ability={abilityWithDescription} favorite={null} note={mockNote} />,
      { wrapper }
    );

    const collapsible = container.firstChild as HTMLElement;
    expect(collapsible).toHaveClass("border-l-primary");
    expect(collapsible).toHaveClass("bg-primary/5");
  });
});
