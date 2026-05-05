import type { ColumnDef, Column } from "@tanstack/react-table";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Pencil,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PaintingRecipe } from "@/types/recipe";
import type { Faction } from "@/types/faction";
import type { Unit } from "@/types/unit";

function SortableHeader<T>({ column, label }: { column: Column<T, unknown>; label: string }) {
  const sorted = column.getIsSorted();
  return (
    <button
      type="button"
      className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground"
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {label}
      {sorted === "asc" ? (
        <ChevronUp className="h-3 w-3" />
      ) : sorted === "desc" ? (
        <ChevronDown className="h-3 w-3" />
      ) : (
        <ChevronsUpDown className="h-3 w-3 opacity-50" />
      )}
    </button>
  );
}

export function buildRecipeColumns(
  factionMap: Map<number, Faction>,
  unitMap: Map<number, Unit>,
  stepCountByRecipe: Map<number, number>,
  swatchColorsByRecipe: Map<number, { paint_id: number; hex_color: string | null }[]>,
  onEdit: (recipe: PaintingRecipe) => void,
  onDelete: (recipe: PaintingRecipe) => void,
): ColumnDef<PaintingRecipe>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => <SortableHeader column={column} label="Name" />,
      cell: ({ row }) => <span className="text-sm">{row.original.name}</span>,
    },
    {
      id: "faction",
      accessorFn: (row) =>
        row.faction_id !== null ? factionMap.get(row.faction_id)?.name ?? "" : "",
      header: ({ column }) => <SortableHeader column={column} label="Faction" />,
      cell: ({ row }) => {
        if (row.original.faction_id === null) {
          return <span className="text-sm text-muted-foreground">—</span>;
        }
        const faction = factionMap.get(row.original.faction_id);
        if (!faction) return <span className="text-sm text-muted-foreground">—</span>;
        return (
          <Badge
            style={{ backgroundColor: faction.color_theme }}
            className="border-transparent text-white"
            data-testid="faction-badge"
          >
            {faction.name}
          </Badge>
        );
      },
      enableSorting: true,
    },
    {
      id: "unit",
      accessorFn: (row) =>
        row.unit_id !== null ? unitMap.get(row.unit_id)?.name ?? "" : "",
      header: () => (
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Linked Unit
        </span>
      ),
      cell: ({ row }) => {
        if (row.original.unit_id === null) {
          return <span className="text-sm text-muted-foreground">—</span>;
        }
        const unit = unitMap.get(row.original.unit_id);
        return <span className="text-sm">{unit?.name ?? "—"}</span>;
      },
      enableSorting: false,
    },
    {
      accessorKey: "area",
      header: ({ column }) => <SortableHeader column={column} label="Area" />,
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.area ?? <span className="text-muted-foreground">—</span>}
        </span>
      ),
      enableSorting: true,
    },
    {
      id: "stepCount",
      accessorFn: (row) => stepCountByRecipe.get(row.id) ?? 0,
      header: () => (
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Steps
        </span>
      ),
      cell: ({ row }) => {
        const n = stepCountByRecipe.get(row.original.id) ?? 0;
        return (
          <span className="text-xs text-muted-foreground">
            {n} {n === 1 ? "step" : "steps"}
          </span>
        );
      },
      enableSorting: false,
    },
    {
      id: "palette",
      header: () => (
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Palette
        </span>
      ),
      cell: ({ row }) => {
        const swatches = swatchColorsByRecipe.get(row.original.id) ?? [];
        const total = swatches.length;
        if (total === 0) return <span className="text-sm text-muted-foreground">--</span>;
        return (
          <div className="flex items-center">
            {swatches.slice(0, 8).map((s, i) => (
              <span
                key={s.paint_id}
                className={`inline-block h-3 w-3 rounded-full border border-border shrink-0${i > 0 ? " -ml-1" : ""}${s.hex_color ? "" : " bg-muted"}`}
                style={s.hex_color ? { backgroundColor: s.hex_color } : undefined}
                aria-hidden="true"
              />
            ))}
            {total > 8 && (
              <span className="inline-flex items-center justify-center h-3 w-3 rounded-full bg-muted -ml-1 text-[8px] text-muted-foreground">
                +{total - 8}
              </span>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(row.original)}
            aria-label={`Edit ${row.original.name}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(row.original)}
            aria-label={`Delete ${row.original.name}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];
}
