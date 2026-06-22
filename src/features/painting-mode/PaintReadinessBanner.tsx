import { AlertTriangle, Circle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface MissingPaint {
  id: number;
  name: string;
  brand: string;
}

interface PaintReadinessBannerProps {
  missingPaints: MissingPaint[];
  onDismiss: () => void;
  unfilledSlotCount?: number;
}

export function PaintReadinessBanner({
  missingPaints,
  onDismiss,
  unfilledSlotCount,
}: PaintReadinessBannerProps) {
  if (missingPaints.length === 0 && !unfilledSlotCount) {
    return null;
  }

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg mx-6 mt-4 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {missingPaints.length > 0 && (
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-base">
                Some paints are not in your inventory:{" "}
                <span className="font-semibold">
                  {missingPaints.map((p) => `${p.brand} ${p.name}`).join(", ")}
                </span>
              </p>
            </div>
          )}
          {unfilledSlotCount && unfilledSlotCount > 0 ? (
            <>
              {missingPaints.length > 0 && <Separator className="my-2" />}
              <div className="flex items-center gap-3">
                <Circle
                  className="h-4 w-4 text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
                <p className="text-base text-muted-foreground">
                  {unfilledSlotCount === 1
                    ? "1 colour slot unfilled"
                    : `${unfilledSlotCount} colour slots unfilled`}
                </p>
              </div>
            </>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label="Dismiss banner"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
