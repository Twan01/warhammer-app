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
import { usePaints } from "@/hooks/usePaints";
import type { Paint } from "@/types/paint";
import { PaintRow } from "./PaintRow";
import { PaintSheet } from "./PaintSheet";
import { PaintDeleteDialog } from "./PaintDeleteDialog";
import { PaintsEmptyState } from "./PaintsEmptyState";

export function PaintsPage() {
  const { data: paints, isLoading, isError } = usePaints();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Paint | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<Paint | null>(null);

  const openCreate = () => { setEditing(null); setSheetOpen(true); };
  const openEdit = (paint: Paint) => { setEditing(paint); setSheetOpen(true); };
  const closeSheet = () => { setSheetOpen(false); setEditing(null); };
  const openDelete = (paint: Paint) => { setDeleting(paint); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setDeleting(null); };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Paints</h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Paint
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
        <p className="text-sm text-destructive">Failed to load paints. Try refreshing.</p>
      )}

      {!isLoading && !isError && (paints?.length ?? 0) === 0 && (
        <PaintsEmptyState onAdd={openCreate} />
      )}

      {!isLoading && !isError && (paints?.length ?? 0) > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Owned</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paints!.map((paint) => (
              <PaintRow key={paint.id} paint={paint} onEdit={openEdit} onDelete={openDelete} />
            ))}
          </TableBody>
        </Table>
      )}

      {/* POLISH-04 / Pitfall 3: key forces fresh mount when switching between create/edit modes */}
      <PaintSheet
        key={editing?.id ?? "new"}
        open={sheetOpen}
        paint={editing}
        onClose={closeSheet}
      />
      <PaintDeleteDialog
        key={deleting?.id ?? "none"}
        open={dialogOpen}
        paint={deleting}
        onClose={closeDialog}
      />
    </div>
  );
}
