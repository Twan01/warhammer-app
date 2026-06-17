import { Link } from "@tanstack/react-router";
import { ArrowLeft, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import type { ArmyList } from "@/types/armyList";
import type { Faction } from "@/types/faction";

interface ArmyListDetailHeaderProps {
  list: ArmyList;
  faction: Faction | null;
  onEdit: () => void;
  onGameDay: () => void;
  onDelete: () => void;
}

export function ArmyListDetailHeader({
  list,
  faction,
  onEdit,
  onGameDay,
  onDelete,
}: ArmyListDetailHeaderProps) {
  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/army-lists">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Army Lists
          </Link>
        </Button>
      </div>

      <PageHeader
        title={list.name}
        subtitle={faction ? undefined : "No faction"}
        actions={
          <div className="flex items-center gap-2">
            {faction && (
              <Badge
                style={faction.color_theme ? { backgroundColor: faction.color_theme } : undefined}
                className={faction.color_theme ? "border-transparent text-white" : ""}
              >
                {faction.name}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={onEdit}>
              Edit List
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onGameDay}
            >
              <Swords className="mr-2 h-4 w-4" />
              Game Day
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              Delete List
            </Button>
          </div>
        }
      />
    </>
  );
}
