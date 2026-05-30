import { describe, it, vi } from "vitest";

vi.mock("@/hooks/useUnitDatabase");

describe("FactionPicker", () => {
  it.todo("renders alignment group headers");
  it.todo("renders factions under the correct alignment group");
  it.todo("highlights the selected faction");
  it.todo("calls onSelectFaction when a faction is clicked");
  it.todo("shows loading skeletons while data is loading");
});
