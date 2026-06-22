/**
 * SlotReassignMiniDialog — single-slot focused paint reassign in Painting Mode.
 *
 * Inline slot fill without leaving Painting Mode.
 * Single-slot variant of EditColoursDialog — no scroll area, max-w-xs.
 * Rendered as a sibling to PaintingModeView (NOT nested inside SheetContent) to
 * avoid P6 Radix portal clipping.
 */
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
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
import { useTechniqueColourSlots } from "@/hooks/useTechniqueColourSlots";
import { useSlotMapByInstance } from "@/hooks/useSlotResolutionMap";
import { useUpdateSlotMap } from "@/hooks/useTechniqueInstances";
import { SlotFillRow } from "@/features/recipes/SlotFillRow";

export interface SlotReassignMiniDialogProps {
  open: boolean;
  instanceId: number | null;
  slotId: number | null;
  techniqueId: number | null;
  recipeId: number;
  onClose: () => void;
}

export function SlotReassignMiniDialog({
  open,
  instanceId,
  slotId,
  techniqueId,
  recipeId,
  onClose,
}: SlotReassignMiniDialogProps) {
  const { data: slots = [], isLoading: slotsLoading } = useTechniqueColourSlots(
    techniqueId ?? undefined,
  );
  const { data: existingSlotMap, isLoading: slotMapLoading } = useSlotMapByInstance(
    instanceId ?? undefined,
  );
  const updateSlotMap = useUpdateSlotMap();

  // Local state: single slot fill
  const [slotFill, setSlotFill] = useState<number | null>(null);
  // Track whether we have seeded from the server data
  const [seeded, setSeeded] = useState(false);

  // From EditColoursDialog lines 66-81 — adapted: only seed the one target slot
  useEffect(() => {
    if (!open) {
      setSlotFill(null);
      setSeeded(false);
      return;
    }
    if (slotsLoading || slotMapLoading) return;
    if (seeded) return;
    setSlotFill(existingSlotMap?.get(slotId ?? -1) ?? null);
    setSeeded(true);
  }, [open, existingSlotMap, slotsLoading, slotMapLoading, seeded, slotId]);

  // From EditColoursDialog lines 91-100 — same mutateAsync + toast pattern
  async function handleSave() {
    if (instanceId === null || slotId === null) return;
    const fills = new Map([[slotId, slotFill]]);
    try {
      await updateSlotMap.mutateAsync({ instanceId, recipeId, slotFills: fills });
      toast.success("Slot updated.");
      onClose();
    } catch {
      toast.error("Failed to update slot. Please try again.");
    }
  }

  const isLoading = slotsLoading || slotMapLoading;
  const slot = slots.find((s) => s.id === slotId);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Reassign slot colour
          </DialogTitle>
          <DialogDescription>
            Change the paint assigned to this colour slot.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 py-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading slot…</p>
          ) : slot ? (
            <SlotFillRow
              slot={slot}
              paintId={slotFill}
              onChange={(paintId) => setSlotFill(paintId)}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Slot not found.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateSlotMap.isPending || isLoading || !slot}
          >
            {updateSlotMap.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            Reassign paint
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
