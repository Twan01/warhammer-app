import { BookOpen, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ArmyListQuickAddProps {
  quickAddSearch: string;
  setQuickAddSearch: (v: string) => void;
  quickAddResults: Array<{ type: "collection"; id: number; name: string; category: string | null; points: number | null }>;
  onAdd: (unitId: number) => void;
  onOpenUnitPicker: () => void;
  onOpenDatasheetBrowser: () => void;
}

export function ArmyListQuickAdd({
  quickAddSearch,
  setQuickAddSearch,
  quickAddResults,
  onAdd,
  onOpenUnitPicker,
  onOpenDatasheetBrowser,
}: ArmyListQuickAddProps) {
  return (
    <>
      {/* Inline quick-add search */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Units</span>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onOpenUnitPicker}>
            <Plus className="mr-2 h-4 w-4" /> Add Unit
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onOpenDatasheetBrowser}>
            <BookOpen className="mr-2 h-4 w-4" /> Browse Datasheets
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Quick add — search units by name..."
          value={quickAddSearch}
          onChange={(e) => setQuickAddSearch(e.target.value)}
          className="pl-9"
        />
        {quickAddResults.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
            {quickAddResults.map((r) => (
              <button
                key={r.id}
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent text-left"
                onClick={() => onAdd(r.id)}
              >
                <span>{r.name}</span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  {r.category && <Badge variant="secondary" className="text-xs">{r.category}</Badge>}
                  {r.points != null && <span>{r.points}pts</span>}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
