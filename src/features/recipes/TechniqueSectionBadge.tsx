import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface TechniqueSectionBadgeProps {
  techniqueName: string;
  /**
   * When provided (detail view, Plan 04), the badge is wrapped in a button
   * that triggers navigation to the technique in the library tab.
   * When absent (editor view), the badge is display-only (non-interactive).
   */
  onNavigate?: () => void;
}

/**
 * "from {techniqueName}" badge displayed on technique-owned recipe sections.
 *
 * - In the recipe editor: display-only (onNavigate omitted).
 * - In RecipeDetailSheet (Plan 04): interactive — onNavigate wraps badge in a button.
 */
export function TechniqueSectionBadge({
  techniqueName,
  onNavigate,
}: TechniqueSectionBadgeProps) {
  const badge = (
    <Badge variant="secondary" className="max-w-[200px] truncate text-xs">
      <BookOpen className="mr-1 h-3 w-3" aria-hidden="true" />
      from {techniqueName}
    </Badge>
  );

  if (onNavigate) {
    return (
      <button
        type="button"
        onClick={onNavigate}
        aria-label={`View technique ${techniqueName} in library`}
        className="flex items-center"
      >
        {badge}
      </button>
    );
  }

  return badge;
}
