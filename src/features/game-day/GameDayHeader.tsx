import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Plus, Minus, Undo2, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useGameDayStore, useGameDayListState } from "./gameDayStore";

interface GameDayHeaderProps {
  listName: string;
  factionName: string | null;
  detachmentName: string | null;
  listId: number;
  onEndGame: () => void;
}

export function GameDayHeader({
  listName,
  factionName,
  detachmentName,
  listId,
  onEndGame,
}: GameDayHeaderProps) {
  const navigate = useNavigate();
  const listState = useGameDayListState(listId);
  const { spendCp, gainCp, undoCp, setStartingCp } = useGameDayStore();

  return (
    <div className="flex flex-col gap-3 px-4 py-3 border-b">
      {/* Top row: back + title + faction */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: "/army-lists" })}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <h1 className="text-lg font-semibold leading-tight truncate">
            {listName}
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {factionName && (
              <Badge variant="secondary" className="shrink-0">
                {factionName}
              </Badge>
            )}
            {detachmentName && (
              <span className="truncate">{detachmentName}</span>
            )}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="border-battle-gold text-battle-gold hover:bg-battle-gold/10 shrink-0"
          onClick={onEndGame}
        >
          <Flag size={14} className="mr-1.5" aria-hidden />
          End Game
        </Button>
      </div>

      {/* CP tracker row */}
      <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">CP</span>
          <span className="text-3xl font-bold tabular-nums">{listState.cp}</span>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={listState.cp === 0}
            onClick={() => spendCp(listId, 1)}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => gainCp(listId)}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={listState.cpHistory.length === 0}
            onClick={() => undoCp(listId)}
          >
            <Undo2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1.5 border-l pl-3">
          <label className="text-xs text-muted-foreground whitespace-nowrap">
            Start
          </label>
          <Input
            type="number"
            min={0}
            className="w-16 h-8 text-center"
            value={listState.startingCp}
            onChange={(e) =>
              setStartingCp(listId, Math.max(0, parseInt(e.target.value) || 0))
            }
          />
        </div>
      </div>
    </div>
  );
}
