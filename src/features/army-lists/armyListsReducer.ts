/**
 * ARCH-04 — Centralized state machine for ArmyListsPage portal state.
 *
 * Replaces 14 individual useState calls with a single useReducer.
 * Cascade resets (CLOSE_DETAIL, CLOSE_SNAPSHOT_HISTORY) are expressed
 * as single state transitions rather than scattered setState calls.
 */
import type { ArmyList } from "@/types/armyList";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export type ArmyListsState = {
  selectedListId: number | null;
  sheetOpen: boolean;
  editingList: ArmyList | null;
  deleteDialogOpen: boolean;
  deletingList: ArmyList | null;
  unitPickerOpen: boolean;
  loadoutUnitId: number | null;
  enhancementUnitId: number | null;
  leaderUnitId: number | null;
  datasheetBrowserOpen: boolean;
  printPreviewOpen: boolean;
  snapshotHistoryOpen: boolean;
  compareSnapshotIds: [number, number] | null;
  compareSnapshotLabels: [string, string] | null;
};

export const initialArmyListsState: ArmyListsState = {
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
};

// ---------------------------------------------------------------------------
// Actions (discriminated union)
// ---------------------------------------------------------------------------

export type ArmyListsAction =
  | { type: "OPEN_CREATE" }
  | { type: "OPEN_EDIT"; list: ArmyList }
  | { type: "CLOSE_SHEET" }
  | { type: "OPEN_DELETE"; list: ArmyList }
  | { type: "CLOSE_DELETE" }
  | { type: "OPEN_DETAIL"; listId: number }
  | { type: "CLOSE_DETAIL" }
  | { type: "OPEN_UNIT_PICKER" }
  | { type: "CLOSE_UNIT_PICKER" }
  | { type: "OPEN_LOADOUT"; unitId: number }
  | { type: "CLOSE_LOADOUT" }
  | { type: "OPEN_ENHANCEMENT"; unitId: number }
  | { type: "CLOSE_ENHANCEMENT" }
  | { type: "OPEN_LEADER_ATTACH"; unitId: number }
  | { type: "CLOSE_LEADER_ATTACH" }
  | { type: "OPEN_DATASHEET_BROWSER" }
  | { type: "CLOSE_DATASHEET_BROWSER" }
  | { type: "OPEN_PRINT_PREVIEW" }
  | { type: "CLOSE_PRINT_PREVIEW" }
  | { type: "OPEN_SNAPSHOT_HISTORY" }
  | { type: "CLOSE_SNAPSHOT_HISTORY" }
  | { type: "OPEN_SNAPSHOT_COMPARE"; ids: [number, number]; labels: [string, string] }
  | { type: "CLOSE_SNAPSHOT_COMPARE" };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function armyListsReducer(
  state: ArmyListsState,
  action: ArmyListsAction,
): ArmyListsState {
  switch (action.type) {
    // Sheet (create / edit)
    case "OPEN_CREATE":
      return { ...state, sheetOpen: true, editingList: null };
    case "OPEN_EDIT":
      return { ...state, sheetOpen: true, editingList: action.list };
    case "CLOSE_SHEET":
      return { ...state, sheetOpen: false, editingList: null };

    // Delete dialog
    case "OPEN_DELETE":
      return { ...state, deleteDialogOpen: true, deletingList: action.list };
    case "CLOSE_DELETE": {
      const wasDeleting = state.deletingList;
      return {
        ...state,
        deleteDialogOpen: false,
        deletingList: null,
        selectedListId:
          wasDeleting && state.selectedListId === wasDeleting.id
            ? null
            : state.selectedListId,
      };
    }

    // Detail sheet
    case "OPEN_DETAIL":
      return { ...state, selectedListId: action.listId };

    // Cascade reset: closing detail resets all sub-sheets
    case "CLOSE_DETAIL":
      return {
        ...state,
        selectedListId: null,
        unitPickerOpen: false,
        loadoutUnitId: null,
        enhancementUnitId: null,
        leaderUnitId: null,
        datasheetBrowserOpen: false,
        printPreviewOpen: false,
        snapshotHistoryOpen: false,
        compareSnapshotIds: null,
        compareSnapshotLabels: null,
      };

    // Unit picker
    case "OPEN_UNIT_PICKER":
      return { ...state, unitPickerOpen: true };
    case "CLOSE_UNIT_PICKER":
      return { ...state, unitPickerOpen: false };

    // Loadout builder
    case "OPEN_LOADOUT":
      return { ...state, loadoutUnitId: action.unitId };
    case "CLOSE_LOADOUT":
      return { ...state, loadoutUnitId: null };

    // Enhancement picker
    case "OPEN_ENHANCEMENT":
      return { ...state, enhancementUnitId: action.unitId };
    case "CLOSE_ENHANCEMENT":
      return { ...state, enhancementUnitId: null };

    // Leader attachment
    case "OPEN_LEADER_ATTACH":
      return { ...state, leaderUnitId: action.unitId };
    case "CLOSE_LEADER_ATTACH":
      return { ...state, leaderUnitId: null };

    // Datasheet browser
    case "OPEN_DATASHEET_BROWSER":
      return { ...state, datasheetBrowserOpen: true };
    case "CLOSE_DATASHEET_BROWSER":
      return { ...state, datasheetBrowserOpen: false };

    // Print preview
    case "OPEN_PRINT_PREVIEW":
      return { ...state, printPreviewOpen: true };
    case "CLOSE_PRINT_PREVIEW":
      return { ...state, printPreviewOpen: false };

    // Snapshot history (cascade: also resets compare state)
    case "OPEN_SNAPSHOT_HISTORY":
      return { ...state, snapshotHistoryOpen: true };
    case "CLOSE_SNAPSHOT_HISTORY":
      return {
        ...state,
        snapshotHistoryOpen: false,
        compareSnapshotIds: null,
        compareSnapshotLabels: null,
      };

    // Snapshot compare
    case "OPEN_SNAPSHOT_COMPARE":
      return {
        ...state,
        compareSnapshotIds: action.ids,
        compareSnapshotLabels: action.labels,
      };
    case "CLOSE_SNAPSHOT_COMPARE":
      return {
        ...state,
        compareSnapshotIds: null,
        compareSnapshotLabels: null,
      };

    default:
      return state;
  }
}
