/**
 * D-11 — Extracted reducer for ArmyListDetailPage portal state.
 *
 * Manages all modal/sheet/dialog state on the army list detail page.
 * Extracted from ArmyListDetailPage.tsx to improve file organization
 * and follow the same pattern as armyListsReducer.ts.
 */
import type { ArmyList } from "@/types/armyList";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export type DetailPortalState = {
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

export const initialDetailPortalState: DetailPortalState = {
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

export type DetailPortalAction =
  | { type: "OPEN_EDIT"; list: ArmyList }
  | { type: "CLOSE_SHEET" }
  | { type: "OPEN_DELETE"; list: ArmyList }
  | { type: "CLOSE_DELETE" }
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

export function detailPortalReducer(
  state: DetailPortalState,
  action: DetailPortalAction,
): DetailPortalState {
  switch (action.type) {
    case "OPEN_EDIT":
      return { ...state, sheetOpen: true, editingList: action.list };
    case "CLOSE_SHEET":
      return { ...state, sheetOpen: false, editingList: null };
    case "OPEN_DELETE":
      return { ...state, deleteDialogOpen: true, deletingList: action.list };
    case "CLOSE_DELETE":
      return { ...state, deleteDialogOpen: false, deletingList: null };
    case "OPEN_UNIT_PICKER":
      return { ...state, unitPickerOpen: true };
    case "CLOSE_UNIT_PICKER":
      return { ...state, unitPickerOpen: false };
    case "OPEN_LOADOUT":
      return { ...state, loadoutUnitId: action.unitId };
    case "CLOSE_LOADOUT":
      return { ...state, loadoutUnitId: null };
    case "OPEN_ENHANCEMENT":
      return { ...state, enhancementUnitId: action.unitId };
    case "CLOSE_ENHANCEMENT":
      return { ...state, enhancementUnitId: null };
    case "OPEN_LEADER_ATTACH":
      return { ...state, leaderUnitId: action.unitId };
    case "CLOSE_LEADER_ATTACH":
      return { ...state, leaderUnitId: null };
    case "OPEN_DATASHEET_BROWSER":
      return { ...state, datasheetBrowserOpen: true };
    case "CLOSE_DATASHEET_BROWSER":
      return { ...state, datasheetBrowserOpen: false };
    case "OPEN_PRINT_PREVIEW":
      return { ...state, printPreviewOpen: true };
    case "CLOSE_PRINT_PREVIEW":
      return { ...state, printPreviewOpen: false };
    case "OPEN_SNAPSHOT_HISTORY":
      return { ...state, snapshotHistoryOpen: true };
    case "CLOSE_SNAPSHOT_HISTORY":
      return {
        ...state,
        snapshotHistoryOpen: false,
        compareSnapshotIds: null,
        compareSnapshotLabels: null,
      };
    case "OPEN_SNAPSHOT_COMPARE":
      return {
        ...state,
        compareSnapshotIds: action.ids,
        compareSnapshotLabels: action.labels,
      };
    case "CLOSE_SNAPSHOT_COMPARE":
      return { ...state, compareSnapshotIds: null, compareSnapshotLabels: null };
    default:
      return state;
  }
}
