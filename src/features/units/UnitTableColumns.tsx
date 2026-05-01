import type { ColumnDef, Column } from "@tanstack/react-table";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Flame,
  Pencil,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";
import { StatusPopover } from "./StatusPopover";

function SortableHeader<T>({
  column,
  label,
}: {
  column: Column<T, unknown>;
  label: string;
}) {
  const sorted = column.getIsSorted();
  return (
    <button
      type="button"
      className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground"
      onClick={() => column.toggleSorting(sorted === "asc")}
      aria-label={`Sort by ${label}${sorted === "asc" ? " (A–Z)" : sorted === "desc" ? " (Z–A)" : ""}`}
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

export function buildColumns(
  factionMap: Map<number, Faction>,
  onDelete: (unit: Unit) => void,
  onEdit: (unit: Unit) => void,
  onToggleActive: (unit: Unit) => void,
): ColumnDef<Unit>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => <SortableHeader column={column} label="Name" />,
      cell: ({ row }) => <span className="text-sm">{row.original.name}</span>,
    },
    {
      id: "faction",
      accessorFn: (row) => factionMap.get(row.faction_id)?.name ?? "",
      header: ({ column }) => <SortableHeader column={column} label="Faction" />,
      cell: ({ row }) => {
        const faction = factionMap.get(row.original.faction_id);
        if (!faction) return null;
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
      accessorKey: "category",
      header: () => (
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Category
        </span>
      ),
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.category ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "status_painting",
      header: ({ column }) => <SortableHeader column={column} label="Status" />,
      cell: ({ row }) => <StatusPopover unit={row.original} />,
      enableSorting: true,
    },
    {
      accessorKey: "painting_percentage",
      header: () => (
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Progress
        </span>
      ),
      enableSorting: false,
      cell: ({ row }) => (
        <Progress
          value={row.original.painting_percentage}
          className="h-2 w-20"
          aria-label={`${row.original.painting_percentage}% painted`}
        />
      ),
    },
    {
      accessorKey: "points",
      header: ({ column }) => <SortableHeader column={column} label="Points" />,
      cell: ({ row }) => (
        <span className="text-sm">{row.original.points ?? "—"}</span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "model_count",
      header: ({ column }) => <SortableHeader column={column} label="Models" />,
      cell: ({ row }) => (
        <span className="text-sm">{row.original.model_count ?? "—"}</span>
      ),
      enableSorting: true,
    },
    {
      id: "active",
      accessorKey: "is_active_project",
      header: () => (
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Active
        </span>
      ),
      enableSorting: false,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            onToggleActive(row.original);
          }}
          aria-label={
            row.original.is_active_project
              ? `Remove ${row.original.name} from active projects`
              : `Mark ${row.original.name} as active project`
          }
        >
          <Flame
            className={cn(
              "h-4 w-4",
              row.original.is_active_project ? "text-primary" : "text-muted-foreground/40",
            )}
            aria-hidden="true"
          />
        </Button>
      ),
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
