import { describe, it, expect, vi, beforeEach } from "vitest";
import { getBucketLabel } from "@/lib/stageLabel";
import type { AppSettingsMap } from "@/db/queries/appSettings";

vi.mock("@/db/queries/appSettings", () => ({
  getAppSetting: vi.fn(),
}));

// Must import after mock declaration
import { getAppSetting } from "@/db/queries/appSettings";
import {
  DEFAULT_CHECKLIST,
  getDefaultChecklist,
  useGameDayStore,
} from "@/features/game-day/gameDayStore";

beforeEach(() => {
  vi.clearAllMocks();
  // Reset Zustand store between tests
  useGameDayStore.setState({ listStates: {} });
});

describe("getBucketLabel integration", () => {
  it("returns custom label when settings has override", () => {
    const settings: AppSettingsMap = {
      pipeline_labels: JSON.stringify({ Assembly: "Build Phase" }),
    };
    expect(getBucketLabel("Assembly", settings)).toBe("Build Phase");
  });

  it("falls back to default bucket name when no override", () => {
    const settings: AppSettingsMap = {};
    expect(getBucketLabel("Painting", settings)).toBe("Painting");
  });
});

describe("getDefaultChecklist", () => {
  it("returns DEFAULT_CHECKLIST items when no setting exists", async () => {
    vi.mocked(getAppSetting).mockResolvedValue(null);
    const items = await getDefaultChecklist();
    expect(items).toHaveLength(DEFAULT_CHECKLIST.length);
    items.forEach((item, i) => {
      expect(item.text).toBe(DEFAULT_CHECKLIST[i].text);
      expect(item.checked).toBe(false);
    });
  });

  it("returns custom items when setting exists", async () => {
    vi.mocked(getAppSetting).mockResolvedValue(
      JSON.stringify([{ text: "Custom item 1" }, { text: "Custom item 2" }]),
    );
    const items = await getDefaultChecklist();
    expect(items).toHaveLength(2);
    expect(items[0].text).toBe("Custom item 1");
    expect(items[1].text).toBe("Custom item 2");
    expect(items[0].checked).toBe(false);
    expect(items[1].checked).toBe(false);
    // Each item has a unique ID
    expect(items[0].id).toBeTruthy();
    expect(items[1].id).toBeTruthy();
    expect(items[0].id).not.toBe(items[1].id);
  });

  it("falls back to DEFAULT_CHECKLIST on malformed JSON", async () => {
    vi.mocked(getAppSetting).mockResolvedValue("NOT JSON");
    const items = await getDefaultChecklist();
    expect(items).toHaveLength(DEFAULT_CHECKLIST.length);
    items.forEach((item, i) => {
      expect(item.text).toBe(DEFAULT_CHECKLIST[i].text);
    });
  });
});

describe("setDefaultChecklist", () => {
  it("does not overwrite existing session", () => {
    const existingItems = [
      { id: "existing-1", text: "Existing item", checked: true },
    ];
    useGameDayStore.setState({
      listStates: {
        "42": {
          cp: 3,
          cpHistory: [0, 1, 2],
          startingCp: 0,
          checklistItems: existingItems,
          usedAbilities: [],
        },
      },
    });

    const newItems = [
      { id: "new-1", text: "New item", checked: false },
    ];
    useGameDayStore.getState().setDefaultChecklist(42, newItems);

    const state = useGameDayStore.getState().listStates["42"];
    expect(state.checklistItems).toEqual(existingItems);
    expect(state.cp).toBe(3);
  });

  it("initializes new session when listId does not exist", () => {
    const items = [
      { id: "new-1", text: "Custom 1", checked: false },
      { id: "new-2", text: "Custom 2", checked: false },
    ];
    useGameDayStore.getState().setDefaultChecklist(99, items);

    const state = useGameDayStore.getState().listStates["99"];
    expect(state).toBeDefined();
    expect(state.checklistItems).toEqual(items);
    expect(state.cp).toBe(0);
    expect(state.cpHistory).toEqual([]);
    expect(state.startingCp).toBe(0);
    expect(state.usedAbilities).toEqual([]);
  });
});
