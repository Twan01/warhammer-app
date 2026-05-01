/**
 * DASH-08 — Empty state shown when stats.hasUnits === false.
 * Layout/copy mirrors CollectionEmptyState pattern (Phase 3) for consistency.
 */
import { PackageSearch } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function DashboardEmptyState() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <PackageSearch className="h-12 w-12 text-muted-foreground" />
      <p className="text-base font-semibold">Your collection is empty</p>
      <p className="text-sm text-muted-foreground">
        Add units to your collection to start tracking your hobby progress.
      </p>
      <Button onClick={() => navigate({ to: "/collection" })}>Go to Collection</Button>
    </div>
  );
}
