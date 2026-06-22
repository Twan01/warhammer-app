/**
 * EditColoursDialog — Re-open slot fills for an existing technique instance.
 *
 * This is a SIBLING to SlotFillDialog (not an extension of it), so the apply
 * path in SlotFillDialog remains untouched (Plan 03 regression safety).
 *
 * Architecture:
 *   - Rendered as a sibling to the RecipeDetailSheet (NOT nested inside SheetContent).
 *   - Uses Radix Dialog portal — renders at document.body, avoids P6 pitfall.
 *   - Pre-populated via useSlotMapByInstance(instanceId).
 *   - Saves via useUpdateSlotMap with "Colours updated." / failure toasts.
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useTechniqueColourSlots } from "@/hooks/useTechniqueColourSlots";
import { useSlotMapByInstance } from "@/hooks/useSlotResolutionMap";
import { useUpdateSlotMap } from "@/hooks/useTechniqueInstances";
import { SlotFillRow } from "./SlotFillRow";

export interface EditColoursDialogProps {
  open: boolean;
  techniqueId: number | null;
  techniqueName: string;
  instanceId: number | null;
  recipeId: number;
  onClose: () => void;
}

const SCROLL_THRESHOLD = 6;

export function EditColoursDialog({
  open,
  techniqueId,
  techniqueName,
  instanceId,
  recipeId,
  onClose,
}: EditColoursDialogProps) {
  const { data: slots = [], isLoading: slotsLoading } = useTechniqueColourSlots(
    techniqueId ?? undefined,
  );
  const { data: existingSlotMap, isLoading: slotMapLoading } = useSlotMapByInstance(
    instanceId ?? undefined,
  );
  const updateSlotMap = useUpdateSlotMap();

  // Local state: Map<slotId, paintId|null>
  const [slotFills, setSlotFills] = useState<Map<number, number | null>>(new Map());
  // Track whether we have seeded from the server data
  const [seeded, setSeeded] = useState(false);

  // Seed slot fills from the existing instance map once data is ready.
  // Also initialize any slots not in the existing map to null.
  useEffect(() => {
    if (!open) {
      setSlotFills(new Map());
      setSeeded(false);
      return;
    }
    if (slotsLoading || slotMapLoading) return;
    if (seeded) return;

    const initial = new Map<number, number | null>();
    for (const slot of slots) {
      initial.set(slot.id, existingSlotMap?.get(slot.id) ?? null);
    }
    setSlotFills(initial);
    setSeeded(true);
  }, [open, slots, existingSlotMap, slotsLoading, slotMapLoading, seeded]);

  function handleSlotChange(slotId: number, paintId: number | null) {
    setSlotFills((prev) => {
      const next = new Map(prev);
      next.set(slotId, paintId);
      return next;
    });
  }

  async function handleSave() {
    if (instanceId === null) return;
    try {
      await updateSlotMap.mutateAsync({ instanceId, recipeId, slotFills });
      toast.success("Colours updated.");
      onClose();
    } catch {
      toast.error("Failed to update colours. Please try again.");
    }
  }

  const isLoading = slotsLoading || slotMapLoading;
  const hasSlots = slots.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Edit colours — {techniqueName}</DialogTitle>
          <DialogDescription>
            Update the paint assigned to each colour slot. Empty slots are allowed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {isLoading ? (
            <>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </>
          ) : !hasSlots ? (
            <p className="py-2 text-sm text-muted-foreground">
              This technique has no colour slots — it was applied with fixed paints.
            </p>
          ) : slots.length > SCROLL_THRESHOLD ? (
            <ScrollArea className="max-h-80">
              <div className="flex flex-col gap-2 pr-1">
                {slots.map((slot) => (
                  <SlotFillRow
                    key={slot.id}
                    slot={slot}
                    paintId={slotFills.get(slot.id) ?? null}
                    onChange={(paintId) => handleSlotChange(slot.id, paintId)}
                  />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col gap-2">
              {slots.map((slot) => (
                <SlotFillRow
                  key={slot.id}
                  slot={slot}
                  paintId={slotFills.get(slot.id) ?? null}
                  onChange={(paintId) => handleSlotChange(slot.id, paintId)}
                />
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateSlotMap.isPending || isLoading}>
            {updateSlotMap.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            Save colours
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
