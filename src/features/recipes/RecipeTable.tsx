import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PaintingRecipe } from "@/types/recipe";
import type { Faction } from "@/types/faction";
import type { Unit } from "@/types/unit";
import { buildRecipeColumns } from "./RecipeTableColumns";
import { RecipeEmptyState } from "./RecipeEmptyState";

export interface RecipeTableProps {
  data: PaintingRecipe[];
  factions: Faction[];
  units: Unit[];
  stepCountByRecipe: Map<number, number>;
  isLoading: boolean;
  onRowClick: (recipe: PaintingRecipe) => void;
  onAdd: () => void;
  onEdit: (recipe: PaintingRecipe) => void;
  onDelete: (recipe: PaintingRecipe) => void;
}

export function RecipeTable({
  data,
  factions,
  units,
  stepCountByRecipe,
  isLoading,
  onRowClick,
  onAdd,
  onEdit,
  onDelete,
}: RecipeTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);

  const factionMap = useMemo(() => {
    const m = new Map<number, Faction>();
    for (const f of factions) m.set(f.id, f);
    return m;
  }, [factions]);

  const unitMap = useMemo(() => {
    const m = new Map<number, Unit>();
    for (const u of units) m.set(u.id, u);
    return m;
  }, [units]);

  const columns = useMemo(
    () => buildRecipeColumns(factionMap, unitMap, stepCountByRecipe, onEdit, onDelete),
    [factionMap, unitMap, stepCountByRecipe, onEdit, onDelete],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={`skeleton-${i}`} data-testid="skeleton-row">
                <TableCell colSpan={columns.length}>
                  <Skeleton className="h-10 w-full" />
                </TableCell>
              </TableRow>
            ))
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length}>
                <RecipeEmptyState onAdd={onAdd} />
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onRowClick(row.original)}
                aria-label={`View ${row.original.name}`}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
