/**
 * Phase 138-02 — PLAY-01: Sticky "Compare (N)" action bar for the Unit Database browser.
 *
 * Appears at the bottom of DatabaseBrowserPage when compareIds.size >= 1.
 * Disappears when compareIds is empty.
 */
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useDatabaseBrowserFilters } from "./databaseBrowserFilters";

export function UnitCompareActionBar() {
  const { compareIds, clearCompare } = useDatabaseBrowserFilters();
  const navigate = useNavigate();

  if (compareIds.size === 0) return null;

  const count = compareIds.size;

  return (
    <div className="sticky bottom-0 z-10 bg-card border-t border-border/60 shadow-lg px-4 py-3 flex items-center justify-between">
      <p className="text-sm font-medium">
        {count} unit{count !== 1 ? "s" : ""} selected
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={clearCompare}>
          Clear
        </Button>
        <Button
          variant="default"
          size="sm"
          disabled={compareIds.size < 2}
          onClick={() => navigate({ to: "/unit-database/compare" })}
        >
          Compare ({count})
        </Button>
      </div>
    </div>
  );
}
