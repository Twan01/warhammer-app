import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
} from "@/components/ui/table";
import { useFactions } from "@/hooks/useFactions";
import type { Faction } from "@/types/faction";
import { FactionRow } from "./FactionRow";
import { FactionSheet } from "./FactionSheet";
import { FactionDeleteDialog } from "./FactionDeleteDialog";
import { FactionsEmptyState } from "./FactionsEmptyState";

export function FactionsPage() {
  const { data: factions, isLoading, isError } = useFactions();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Faction | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<Faction | null>(null);

  const openCreate = () => {
    setEditing(null);
    setSheetOpen(true);
  };
  const openEdit = (faction: Faction) => {
    setEditing(faction);
    setSheetOpen(true);
  };
  const closeSheet = () => {
    setSheetOpen(false);
    setEditing(null);
  };
  const openDelete = (faction: Faction) => {
    setDeleting(faction);
    setDialogOpen(true);
  };
  const closeDialog = () => {
    setDialogOpen(false);
    setDeleting(null);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Factions</h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Faction
        </Button>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive">
          Failed to load factions. Try refreshing.
        </p>
      )}

      {!isLoading && !isError && (factions?.length ?? 0) === 0 && (
        <FactionsEmptyState onAdd={openCreate} />
      )}

      {!isLoading && !isError && (factions?.length ?? 0) > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Game System</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {factions!.map((faction) => (
              <FactionRow
                key={faction.id}
                faction={faction}
                onEdit={openEdit}
                onDelete={openDelete}
              />
            ))}
          </TableBody>
        </Table>
      )}

      {/* POLISH-04 / Pitfall 3: key forces a fresh mount when switching between create/edit modes
          and between different factions. */}
      <FactionSheet
        key={editing?.id ?? "new"}
        open={sheetOpen}
        faction={editing}
        onClose={closeSheet}
      />

      <FactionDeleteDialog
        key={deleting?.id ?? "none"}
        open={dialogOpen}
        faction={deleting}
        onClose={closeDialog}
      />
    </div>
  );
}
