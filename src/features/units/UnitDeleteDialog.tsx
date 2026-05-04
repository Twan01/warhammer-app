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
import {
  getPhotoFilenamesByUnit,
  getPhotosByUnit,
  deleteUnitPhoto,
} from "@/db/queries/unitPhotos";
import { remove, BaseDirectory } from "@tauri-apps/plugin-fs";
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
      // JOUR-06 step 1: capture photo filenames BEFORE deleting the unit, so we
      // can clean up disk after the SQL DELETE succeeds. image_assets is polymorphic
      // (entity_type/entity_id) with no FK to units — SQL CASCADE does NOT fire,
      // so DB rows AND files must be removed explicitly. See 13-RESEARCH.md §Pitfall 4.
      const photoFilenames = await getPhotoFilenamesByUnit(unit.id).catch(() => [] as string[]);

      // JOUR-06 step 2: capture photo IDs for explicit DB row cleanup.
      // image_assets has no FK to units, so no cascade — rows must be deleted explicitly.
      let photoIds: number[] = [];
      try {
        const rows = await getPhotosByUnit(unit.id);
        photoIds = rows.map((r) => r.id);
      } catch {
        // If photos query fails, continue — we'll still delete the unit and
        // any leftover image_assets rows are orphaned but harmless (no FK to enforce).
      }

      // JOUR-06 step 3: SQL delete for the unit (other tables CASCADE per their own FKs;
      // image_assets does NOT cascade — we delete those rows explicitly next).
      await deleteUnit.mutateAsync(unit.id);

      // JOUR-06 step 4: explicit DELETE for orphaned image_assets rows (no FK = no CASCADE).
      for (const id of photoIds) {
        try {
          await deleteUnitPhoto(id);
        } catch {
          // Silent — orphaned DB rows acceptable; blocking unit delete is not.
        }
      }

      // JOUR-06 step 5: silently remove each photo file from disk.
      // Failures are swallowed — orphaned files are preferable to blocking the success path.
      for (const filename of photoFilenames) {
        try {
          await remove(filename, { baseDir: BaseDirectory.AppData });
        } catch {
          // Silent — file may already be missing or locked.
        }
      }

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
