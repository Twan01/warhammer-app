import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RESULT_BADGE_CLASS, RESULT_BADGE_LABEL } from "./resultBadge";
import type { BattleLog } from "@/types/battleLog";

interface BattleLogRowProps {
  log: BattleLog;
  armyListName: string | null;       // null = army_list_id is null OR list deleted
  mvpUnitName: string | null;        // null = mvp_unit_id is null OR unit deleted
  underperformingUnitName: string | null;
  onEdit: (log: BattleLog) => void;
  onDelete: (log: BattleLog) => void;
}

/**
 * BATTLE-03 + BATTLE-04 — compact 2-line row with inline Collapsible expand.
 *
 * UI contract (from 18-UI-SPEC.md):
 *   Line 1: result badge + opponent_faction + mission + points (truncate)
 *   Line 2: army list name (or "(Army list deleted)" italic muted) + battle_date
 *   Hover: Edit/Delete icon buttons appear (group-hover)
 *   Click row body: toggles inline Collapsible expanded section
 *   Click action button: stops propagation so it does NOT toggle expand
 */
export function BattleLogRow({
  log,
  armyListName,
  mvpUnitName,
  underperformingUnitName,
  onEdit,
  onDelete,
}: BattleLogRowProps) {
  const [expanded, setExpanded] = useState(false);

  function handleEditClick(e: React.MouseEvent) {
    e.stopPropagation();
    onEdit(log);
  }
  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation();
    onDelete(log);
  }

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div
        className="group relative flex items-start gap-3 rounded-lg px-3 py-3 hover:bg-muted/50 transition-colors duration-150 cursor-pointer border-b border-border/40"
        onClick={() => setExpanded((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
      >
        {/* Result badge — fixed width for alignment */}
        <Badge
          className={RESULT_BADGE_CLASS[log.result]}
          style={{ minWidth: "48px", justifyContent: "center" }}
        >
          {RESULT_BADGE_LABEL[log.result]}
        </Badge>

        {/* Main content — 2 lines */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">
            {log.opponent_faction} · {log.mission}
            {log.points_played != null && (
              <span className="text-muted-foreground font-normal tabular-nums">
                {" · "}{log.points_played}pts
              </span>
            )}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {armyListName ? (
              armyListName
            ) : log.army_list_id !== null ? (
              <span className="italic">(Army list deleted)</span>
            ) : (
              <span className="italic">No army list</span>
            )}
            {" · "}
            {log.battle_date}
          </p>
        </div>

        {/* Hover action buttons — invisible until group hover */}
        <div className="invisible group-hover:visible flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Edit game log"
            onClick={handleEditClick}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            aria-label="Delete game log"
            onClick={handleDeleteClick}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CollapsibleContent className="px-3 pb-3 pt-1">
        <div className="rounded-lg bg-muted/30 p-4 flex flex-col gap-3 text-sm">
          {(log.my_score !== null || log.opponent_score !== null) && (
            <div className="flex gap-6">
              <span className="text-muted-foreground">My VP</span>
              <span className="font-semibold tabular-nums">{log.my_score ?? "—"}</span>
              <span className="text-muted-foreground">Opponent VP</span>
              <span className="font-semibold tabular-nums">{log.opponent_score ?? "—"}</span>
            </div>
          )}
          {log.opponent && (
            <div>
              <span className="text-muted-foreground">Opponent </span>
              <span>{log.opponent}</span>
            </div>
          )}
          {mvpUnitName && (
            <div>
              <span className="text-muted-foreground">MVP </span>
              <span className="font-semibold">{mvpUnitName}</span>
            </div>
          )}
          {underperformingUnitName && (
            <div>
              <span className="text-muted-foreground">Underperformed </span>
              <span>{underperformingUnitName}</span>
            </div>
          )}
          {log.lessons_learned && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Lessons Learned
              </p>
              <p className="whitespace-pre-wrap">{log.lessons_learned}</p>
            </div>
          )}
          {log.changes_next_time && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Changes Next Time
              </p>
              <p className="whitespace-pre-wrap">{log.changes_next_time}</p>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
