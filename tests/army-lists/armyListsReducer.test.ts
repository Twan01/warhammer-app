/**
 * ARCH-04 â€” armyListsReducer unit tests.
 *
 * Tests the centralized state machine that replaces 14 individual useState
 * calls in ArmyListsPage. Covers cascade resets, action handlers, and
 * unknown action passthrough.
 */
import { describe, it, expect } from "vitest";
import {
  armyListsReducer,
  initialArmyListsState,
  type ArmyListsState,
} from "@/features/army-lists/armyListsReducer";
import type { ArmyList } from "@/types/armyList";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockList: ArmyList = {
  id: 1,
  name: "Test List",
  faction_id: 1,
  points_limit: 2000,
  list_type: null,
  notes: null,
  detachment_id: null,
  detachment_name: null,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

const mockList2: ArmyList = { ...mockList, id: 2, name: "Second List" };

/** Returns a "fully open" state for testing cascade resets. */
function fullyOpenState(): ArmyListsState {
  return {
    selectedListId: 1,
    sheetOpen: true,
    editingList: mockList,
    deleteDialogOpen: true,
    deletingList: mockList,
    unitPickerOpen: true,
    loadoutUnitId: 10,
    enhancementUnitId: 20,
    leaderUnitId: 30,
    datasheetBrowserOpen: true,
    printPreviewOpen: true,
    snapshotHistoryOpen: true,
    compareSnapshotIds: [100, 200],
    compareSnapshotLabels: ["v1", "v2"],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("armyListsReducer", () => {
  describe("initial state", () => {
    it("has all fields null/false", () => {
      expect(initialArmyListsState).toEqual({
        selectedListId: null,
        sheetOpen: false,
        editingList: null,
        deleteDialogOpen: false,
        deletingList: null,
        unitPickerOpen: false,
        loadoutUnitId: null,
        enhancementUnitId: null,
        leaderUnitId: null,
        datasheetBrowserOpen: false,
        printPreviewOpen: false,
        snapshotHistoryOpen: false,
        compareSnapshotIds: null,
        compareSnapshotLabels: null,
      });
    });
  });

  describe("OPEN_CREATE", () => {
    it("sets sheetOpen=true and editingList=null", () => {
      const state = armyListsReducer(initialArmyListsState, { type: "OPEN_CREATE" });
      expect(state.sheetOpen).toBe(true);
      expect(state.editingList).toBe(null);
    });
  });

  describe("OPEN_EDIT", () => {
    it("sets sheetOpen=true and editingList to provided list", () => {
      const state = armyListsReducer(initialArmyListsState, { type: "OPEN_EDIT", list: mockList });
      expect(state.sheetOpen).toBe(true);
      expect(state.editingList).toBe(mockList);
    });
  });

  describe("CLOSE_SHEET", () => {
    it("resets sheetOpen=false and editingList=null", () => {
      const before: ArmyListsState = { ...initialArmyListsState, sheetOpen: true, editingList: mockList };
      const state = armyListsReducer(before, { type: "CLOSE_SHEET" });
      expect(state.sheetOpen).toBe(false);
      expect(state.editingList).toBe(null);
    });
  });

  describe("OPEN_DELETE", () => {
    it("sets deleteDialogOpen=true and deletingList", () => {
      const state = armyListsReducer(initialArmyListsState, { type: "OPEN_DELETE", list: mockList });
      expect(state.deleteDialogOpen).toBe(true);
      expect(state.deletingList).toBe(mockList);
    });
  });

  describe("CLOSE_DELETE", () => {
    it("resets deleteDialogOpen and deletingList", () => {
      const before: ArmyListsState = {
        ...initialArmyListsState,
        deleteDialogOpen: true,
        deletingList: mockList2,
        selectedListId: 1,
      };
      const state = armyListsReducer(before, { type: "CLOSE_DELETE" });
      expect(state.deleteDialogOpen).toBe(false);
      expect(state.deletingList).toBe(null);
      // selectedListId unchanged because deletingList.id !== selectedListId
      expect(state.selectedListId).toBe(1);
    });

    it("clears selectedListId if the deleted list was selected", () => {
      const before: ArmyListsState = {
        ...initialArmyListsState,
        deleteDialogOpen: true,
        deletingList: mockList,
        selectedListId: mockList.id,
      };
      const state = armyListsReducer(before, { type: "CLOSE_DELETE" });
      expect(state.selectedListId).toBe(null);
    });
  });

  describe("OPEN_DETAIL", () => {
    it("sets selectedListId", () => {
      const state = armyListsReducer(initialArmyListsState, { type: "OPEN_DETAIL", listId: 5 });
      expect(state.selectedListId).toBe(5);
    });
  });

  describe("CLOSE_DETAIL â€” cascade reset", () => {
    it("resets all 10 sub-sheet fields to null/false", () => {
      const before = fullyOpenState();
      const state = armyListsReducer(before, { type: "CLOSE_DETAIL" });

      expect(state.selectedListId).toBe(null);
      expect(state.unitPickerOpen).toBe(false);
      expect(state.loadoutUnitId).toBe(null);
      expect(state.enhancementUnitId).toBe(null);
      expect(state.leaderUnitId).toBe(null);
      expect(state.datasheetBrowserOpen).toBe(false);
      expect(state.printPreviewOpen).toBe(false);
      expect(state.snapshotHistoryOpen).toBe(false);
      expect(state.compareSnapshotIds).toBe(null);
      expect(state.compareSnapshotLabels).toBe(null);
    });

    it("does NOT reset sheet or delete dialog state", () => {
      const before = fullyOpenState();
      const state = armyListsReducer(before, { type: "CLOSE_DETAIL" });

      // These are independent portals, not sub-sheets of detail
      expect(state.sheetOpen).toBe(true);
      expect(state.editingList).toBe(mockList);
      expect(state.deleteDialogOpen).toBe(true);
      expect(state.deletingList).toBe(mockList);
    });
  });

  describe("unit picker", () => {
    it("OPEN_UNIT_PICKER sets unitPickerOpen=true", () => {
      const state = armyListsReducer(initialArmyListsState, { type: "OPEN_UNIT_PICKER" });
      expect(state.unitPickerOpen).toBe(true);
    });
    it("CLOSE_UNIT_PICKER sets unitPickerOpen=false", () => {
      const before = { ...initialArmyListsState, unitPickerOpen: true };
      const state = armyListsReducer(before, { type: "CLOSE_UNIT_PICKER" });
      expect(state.unitPickerOpen).toBe(false);
    });
  });

  describe("loadout", () => {
    it("OPEN_LOADOUT sets loadoutUnitId", () => {
      const state = armyListsReducer(initialArmyListsState, { type: "OPEN_LOADOUT", unitId: 42 });
      expect(state.loadoutUnitId).toBe(42);
    });
    it("CLOSE_LOADOUT clears loadoutUnitId", () => {
      const before = { ...initialArmyListsState, loadoutUnitId: 42 };
      const state = armyListsReducer(before, { type: "CLOSE_LOADOUT" });
      expect(state.loadoutUnitId).toBe(null);
    });
  });

  describe("enhancement", () => {
    it("OPEN_ENHANCEMENT sets enhancementUnitId", () => {
      const state = armyListsReducer(initialArmyListsState, { type: "OPEN_ENHANCEMENT", unitId: 7 });
      expect(state.enhancementUnitId).toBe(7);
    });
    it("CLOSE_ENHANCEMENT clears enhancementUnitId", () => {
      const before = { ...initialArmyListsState, enhancementUnitId: 7 };
      const state = armyListsReducer(before, { type: "CLOSE_ENHANCEMENT" });
      expect(state.enhancementUnitId).toBe(null);
    });
  });

  describe("leader attach", () => {
    it("OPEN_LEADER_ATTACH sets leaderUnitId", () => {
      const state = armyListsReducer(initialArmyListsState, { type: "OPEN_LEADER_ATTACH", unitId: 9 });
      expect(state.leaderUnitId).toBe(9);
    });
    it("CLOSE_LEADER_ATTACH clears leaderUnitId", () => {
      const before = { ...initialArmyListsState, leaderUnitId: 9 };
      const state = armyListsReducer(before, { type: "CLOSE_LEADER_ATTACH" });
      expect(state.leaderUnitId).toBe(null);
    });
  });

  describe("datasheet browser", () => {
    it("OPEN_DATASHEET_BROWSER sets datasheetBrowserOpen=true", () => {
      const state = armyListsReducer(initialArmyListsState, { type: "OPEN_DATASHEET_BROWSER" });
      expect(state.datasheetBrowserOpen).toBe(true);
    });
    it("CLOSE_DATASHEET_BROWSER sets datasheetBrowserOpen=false", () => {
      const before = { ...initialArmyListsState, datasheetBrowserOpen: true };
      const state = armyListsReducer(before, { type: "CLOSE_DATASHEET_BROWSER" });
      expect(state.datasheetBrowserOpen).toBe(false);
    });
  });

  describe("print preview", () => {
    it("OPEN_PRINT_PREVIEW sets printPreviewOpen=true", () => {
      const state = armyListsReducer(initialArmyListsState, { type: "OPEN_PRINT_PREVIEW" });
      expect(state.printPreviewOpen).toBe(true);
    });
    it("CLOSE_PRINT_PREVIEW sets printPreviewOpen=false", () => {
      const before = { ...initialArmyListsState, printPreviewOpen: true };
      const state = armyListsReducer(before, { type: "CLOSE_PRINT_PREVIEW" });
      expect(state.printPreviewOpen).toBe(false);
    });
  });

  describe("snapshot history", () => {
    it("OPEN_SNAPSHOT_HISTORY sets snapshotHistoryOpen=true", () => {
      const state = armyListsReducer(initialArmyListsState, { type: "OPEN_SNAPSHOT_HISTORY" });
      expect(state.snapshotHistoryOpen).toBe(true);
    });
    it("CLOSE_SNAPSHOT_HISTORY cascades: resets history + compare state", () => {
      const before: ArmyListsState = {
        ...initialArmyListsState,
        snapshotHistoryOpen: true,
        compareSnapshotIds: [1, 2],
        compareSnapshotLabels: ["a", "b"],
      };
      const state = armyListsReducer(before, { type: "CLOSE_SNAPSHOT_HISTORY" });
      expect(state.snapshotHistoryOpen).toBe(false);
      expect(state.compareSnapshotIds).toBe(null);
      expect(state.compareSnapshotLabels).toBe(null);
    });
  });

  describe("snapshot compare", () => {
    it("OPEN_SNAPSHOT_COMPARE sets ids and labels", () => {
      const state = armyListsReducer(initialArmyListsState, {
        type: "OPEN_SNAPSHOT_COMPARE",
        ids: [10, 20],
        labels: ["v1", "v2"],
      });
      expect(state.compareSnapshotIds).toEqual([10, 20]);
      expect(state.compareSnapshotLabels).toEqual(["v1", "v2"]);
    });
    it("CLOSE_SNAPSHOT_COMPARE clears ids and labels", () => {
      const before: ArmyListsState = {
        ...initialArmyListsState,
        compareSnapshotIds: [10, 20],
        compareSnapshotLabels: ["v1", "v2"],
      };
      const state = armyListsReducer(before, { type: "CLOSE_SNAPSHOT_COMPARE" });
      expect(state.compareSnapshotIds).toBe(null);
      expect(state.compareSnapshotLabels).toBe(null);
    });
  });

  describe("unknown action", () => {
    it("returns state unchanged", () => {
      const before = fullyOpenState();
      // @ts-expect-error â€” intentional unknown action for test coverage
      const state = armyListsReducer(before, { type: "DOES_NOT_EXIST" });
      expect(state).toBe(before);
    });
  });
});
