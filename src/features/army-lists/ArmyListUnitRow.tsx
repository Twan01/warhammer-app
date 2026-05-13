import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateArmyListUnit } from "@/hooks/useArmyLists";
import { useUnitPointTiers } from "@/hooks/useUnitPointTiers";
import { useUnitLoadouts } from "@/hooks/useUnitLoadouts";
import { useUpdateUnit } from "@/hooks/useUnits";
import { computeDelta } from "@/lib/computeDelta";
import type { ArmyListUnitRow as ArmyListUnitRowType } from "@/types/armyList";

interface ArmyListUnitRowProps {
  unit: ArmyListUnitRowType;
  onRemove: () => void;
}

/**
 * ARMY-03, ARMY-04 — One unit row inside ArmyListDetailSheet's unit table.
 *
 * Layout (UI-SPEC §ArmyListDetailSheet, in this exact column order):
 *   1. Unit name (+ active loadout name below if set)
 *   2. Painting status badge
 *   3. Points override (inline number Input — saves on blur or Enter)
 *      + tier selector + delta badge (Phase 24)
 *   4. Notes expand toggle (ChevronDown/Up icon)
 *   5. Remove button (Trash2 ghost icon)
 *
 * Critical contract (Pitfall 2): updateArmyListUnit is full-replacement, NOT
 * COALESCE. Every save MUST pass BOTH points_override AND notes — otherwise
 * the un-passed field is overwritten with undefined.
 *
 * Phase 24 additions:
 * - Tier selector (Select) when unit has point tiers — shows model count + pts per tier
 * - Delta badge (+N red / -N green) when a different tier is previewed
 * - Confirm button writes to units.points via useUpdateUnit (not army_list_units)
 * - Active loadout name displayed below unit name (subtle muted text)
 * - Pitfall 5: setPendingTierId(null) on confirm clears badge immediately
 */
export function ArmyListUnitRow({ unit, onRemove }: ArmyListUnitRowProps) {
  const updateArmyListUnit = useUpdateArmyListUnit();
  const updateUnit = useUpdateUnit();
  const [expanded, setExpanded] = useState(false);
  const [notesDraft, setNotesDraft] = useState(unit.notes ?? "");
  const [pendingTierId, setPendingTierId] = useState<number | null>(null);

  const { data: tiers } = useUnitPointTiers(unit.unit_id);
  const { data: loadouts } = useUnitLoadouts(unit.unit_id);

  const hasTiers = (tiers?.length ?? 0) > 0;
  const activeLoadout = loadouts?.find((l) => l.is_active === 1);

  const candidatePoints = useMemo(() => {
    if (pendingTierId === null) return null;
    const tier = tiers?.find((t) => t.id === pendingTierId);
    return tier?.points ?? null;
  }, [pendingTierId, tiers]);

  const delta = computeDelta(candidatePoints, unit.effective_points);

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
        tactical_role: unit.tactical_role, // Pitfall 2 — preserve current role
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
        tactical_role: unit.tactical_role, // Pitfall 2 — preserve current role
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
        <TableCell className="font-medium">
          {unit.unit_name}
          {activeLoadout && (
            <span className="text-xs text-muted-foreground block">
              {activeLoadout.name}
            </span>
          )}
        </TableCell>

        <TableCell className="space-x-1">
          <Badge variant="secondary">{unit.status_painting}</Badge>
          {unit.status_assembly === 1 && (
            <Badge variant="outline">Assembled</Badge>
          )}
        </TableCell>

        <TableCell>
          <div className="flex items-center gap-1.5">
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
            {delta !== 0 && (
              <Badge
                variant="outline"
                className={
                  delta > 0
                    ? "text-destructive border-destructive ml-1.5"
                    : "text-green-600 border-green-600 ml-1.5"
                }
              >
                {delta > 0 ? `+${delta}` : `${delta}`}
              </Badge>
            )}
          </div>
          {hasTiers && (
            <div className="flex items-center gap-1.5 mt-1">
              <Select
                value={pendingTierId !== null ? String(pendingTierId) : ""}
                onValueChange={(val) => setPendingTierId(val ? Number(val) : null)}
              >
                <SelectTrigger className="w-28 h-7 text-xs">
                  <SelectValue placeholder="Tier..." />
                </SelectTrigger>
                <SelectContent>
                  {tiers!.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.model_count} models = {t.points}pts
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {pendingTierId !== null && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={updateUnit.isPending}
                  onClick={() => {
                    const tier = tiers!.find((t) => t.id === pendingTierId);
                    if (!tier) return;
                    updateUnit.mutate(
                      { id: unit.unit_id, points: tier.points },
                      {
                        onSuccess: () => {
                          setPendingTierId(null); // Pitfall 5: clear pending to hide badge
                          toast.success(`Points updated to ${tier.points} pts`);
                        },
                        onError: () => toast.error("Failed to update points"),
                      },
                    );
                  }}
                >
                  Confirm
                </Button>
              )}
            </div>
          )}
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
