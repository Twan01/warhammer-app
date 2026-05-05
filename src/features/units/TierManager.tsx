import { useState } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUnitPointTiers, useUpsertUnitPointTier, useDeleteUnitPointTier } from "@/hooks/useUnitPointTiers";
import { useUnit, useUpdateUnit } from "@/hooks/useUnits";

const SECTION_LABEL_CLASS =
  "text-xs font-semibold text-muted-foreground uppercase tracking-wide";

interface TierManagerProps {
  unitId: number;
}

export function TierManager({ unitId }: TierManagerProps) {
  const { data: tiers = [] } = useUnitPointTiers(unitId);
  const { data: unit } = useUnit(unitId);
  const upsertTier = useUpsertUnitPointTier();
  const deleteTier = useDeleteUnitPointTier();
  const updateUnit = useUpdateUnit();

  const [newModelCount, setNewModelCount] = useState<string>("");
  const [newPoints, setNewPoints] = useState<string>("");

  function handleAdd() {
    const mc = parseInt(newModelCount, 10);
    const pts = parseInt(newPoints, 10);
    if (!newModelCount || !newPoints || !Number.isInteger(mc) || !Number.isInteger(pts) || mc < 0 || pts < 0) {
      toast.error("Enter valid positive integers for model count and points.");
      return;
    }
    upsertTier.mutate(
      { unit_id: unitId, model_count: mc, points: pts },
      {
        onSuccess: () => {
          setNewModelCount("");
          setNewPoints("");
        },
        onError: (err) => {
          toast.error(`Failed to add tier: ${err.message}`);
        },
      },
    );
  }

  function handleDelete(id: number) {
    deleteTier.mutate(
      { id, unitId },
      {
        onError: (err) => {
          toast.error(`Failed to delete tier: ${err.message}`);
        },
      },
    );
  }

  function handleSetActive(points: number) {
    updateUnit.mutate(
      { id: unitId, points },
      {
        onSuccess: () => {
          toast.success(`Points updated to ${points} pts`);
        },
        onError: (err) => {
          toast.error(`Failed to update points: ${err.message}`);
        },
      },
    );
  }

  const activeModelCount = unit?.model_count ?? null;

  return (
    <div className="flex flex-col gap-2">
      <span className={SECTION_LABEL_CLASS}>Point Tiers</span>

      {tiers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No point tiers defined. Add tiers for different model counts.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Model Count</TableHead>
              <TableHead className="text-xs">Points</TableHead>
              <TableHead className="text-xs w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tiers.map((tier) => {
              const isActiveTier = activeModelCount !== null && tier.model_count === activeModelCount;
              return (
                <TableRow key={tier.id}>
                  <TableCell className="text-sm font-medium tabular-nums">
                    <span className="flex items-center gap-1.5">
                      {tier.model_count}
                      {isActiveTier && (
                        <Check className="h-3.5 w-3.5 text-green-500 shrink-0" aria-label="Active tier" />
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">{tier.points}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => handleSetActive(tier.points)}
                        disabled={updateUnit.isPending}
                      >
                        Set Active
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        aria-label="Delete tier"
                        onClick={() => handleDelete(tier.id)}
                        disabled={deleteTier.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Add row */}
      <div className="flex items-center gap-2 mt-1">
        <Input
          type="number"
          min={0}
          placeholder="Models"
          value={newModelCount}
          onChange={(e) => setNewModelCount(e.target.value)}
          className="w-20 h-7 text-sm"
          aria-label="New tier model count"
        />
        <Input
          type="number"
          min={0}
          placeholder="Points"
          value={newPoints}
          onChange={(e) => setNewPoints(e.target.value)}
          className="w-20 h-7 text-sm"
          aria-label="New tier points"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7 shrink-0"
          aria-label="Add tier"
          onClick={handleAdd}
          disabled={upsertTier.isPending}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
