import { Star, Flag, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";

interface RuleAnnotationControlsProps {
  isFavorited: boolean;
  isReminder: boolean;
  hasNote: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onToggleReminder: (e: React.MouseEvent) => void;
}

export function RuleAnnotationControls({
  isFavorited,
  isReminder,
  hasNote,
  onToggleFavorite,
  onToggleReminder,
}: RuleAnnotationControlsProps) {
  function handleFav(e: React.MouseEvent) {
    e.stopPropagation();
    onToggleFavorite(e);
  }

  function handleReminder(e: React.MouseEvent) {
    e.stopPropagation();
    onToggleReminder(e);
  }

  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        type="button"
        onClick={handleFav}
        className="shrink-0 p-0.5 rounded hover:bg-muted"
        aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
      >
        <Star
          className={cn(
            "h-4 w-4",
            isFavorited ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"
          )}
        />
      </button>

      <button
        type="button"
        onClick={handleReminder}
        className="shrink-0 p-0.5 rounded hover:bg-muted"
        aria-label={isReminder ? "Remove Game Day reminder" : "Set as Game Day reminder"}
      >
        <Flag
          className={cn(
            "h-4 w-4",
            isReminder ? "text-blue-500 fill-blue-500" : "text-muted-foreground"
          )}
        />
      </button>

      {hasNote && (
        <StickyNote className="h-3.5 w-3.5 text-primary" />
      )}
    </div>
  );
}
