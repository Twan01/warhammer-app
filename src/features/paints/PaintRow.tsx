import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableRow, TableCell } from "@/components/ui/table";
import type { Paint } from "@/types/paint";

interface PaintRowProps {
  paint: Paint;
  onEdit: (paint: Paint) => void;
  onDelete: (paint: Paint) => void;
}

export function PaintRow({ paint, onEdit, onDelete }: PaintRowProps) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          {paint.hex_color ? (
            <span
              className="inline-block h-4 w-4 rounded-full border border-border shrink-0"
              style={{ backgroundColor: paint.hex_color }}
              aria-hidden="true"
            />
          ) : (
            <span className="inline-block h-4 w-4 rounded-full border border-border bg-muted shrink-0" aria-hidden="true" />
          )}
          <span className="font-medium">{paint.name}</span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{paint.brand}</TableCell>
      <TableCell className="text-muted-foreground">{paint.paint_type}</TableCell>
      <TableCell>
        {paint.owned ? (
          <Badge variant="default">Owned</Badge>
        ) : (
          <Badge variant="secondary">Not owned</Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(paint)}
            aria-label={`Edit ${paint.brand} ${paint.name}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(paint)}
            aria-label={`Delete ${paint.brand} ${paint.name}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
