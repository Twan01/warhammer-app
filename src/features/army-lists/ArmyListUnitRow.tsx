import { useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUpdateArmyListUnit } from "@/hooks/useArmyLists";
import type { ArmyListUnitRow as ArmyListUnitRowType } from "@/types/armyList";

interface ArmyListUnitRowProps {
  unit: ArmyListUnitRowType;
  onRemove: () => void;
}

/**
 * ARMY-03, ARMY-04 — One unit row inside ArmyListDetailSheet's unit table.
 *
 * Layout (UI-SPEC §ArmyListDetailSheet, in this exact column order):
 *   1. Unit name
 *   2. Painting status badge
 *   3. Points override (inline number Input — saves on blur or Enter)
 *   4. Notes expand toggle (ChevronDown/Up icon)
 *   5. Remove button (Trash2 ghost icon)
 *
 * Critical contract (Pitfall 2): updateArmyListUnit is full-replacement, NOT
 * COALESCE. Every save MUST pass BOTH points_override AND notes — otherwise
 * the un-passed field is overwritten with undefined.
 */
export function ArmyListUnitRow({ unit, onRemove }: ArmyListUnitRowProps) {
  const updateArmyListUnit = useUpdateArmyListUnit();
  const [expanded, setExpanded] = useState(false);
  const [notesDraft, setNotesDraft] = useState(unit.notes ?? "");

  function handlePointsBlur(rawValue: string) {
    const numeric = rawValue === "" ? null : Number(rawValue);
    if (Number.isNaN(numeric)) return; // ignore garbage input
    // Only call mutate if the value actually changed
    if (numeric === unit.points_override) return;
    updateArmyListUnit.mutate(
      {
        id: unit.id,
        list_id: unit.list_id,
        points_override: numeric,
        notes: unit.notes,           // Pitfall 2 — preserve current notes
      },
      {
        onError: () => toast.error("Failed to update points. Please try again."),
      },
    );
  }

  function handleNotesSave() {
    if (notesDraft === (unit.notes ?? "")) {
      // No change — close inline area without a network call
      setExpanded(false);
      return;
    }
    updateArmyListUnit.mutate(
      {
        id: unit.id,
        list_id: unit.list_id,
        points_override: unit.points_override, // Pitfall 2 — preserve current override
        notes: notesDraft === "" ? null : notesDraft,
      },
      {
        onSuccess: () => {
          toast.success("Unit notes saved.");
          setExpanded(false);
        },
        onError: () => toast.error("Failed to save notes. Please try again."),
      },
    );
  }

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">{unit.unit_name}</TableCell>

        <TableCell>
          <Badge variant="secondary">{unit.status_painting}</Badge>
        </TableCell>

        <TableCell>
          <Input
            type="number"
            min={0}
            className="w-20 h-7 text-sm"
            placeholder={unit.unit_points !== null ? String(unit.unit_points) : "—"}
            defaultValue={unit.points_override ?? ""}
            onBlur={(e) => handlePointsBlur(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
            }}
            aria-label={`Points override for ${unit.unit_name}`}
          />
        </TableCell>

        <TableCell>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse notes" : "Expand notes"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </TableCell>

        <TableCell className="text-right">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onRemove}
            aria-label="Remove unit from list"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow>
          <TableCell colSpan={5} className="bg-muted/20">
            <div className="flex items-end gap-2 py-2">
              <textarea
                className="flex min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Notes for this unit in this list..."
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                aria-label={`Notes for ${unit.unit_name}`}
              />
              <Button
                type="button"
                size="sm"
                onClick={handleNotesSave}
                disabled={updateArmyListUnit.isPending}
              >
                Save
              </Button>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
