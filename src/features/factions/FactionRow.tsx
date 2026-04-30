import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableRow, TableCell } from "@/components/ui/table";
import type { Faction } from "@/types/faction";

interface FactionRowProps {
  faction: Faction;
  onEdit: (faction: Faction) => void;
  onDelete: (faction: Faction) => void;
}

export function FactionRow({ faction, onEdit, onDelete }: FactionRowProps) {
  return (
    <TableRow
      // FACT-05 / CONTEXT.md: 4px left border using faction.color_theme as the visible accent.
      style={{ borderLeft: `4px solid ${faction.color_theme}` }}
      className="border-l-[4px]"
    >
      <TableCell className="font-medium">{faction.name}</TableCell>
      <TableCell className="text-muted-foreground">{faction.game_system}</TableCell>
      <TableCell className="text-muted-foreground">{faction.description ?? "—"}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => onEdit(faction)} aria-label={`Edit ${faction.name}`}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(faction)} aria-label={`Delete ${faction.name}`}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
