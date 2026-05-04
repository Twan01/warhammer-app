import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaintsEmptyStateProps {
  onAdd: () => void;
}

export function PaintsEmptyState({ onAdd }: PaintsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="rounded-xl bg-muted/40 p-4">
        <Palette className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold">No paints yet</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Add the paints you own to link them to recipes and track what you're running low on.
        </p>
      </div>
      <Button className="mt-2" onClick={onAdd}>Add paint</Button>
    </div>
  );
}
