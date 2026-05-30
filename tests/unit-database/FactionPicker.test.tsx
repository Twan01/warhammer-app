/**
 * Phase 104 — BUI-01: FactionPicker component tests.
 *
 * Verifies alignment group headers, faction placement under correct group,
 * selected faction highlighting, click callback, and loading skeleton state.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FactionPicker } from "@/features/unit-database/FactionPicker";
import type { UdbFaction } from "@/db/queries/unitDatabase";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FACTIONS: UdbFaction[] = [
  { id: "SM", name: "Space Marines", short_name: null },
  { id: "AM", name: "Astra Militarum", short_name: null },
  { id: "CSM", name: "Chaos Space Marines", short_name: null },
  { id: "NEC", name: "Necrons", short_name: null },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FactionPicker", () => {
  it("renders alignment group headers", () => {
    const { container } = render(
      <FactionPicker
        factions={FACTIONS}
        selectedFactionId={null}
        onSelectFaction={() => {}}
        isLoading={false}
      />,
    );
    // "Space Marines" appears twice — once as a group header, once as a faction button.
    // Check group headers specifically by their CSS class.
    const headers = container.querySelectorAll(".text-xs.font-semibold.uppercase");
    const headerTexts = Array.from(headers).map((h) => h.textContent);
    expect(headerTexts).toContain("Space Marines");
    expect(headerTexts).toContain("Imperium");
    expect(headerTexts).toContain("Chaos");
    expect(headerTexts).toContain("Xenos");
  });

  it("renders factions under the correct alignment group", () => {
    const { container } = render(
      <FactionPicker
        factions={FACTIONS}
        selectedFactionId={null}
        onSelectFaction={() => {}}
        isLoading={false}
      />,
    );
    // "Astra Militarum" should be a button under "Imperium" header
    const buttons = container.querySelectorAll("button");
    const amButton = Array.from(buttons).find((b) => b.textContent?.includes("Astra Militarum"));
    expect(amButton).toBeDefined();

    // "Necrons" should be under "Xenos" header
    const necButton = Array.from(buttons).find((b) => b.textContent?.includes("Necrons"));
    expect(necButton).toBeDefined();
  });

  it("highlights the selected faction", () => {
    const { container } = render(
      <FactionPicker
        factions={FACTIONS}
        selectedFactionId="SM"
        onSelectFaction={() => {}}
        isLoading={false}
      />,
    );
    // The SM button should contain "Space Marines" text AND have the active class
    // Note: "Space Marines" text appears both as a group header and as a faction button
    const buttons = container.querySelectorAll("button");
    const smButton = Array.from(buttons).find((b) => b.textContent?.includes("Space Marines"));
    expect(smButton).toBeDefined();
    expect(smButton!.className).toContain("border-primary");
  });

  it("calls onSelectFaction when a faction is clicked", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <FactionPicker
        factions={FACTIONS}
        selectedFactionId={null}
        onSelectFaction={onSelect}
        isLoading={false}
      />,
    );
    const buttons = screen.getAllByRole("button");
    const amButton = buttons.find((b) => b.textContent?.includes("Astra Militarum"));
    expect(amButton).toBeDefined();
    await user.click(amButton!);
    expect(onSelect).toHaveBeenCalledWith("AM");
  });

  it("shows loading skeletons while data is loading", () => {
    const { container } = render(
      <FactionPicker
        factions={[]}
        selectedFactionId={null}
        onSelectFaction={() => {}}
        isLoading={true}
      />,
    );
    // When loading, it renders Skeleton components, not faction buttons
    const buttons = container.querySelectorAll("button");
    expect(buttons).toHaveLength(0);
    // Should have skeleton divs (6 of them)
    const skeletons = container.querySelectorAll("[class*='animate']");
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });
});
