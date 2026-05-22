import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Faction } from "@/types/faction";
import type { Unit } from "@/types/unit";

interface FactionCardProps {
  faction: Faction;
  units: Unit[];
  onEditFaction: (f: Faction) => void;
  onDeleteFaction: (f: Faction) => void;
  onAddUnit: (factionId: number) => void;
  onEditUnit: (u: Unit) => void;
  onDeleteUnit: (u: Unit) => void;
}

export function FactionCard({
  faction,
  units,
  onEditFaction,
  onDeleteFaction,
  onAddUnit,
  onEditUnit,
  onDeleteUnit,
}: FactionCardProps) {
  return (
    <Card
      // FACT-05 / CONTEXT.md: 4px left border using faction.color_theme as the visible accent.
      style={{ borderLeft: `4px solid ${/^#[0-9A-Fa-f]{6}$/.test(faction.color_theme) ? faction.color_theme : "#71717a"}` }}
      className="border-l-[4px]"
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <CardTitle className="text-base">{faction.name}</CardTitle>
            <CardDescription>{faction.game_system}</CardDescription>
            {faction.description && (
              <p className="text-sm text-muted-foreground mt-1">{faction.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onAddUnit(faction.id)}
              aria-label={`Add unit to ${faction.name}`}
              title="Add Unit"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEditFaction(faction)}
              aria-label={`Edit ${faction.name}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDeleteFaction(faction)}
              aria-label={`Delete ${faction.name}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Units ({units.length})
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddUnit(faction.id)}
            className="h-7 text-xs"
          >
            <Plus className="mr-1 h-3 w-3" />
            Add Unit
          </Button>
        </div>

        {units.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No units yet</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {units.map((unit) => (
              <li
                key={unit.id}
                className="flex items-center justify-between rounded-sm px-2 py-1 hover:bg-muted/50 group"
              >
                <span className="text-sm">
                  <span className="font-medium">{unit.name}</span>
                  {unit.category && (
                    <span className="text-muted-foreground"> &bull; {unit.category}</span>
                  )}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onEditUnit(unit)}
                    aria-label={`Edit ${unit.name}`}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onDeleteUnit(unit)}
                    aria-label={`Delete ${unit.name}`}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
