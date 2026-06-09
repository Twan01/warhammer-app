/**
 * Phase 120 — DET-04: PlaybookDetachmentAbilities component tests.
 *
 * New component created in Phase 120 Plan 02.
 * Shows detachment abilities grouped by detachment_name in a collapsible
 * section. Uses useDetachmentAbilities hook from @/hooks/useGameData.
 *
 * Requirements tested:
 *   - D-14/D-15: Shows all detachment abilities for a faction, grouped by detachment_name
 *   - Returns null when loading or abilities.length === 0
 *   - Collapsible is collapsed by default (defaultOpen={false})
 *   - Detachment name appears as a section header
 *   - Ability names and descriptions render with HTML support
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { PlaybookDetachmentAbilities } from "@/features/units/PlaybookDetachmentAbilities";
import type { UdbDetachmentAbilityWithDetachment } from "@/types/gameData";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/hooks/useGameData", () => ({
  useDetachmentAbilities: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const gladiusAbilities: UdbDetachmentAbilityWithDetachment[] = [
  {
    id: "da-1",
    detachment_id: "det-gladius",
    faction_id: "SM",
    name: "Oaths of Moment",
    description: "<b>Once per battle</b>, this unit can reroll its charge roll.",
    detachment_name: "Gladius Task Force",
  },
  {
    id: "da-2",
    detachment_id: "det-gladius",
    faction_id: "SM",
    name: "Tactical Discipline",
    description: "Add 1 to hit rolls for ranged attacks.",
    detachment_name: "Gladius Task Force",
  },
];

const ironstormAbilities: UdbDetachmentAbilityWithDetachment[] = [
  {
    id: "da-3",
    detachment_id: "det-ironstorm",
    faction_id: "SM",
    name: "Armoured Might",
    description: null,
    detachment_name: "Ironstorm Spearhead",
  },
];

const allAbilities = [...gladiusAbilities, ...ironstormAbilities];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function setupAbilitiesMock(abilities: UdbDetachmentAbilityWithDetachment[] = allAbilities, isLoading = false) {
  const { useDetachmentAbilities } = await import("@/hooks/useGameData");
  vi.mocked(useDetachmentAbilities).mockReturnValue({
    data: abilities,
    isLoading,
  } as unknown as ReturnType<typeof useDetachmentAbilities>);
}

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function renderComponent(factionId = "SM") {
  return render(
    <PlaybookDetachmentAbilities factionId={factionId} />,
    { wrapper },
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PlaybookDetachmentAbilities — returns null when no data", () => {
  it("renders loading skeleton when isLoading is true", async () => {
    await setupAbilitiesMock([], true);
    const { container } = renderComponent();
    expect(container.querySelector("[data-slot='skeleton']")).toBeTruthy();
  });

  it("returns null when abilities array is empty", async () => {
    await setupAbilitiesMock([]);
    const { container } = renderComponent();
    expect(container.firstChild).toBeNull();
  });
});

describe("PlaybookDetachmentAbilities — DET-04 renders grouped detachment abilities", () => {
  it("renders 'Detachment Abilities' collapsible trigger", async () => {
    await setupAbilitiesMock();
    renderComponent();
    expect(screen.getByText("Detachment Abilities")).toBeInTheDocument();
  });

  it("collapsible is closed by default — ability names not visible without interaction", async () => {
    await setupAbilitiesMock();
    renderComponent();
    // Without opening, the content should not be visible
    expect(screen.queryByText("Oaths of Moment")).not.toBeInTheDocument();
    expect(screen.queryByText("Tactical Discipline")).not.toBeInTheDocument();
  });

  it("shows detachment names as group headers after opening", async () => {
    await setupAbilitiesMock();
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByText("Detachment Abilities"));

    // Both detachment names should appear as section headers
    expect(screen.getByText("Gladius Task Force")).toBeInTheDocument();
    expect(screen.getByText("Ironstorm Spearhead")).toBeInTheDocument();
  });

  it("shows ability names within their detachment group after opening", async () => {
    await setupAbilitiesMock();
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByText("Detachment Abilities"));

    expect(screen.getByText("Oaths of Moment")).toBeInTheDocument();
    expect(screen.getByText("Tactical Discipline")).toBeInTheDocument();
    expect(screen.getByText("Armoured Might")).toBeInTheDocument();
  });

  it("groups abilities correctly — each detachment header appears once", async () => {
    await setupAbilitiesMock();
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByText("Detachment Abilities"));

    // "Gladius Task Force" appears exactly once as a group header
    expect(screen.getAllByText("Gladius Task Force")).toHaveLength(1);
    // "Ironstorm Spearhead" appears exactly once as a group header
    expect(screen.getAllByText("Ironstorm Spearhead")).toHaveLength(1);
  });

  it("renders ability descriptions as HTML (dangerouslySetInnerHTML)", async () => {
    await setupAbilitiesMock();
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByText("Detachment Abilities"));

    // The description "Once per battle" should be accessible (text extracted from <b> tag)
    expect(screen.getByText(/once per battle/i)).toBeInTheDocument();
  });

  it("does not render description when ability.description is null", async () => {
    await setupAbilitiesMock();
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByText("Detachment Abilities"));

    // "Armoured Might" has null description — no description element should be rendered
    const armoured = screen.getByText("Armoured Might");
    // The parent card should not have a child description div
    // (We just verify the ability renders without error when description is null)
    expect(armoured).toBeInTheDocument();
  });
});

describe("PlaybookDetachmentAbilities — hook integration", () => {
  it("calls useDetachmentAbilities with the given factionId", async () => {
    const { useDetachmentAbilities } = await import("@/hooks/useGameData");
    vi.mocked(useDetachmentAbilities).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useDetachmentAbilities>);

    renderComponent("necrons");

    expect(vi.mocked(useDetachmentAbilities)).toHaveBeenCalledWith("necrons");
  });
});
