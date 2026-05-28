import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  PAINTING_STATUS_TIER,
  TIER_DOT_CLASS,
} from "@/components/ui/status-badge";
import { useUnitsEnriched } from "@/hooks/useUnits";
import { useAddUnitToList } from "@/hooks/useArmyLists";
import { computeUnitReadiness } from "@/lib/readiness";

interface UnitPickerDialogProps {
  open: boolean;
  listId: number | null;
  factionId: number | null;
  remaining?: number | null;
  pointsLimit?: number | null;
  onClose: () => void;
}

export function UnitPickerDialog({
  open,
  listId,
  factionId,
  remaining = null,
  pointsLimit = null,
  onClose,
}: UnitPickerDialogProps) {
  const { data: units = [] } = useUnitsEnriched();
  const addUnitToList = useAddUnitToList();
  const [fitsBudget, setFitsBudget] = useState(false);

  const hasBudget = pointsLimit != null;

  const filteredUnits = factionId === null
    ? units
    : units.filter((u) => u.faction_id === factionId);

  const displayUnits =
    fitsBudget && remaining != null
      ? filteredUnits.filter((u) => u.effective_points <= remaining)
      : filteredUnits;

  function handleSelect(unitId: number) {
    if (listId === null) return;
    addUnitToList.mutate(
      { list_id: listId, unit_id: unitId },
      {
        onSuccess: () => {
          toast.success("Unit added.");
        },
        onError: (err) => {
          console.error("[UnitPickerDialog] Failed to add unit:", err);
          toast.error("Failed to add unit. Please try again.");
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="p-0 sm:max-w-[480px]">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Add unit to list</DialogTitle>
          <DialogDescription>
            {factionId === null
              ? "Search any unit in your collection. Click to add — picker stays open for multiple adds."
              : "Search units in this list's faction. Click to add — picker stays open for multiple adds."}
          </DialogDescription>
        </DialogHeader>
        {hasBudget && (
          <div className="flex items-center justify-between px-4 pb-2">
            <span
              className={`text-sm font-semibold ${remaining != null && remaining <= 0 ? "text-destructive" : "text-muted-foreground"}`}
            >
              {remaining ?? 0} pts remaining
            </span>
            <div className="flex items-center gap-2">
              <Checkbox
                id="fits-budget"
                checked={fitsBudget}
                onCheckedChange={(v) => setFitsBudget(v === true)}
              />
              <label htmlFor="fits-budget" className="text-sm cursor-pointer">
                Fits budget
              </label>
            </div>
          </div>
        )}
        <TooltipProvider>
          <Command>
            <CommandInput placeholder="Search units..." />
            <CommandList>
              <CommandEmpty>
                {units.length === 0
                  ? "No units in your collection yet. Add units on the Collection page first."
                  : fitsBudget && remaining != null
                    ? "No units fit the remaining budget."
                    : "No units found in this faction."}
              </CommandEmpty>
              <CommandGroup>
                {displayUnits.map((unit) => {
                  const readiness = computeUnitReadiness(unit);
                  const paintingTier = PAINTING_STATUS_TIER[unit.status_painting];

                  return (
                    <CommandItem
                      key={unit.id}
                      value={`${unit.name}-${unit.id}`}
                      onSelect={() => handleSelect(unit.id)}
                    >
                      <span className="flex-1 truncate">{unit.name}</span>
                      <span
                        className={`text-sm tabular-nums shrink-0 ${
                          !fitsBudget && remaining != null && unit.effective_points > remaining
                            ? "text-muted-foreground/50"
                            : "text-muted-foreground"
                        }`}
                      >
                        {unit.effective_points > 0 ? `${unit.effective_points} pts` : "— pts"}
                      </span>
                      {readiness.battleReady ? (
                        <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/25 text-xs shrink-0">
                          Battle Ready
                        </Badge>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-1 shrink-0">
                              <span className={`h-1.5 w-1.5 rounded-full ${TIER_DOT_CLASS[paintingTier]}`} />
                              <span className={`h-1.5 w-1.5 rounded-full ${readiness.assembled ? "bg-emerald-400" : "bg-muted-foreground/40"}`} />
                              <span className={`h-1.5 w-1.5 rounded-full ${readiness.based ? "bg-emerald-400" : "bg-muted-foreground/40"}`} />
                              <span className={`h-1.5 w-1.5 rounded-full ${readiness.varnished ? "bg-emerald-400" : "bg-muted-foreground/40"}`} />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs leading-relaxed">
                              <div>Painting: {unit.status_painting}</div>
                              <div>Assembled: {readiness.assembled ? "Yes" : "No"}</div>
                              <div>Based: {readiness.based ? "Yes" : "No"}</div>
                              <div>Varnished: {readiness.varnished ? "Yes" : "No"}</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {unit.category && (
                        <Badge variant="secondary" className="shrink-0">
                          {unit.category}
                        </Badge>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
