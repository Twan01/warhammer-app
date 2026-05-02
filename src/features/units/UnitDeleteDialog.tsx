import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeleteUnit } from "@/hooks/useUnits";
import { getArmyListsByUnitId } from "@/db/queries/armyLists";
import type { Unit } from "@/types/unit";

interface UnitDeleteDialogProps {
  open: boolean;
  unit: Unit | null;
  onClose: () => void;
}

/**
 * UnitDeleteDialog — enhanced for ARMY-05.
 *
 * Two states:
 *   1. Normal (unit in 0 lists): existing single-step "Delete unit?" confirm.
 *      Preserved to keep CollectionPage working unchanged.
 *   2. Warning (unit in N lists): two-step flow. Title + body name the lists,
 *      destructive button labelled "Delete Anyway" — DB cascade handles
 *      army_list_units cleanup automatically (ON DELETE CASCADE in 001_core_schema.sql).
 *
 * The membership query runs only when open && unit !== null (enabled flag).
 */
export function UnitDeleteDialog({ open, unit, onClose }: UnitDeleteDialogProps) {
  const deleteUnit = useDeleteUnit();

  const { data: memberLists = [] } = useQuery({
    queryKey: ["unit-army-lists", unit?.id ?? "none"],
    queryFn: () => (unit ? getArmyListsByUnitId(unit.id) : Promise.resolve([])),
    enabled: open && unit !== null,
  });

  const isInLists = memberLists.length > 0;

  async function handleConfirm() {
    if (!unit) return;
    try {
      await deleteUnit.mutateAsync(unit.id);
      toast.success("Unit deleted.");
      onClose();
    } catch {
      toast.error("Something went wrong. Please try again.");
      onClose();
    }
  }

  // Build the body copy for the warning state per UI-SPEC §Copywriting Contract:
  //   `"{unit.name}" is in {N} army list(s): {names}. Deleting it will also remove it from those lists.`
  const warningBody = unit
    ? `"${unit.name}" is in ${memberLists.length} army list${memberLists.length === 1 ? "" : "s"}: ${memberLists.map((l) => l.name).join(", ")}. Deleting it will also remove it from those lists.`
    : "";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        {isInLists ? (
          <>
            <DialogHeader>
              <DialogTitle>This unit is in active army lists</DialogTitle>
              <DialogDescription>{warningBody}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={onClose}>Keep Unit</Button>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={deleteUnit.isPending}
              >
                Delete Anyway
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Delete unit?</DialogTitle>
              <DialogDescription>
                {unit
                  ? `This will permanently delete "${unit.name}".`
                  : "Delete the selected unit?"}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={onClose}>Keep Unit</Button>
              <Button variant="destructive" onClick={handleConfirm} disabled={deleteUnit.isPending}>
                Delete
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
