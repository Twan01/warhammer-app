import type { ArmyList, ArmyListUnitRow as ArmyListUnitRowType, ArmyListEnhancement } from "@/types/armyList";
import { ArmyListSheet } from "./ArmyListSheet";
import { ArmyListDeleteDialog } from "./ArmyListDeleteDialog";
import { UnitPickerDialog } from "./UnitPickerDialog";
import { LoadoutBuilderSheet } from "./LoadoutBuilderSheet";
import { EnhancementPickerSheet } from "./EnhancementPickerSheet";
import { LeaderAttachmentSheet } from "./LeaderAttachmentSheet";
import { DatasheetBrowserDialog } from "./DatasheetBrowserDialog";
import { PrintPreviewDialog } from "./PrintPreviewDialog";
import { SnapshotHistorySheet } from "./SnapshotHistorySheet";
import { SnapshotCompareDialog } from "./SnapshotCompareDialog";
import type { DetailPortalState, DetailPortalAction } from "./armyListDetailReducer";

interface ArmyListPortalsProps {
  state: DetailPortalState;
  dispatch: React.Dispatch<DetailPortalAction>;
  list: ArmyList;
  listId: number;
  totalPoints: number;
  units: ArmyListUnitRowType[];
  listEnhancements: ArmyListEnhancement[];
  factionName: string | null;
  loadoutUnit: ArmyListUnitRowType | null;
  enhancementUnit: ArmyListUnitRowType | null;
  leaderUnit: ArmyListUnitRowType | null;
  handleDeleteClose: () => void;
  handleDeleted: () => void;
}

export function ArmyListPortals({
  state,
  dispatch,
  list,
  listId,
  totalPoints,
  units,
  listEnhancements,
  factionName,
  loadoutUnit,
  enhancementUnit,
  leaderUnit,
  handleDeleteClose,
  handleDeleted,
}: ArmyListPortalsProps) {
  const {
    sheetOpen, editingList, deleteDialogOpen, deletingList,
    unitPickerOpen, loadoutUnitId, enhancementUnitId, leaderUnitId,
    datasheetBrowserOpen, printPreviewOpen,
    snapshotHistoryOpen, compareSnapshotIds, compareSnapshotLabels,
  } = state;

  return (
    <>
      {/* Sibling portals — Pitfall 1 (never nested) */}
      <ArmyListSheet
        key={editingList?.id ?? "new-edit"}
        open={sheetOpen}
        list={editingList}
        onClose={() => dispatch({ type: "CLOSE_SHEET" })}
      />
      <ArmyListDeleteDialog
        key={deletingList?.id ?? "none-delete"}
        open={deleteDialogOpen}
        list={deletingList}
        onClose={handleDeleteClose}
        onDeleted={handleDeleted}
      />
      <UnitPickerDialog
        open={unitPickerOpen}
        listId={listId}
        factionId={list.faction_id ?? null}
        remaining={list.points_limit != null ? list.points_limit - totalPoints : null}
        pointsLimit={list.points_limit ?? null}
        onClose={() => dispatch({ type: "CLOSE_UNIT_PICKER" })}
      />
      <LoadoutBuilderSheet
        open={loadoutUnitId !== null}
        unit={loadoutUnit}
        listId={listId}
        listFactionId={list.faction_id ?? null}
        onClose={() => dispatch({ type: "CLOSE_LOADOUT" })}
      />
      <EnhancementPickerSheet
        open={enhancementUnitId !== null}
        unit={enhancementUnit}
        list={list}
        onClose={() => dispatch({ type: "CLOSE_ENHANCEMENT" })}
      />
      <LeaderAttachmentSheet
        open={leaderUnitId !== null}
        unit={leaderUnit}
        list={list}
        units={units}
        onClose={() => dispatch({ type: "CLOSE_LEADER_ATTACH" })}
      />
      <DatasheetBrowserDialog
        open={datasheetBrowserOpen}
        listId={listId}
        factionId={list.faction_id ?? null}
        onClose={() => dispatch({ type: "CLOSE_DATASHEET_BROWSER" })}
      />
      <PrintPreviewDialog
        open={printPreviewOpen}
        list={list}
        units={units}
        enhancements={listEnhancements}
        factionName={factionName}
        onClose={() => dispatch({ type: "CLOSE_PRINT_PREVIEW" })}
      />
      <SnapshotHistorySheet
        open={snapshotHistoryOpen}
        listId={listId}
        list={list}
        units={units}
        enhancements={listEnhancements}
        factionName={factionName}
        onClose={() => dispatch({ type: "CLOSE_SNAPSHOT_HISTORY" })}
        onCompare={(ids, labels) => dispatch({ type: "OPEN_SNAPSHOT_COMPARE", ids, labels })}
      />
      <SnapshotCompareDialog
        open={compareSnapshotIds !== null}
        snapshotIds={compareSnapshotIds}
        snapshotLabels={compareSnapshotLabels}
        onClose={() => dispatch({ type: "CLOSE_SNAPSHOT_COMPARE" })}
      />
    </>
  );
}
