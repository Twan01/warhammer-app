/**
 * SlotFillDialog — Assign paints to technique colour slots, then call applyTechnique.
 *
 * Architecture:
 *   - Rendered as a SIBLING to the recipe editor Sheet (NOT inside SheetContent -- P6 pitfall).
 *   - Uses Radix Dialog portal so it renders at document.body level regardless.
 *   - SLOT-05: empty/unassigned slots are valid — NO validation gate blocking apply.
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
import { useApplyTechnique } from "@/hooks/useTechniqueInstances";
import { usePaints } from "@/hooks/usePaints";
import { PaintSheet } from "@/features/paints/PaintSheet";
import { SlotFillRow } from "./SlotFillRow";
import type { TechniqueWithCounts } from "@/types/technique";

export interface SlotFillDialogProps {
  open: boolean;
  technique: TechniqueWithCounts | null;
  recipeId: number;
  insertAfterSectionIndex: number;
  onClose: () => void;
  onBack: () => void;
}

export function SlotFillDialog({
  open,
  technique,
  recipeId,
  insertAfterSectionIndex,
  onClose,
  onBack,
}: SlotFillDialogProps) {
  const { data: slots = [], isLoading: slotsLoading } = useTechniqueColourSlots(technique?.id);
  const { data: paints = [] } = usePaints();
  const applyTechnique = useApplyTechnique();

  // Map from slot id to selected paint id (null = unassigned, valid per SLOT-05)
  const [slotFills, setSlotFills] = useState<Map<number, number | null>>(new Map());

  // Inline "create a new paint" flow (TECH-UX-02) — mirrors RecipeFormSheet PAINT-03.
  const [paintSheetOpen, setPaintSheetOpen] = useState(false);
  const [paintsBeforeCreate, setPaintsBeforeCreate] = useState<number[]>([]);
  const [pendingSlotId, setPendingSlotId] = useState<number | null>(null);

  function openInlinePaintCreate(slotId: number) {
    setPaintsBeforeCreate(paints.map((p) => p.id));
    setPendingSlotId(slotId);
    setPaintSheetOpen(true);
  }

  // After the PaintSheet closes, assign the newly-created paint to the slot that triggered it.
  useEffect(() => {
    if (paintSheetOpen) return;
    if (pendingSlotId === null) return;
    const newPaint = paints.find((p) => !paintsBeforeCreate.includes(p.id));
    if (newPaint) {
      handleSlotChange(pendingSlotId, newPaint.id);
    }
    setPendingSlotId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paintSheetOpen, paints.length]);

  // Reset slot fills when dialog opens or slots change
  useEffect(() => {
    if (open && slots.length > 0) {
      setSlotFills(new Map(slots.map((s) => [s.id, null])));
    }
  }, [open, slots]);

  // Also reset when closed
  useEffect(() => {
    if (!open) {
      setSlotFills(new Map());
    }
  }, [open]);

  function handleSlotChange(slotId: number, paintId: number | null) {
    setSlotFills((prev) => {
      const next = new Map(prev);
      next.set(slotId, paintId);
      return next;
    });
  }

  async function handleApply() {
    if (!technique) return;
    try {
      await applyTechnique.mutateAsync({
        recipeId,
        techniqueId: technique.id,
        insertAfterSectionIndex,
        slotFills,
      });
      toast.success("Technique applied.");
      onClose();
    } catch {
      toast.error("Failed to apply technique. Please try again.");
    }
  }

  const titleText = technique ? `Fill colour slots — ${technique.name}` : "Fill colour slots";
  const hasSlots = slots.length > 0;
  const SCROLL_THRESHOLD = 6;

  return (
    <>
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{titleText}</DialogTitle>
          <DialogDescription>
            Assign a paint to each slot. You can leave slots empty and fill them later.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {slotsLoading ? (
            <>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </>
          ) : !hasSlots ? (
            <p className="py-2 text-sm text-muted-foreground">
              This technique has no colour slots &mdash; it will be applied as-is. To map
              paints per recipe, add colour slots when editing the technique.
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
                    onCreateNew={() => openInlinePaintCreate(slot.id)}
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
          <Button variant="outline" onClick={onBack}>
            Back to picker
          </Button>
          <Button
            onClick={handleApply}
            disabled={applyTechnique.isPending}
          >
            {applyTechnique.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            Apply technique
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      {/* Stacked PaintSheet for inline create (TECH-UX-02) */}
      <PaintSheet
        open={paintSheetOpen}
        paint={null}
        onClose={() => setPaintSheetOpen(false)}
      />
    </>
  );
}
