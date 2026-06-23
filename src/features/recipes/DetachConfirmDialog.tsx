import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DetachConfirmDialogProps {
  open: boolean;
  techniqueName: string;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

// ---------------------------------------------------------------------------
// DetachConfirmDialog
// ---------------------------------------------------------------------------

/**
 * AlertDialog confirmation for detaching a technique from a recipe section.
 *
 * UI-SPEC copy (LOCKED):
 *   Title:      "Detach technique?"
 *   Warning:    "This breaks the live link permanently. Future edits to
 *               "{techniqueName}" won&apos;t update this recipe."
 *   Reassurance: "Your current steps and colours are kept."
 *   Cancel:     "Keep link"  (no destructive styling — outline appearance from shadcn default)
 *   Confirm:    "Detach" / "Detaching…" (destructive className, disabled while pending)
 */
export function DetachConfirmDialog({
  open,
  techniqueName,
  isPending,
  onCancel,
  onConfirm,
}: DetachConfirmDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !isPending) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Detach technique?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              <p>
                This breaks the live link permanently. Future edits to &quot;{techniqueName}&quot;
                won&apos;t update this recipe.
              </p>
              <p className="mt-2">Your current steps and colours are kept.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Keep link</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Detaching…" : "Detach"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
