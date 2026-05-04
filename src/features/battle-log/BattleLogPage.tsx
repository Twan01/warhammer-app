import { useState, useMemo } from "react";
import { Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBattleLogs, useBattleLogSummary } from "@/hooks/useBattleLogs";
import { useArmyLists } from "@/hooks/useArmyLists";
import { useUnits } from "@/hooks/useUnits";
import type { BattleLog } from "@/types/battleLog";
import { BattleLogRow } from "./BattleLogRow";
import { BattleLogSheet } from "./BattleLogSheet";
import { BattleLogDeleteDialog } from "./BattleLogDeleteDialog";
import { BattleLogSummaryBar } from "./BattleLogSummaryBar";
import { BattleLogEmptyState } from "./BattleLogEmptyState";
import { PageHeader } from "@/components/common/PageHeader";

/**
 * BATTLE-01..05 root page. Owns ALL portal state (sibling-portal architecture
 * — Pitfall 1, never nest a Sheet/Dialog inside a list row).
 *
 * State machine:
 *   - sheetOpen + editingLog: create/edit form Sheet (null editingLog = create)
 *   - deleteDialogOpen + deletingLog: log delete confirmation
 *
 * Mirrors ArmyListsPage exactly (minus the DetailSheet/UnitPicker which battle
 * logs do not need — notes expand inline within the row).
 */
export function BattleLogPage() {
  const { data: logs, isLoading, isError } = useBattleLogs();
  const { data: summary } = useBattleLogSummary();
  const { data: armyLists } = useArmyLists();
  const { data: units } = useUnits();

  // Page-level portal state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<BattleLog | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingLog, setDeletingLog] = useState<BattleLog | null>(null);

  // Lookup maps for row name resolution. Use Map for O(1) lookup over a list.
  const armyListNameById = useMemo(() => {
    const m = new Map<number, string>();
    (armyLists ?? []).forEach((l) => m.set(l.id, l.name));
    return m;
  }, [armyLists]);

  const unitNameById = useMemo(() => {
    const m = new Map<number, string>();
    (units ?? []).forEach((u) => m.set(u.id, u.name));
    return m;
  }, [units]);

  // Handlers
  const openCreate = () => { setEditingLog(null); setSheetOpen(true); };
  const openEdit = (log: BattleLog) => { setEditingLog(log); setSheetOpen(true); };
  const closeSheet = () => { setSheetOpen(false); setEditingLog(null); };
  const openDelete = (log: BattleLog) => { setDeletingLog(log); setDeleteDialogOpen(true); };
  const closeDelete = () => { setDeleteDialogOpen(false); setDeletingLog(null); };

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Battle Log"
        subtitle="Every game you've played, win or lose."
        actions={
          <Button onClick={openCreate}>
            <Swords className="mr-2 h-4 w-4" /> Log Game
          </Button>
        }
      />

      {isLoading && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-72" />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive">
          Could not load battle log. Restart the app or try again.
        </p>
      )}

      {!isLoading && !isError && (logs?.length ?? 0) === 0 && (
        <BattleLogEmptyState onAdd={openCreate} />
      )}

      {!isLoading && !isError && (logs?.length ?? 0) > 0 && (
        <>
          {summary && summary.total > 0 && <BattleLogSummaryBar summary={summary} />}
          <div className="flex flex-col">
            {(logs ?? []).map((log) => (
              <BattleLogRow
                key={log.id}
                log={log}
                armyListName={
                  log.army_list_id !== null
                    ? armyListNameById.get(log.army_list_id) ?? null
                    : null
                }
                mvpUnitName={
                  log.mvp_unit_id !== null
                    ? unitNameById.get(log.mvp_unit_id) ?? null
                    : null
                }
                underperformingUnitName={
                  log.underperforming_unit_id !== null
                    ? unitNameById.get(log.underperforming_unit_id) ?? null
                    : null
                }
                onEdit={openEdit}
                onDelete={openDelete}
              />
            ))}
          </div>
        </>
      )}

      {/* Sibling portals at page root — Pitfall 1 (NEVER nested) */}
      <BattleLogSheet
        key={editingLog?.id ?? "new-edit"}
        open={sheetOpen}
        log={editingLog}
        onClose={closeSheet}
      />
      <BattleLogDeleteDialog
        key={deletingLog?.id ?? "none-delete"}
        open={deleteDialogOpen}
        log={deletingLog}
        onClose={closeDelete}
      />
    </div>
  );
}
