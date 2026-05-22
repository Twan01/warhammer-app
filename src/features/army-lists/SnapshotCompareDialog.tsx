/**
 * Phase 95 — Snapshot Compare Dialog (D-06..D-08).
 *
 * Sibling portal at ArmyListsPage level. Two-column diff table showing
 * added (green) / removed (red) / unchanged units between two snapshots.
 *
 * T-95-04: JSON.parse wrapped in try/catch with error state rendering.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSnapshotData } from "@/db/queries/armyListSnapshots";
import {
  computeSnapshotDiff,
  type ParsedSnapshot,
} from "@/lib/snapshotDiff";

interface SnapshotCompareDialogProps {
  open: boolean;
  snapshotIds: [number, number] | null;
  snapshotLabels: [string, string] | null;
  onClose: () => void;
}

function parseSnapshotBlob(raw: string | null): ParsedSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return {
      list: {
        total_points: parsed?.list?.total_points ?? 0,
        enhancement_points: parsed?.list?.enhancement_points ?? 0,
      },
      units: (parsed?.units ?? []).map((u: Record<string, unknown>) => ({
        name: String(u?.name ?? "Unknown"),
        points: Number(u?.points ?? 0),
        is_warlord: Boolean(u?.is_warlord),
        is_ghost: Boolean(u?.is_ghost),
      })),
    };
  } catch {
    return null;
  }
}

export function SnapshotCompareDialog({
  open,
  snapshotIds,
  snapshotLabels,
  onClose,
}: SnapshotCompareDialogProps) {
  const idA = snapshotIds?.[0] ?? null;
  const idB = snapshotIds?.[1] ?? null;
  const labelA = snapshotLabels?.[0] ?? "Snapshot A";
  const labelB = snapshotLabels?.[1] ?? "Snapshot B";

  const { data: rawA, isLoading: loadingA } = useQuery({
    queryKey: ["snapshot-data", idA],
    queryFn: () => getSnapshotData(idA!),
    enabled: idA !== null && open,
  });

  const { data: rawB, isLoading: loadingB } = useQuery({
    queryKey: ["snapshot-data", idB],
    queryFn: () => getSnapshotData(idB!),
    enabled: idB !== null && open,
  });

  const parsedA = useMemo(() => parseSnapshotBlob(rawA ?? null), [rawA]);
  const parsedB = useMemo(() => parseSnapshotBlob(rawB ?? null), [rawB]);

  const diff = useMemo(() => {
    if (!parsedA || !parsedB) return null;
    return computeSnapshotDiff(parsedA, parsedB);
  }, [parsedA, parsedB]);

  const isLoading = loadingA || loadingB;
  const hasError = !isLoading && snapshotIds !== null && (!parsedA || !parsedB);

  const totalA = parsedA ? parsedA.list.total_points + parsedA.list.enhancement_points : 0;
  const totalB = parsedB ? parsedB.list.total_points + parsedB.list.enhancement_points : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compare Snapshots</DialogTitle>
          <DialogDescription>{labelA} vs {labelB}</DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        )}

        {hasError && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Unable to load snapshot data.
          </p>
        )}

        {!isLoading && !hasError && snapshotIds === null && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No snapshots selected.
          </p>
        )}

        {diff && (
          <>
            {/* Points delta banner */}
            <div className="p-3 bg-muted rounded-md mb-4">
              <p className="text-base font-semibold">
                {labelA}: {totalA} pts → {labelB}: {totalB} pts ·{" "}
                <span
                  className={
                    diff.pointsDelta > 0
                      ? "text-green-400 dark:text-green-400"
                      : diff.pointsDelta < 0
                        ? "text-red-400 dark:text-red-400"
                        : "text-muted-foreground"
                  }
                >
                  Delta: {diff.pointsDelta > 0 ? "+" : ""}{diff.pointsDelta} pts
                </span>
              </p>
            </div>

            {/* Two-column diff table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{labelA} ({totalA} pts)</TableHead>
                  <TableHead className="text-xs text-right">Pts</TableHead>
                  <TableHead className="text-xs">{labelB} ({totalB} pts)</TableHead>
                  <TableHead className="text-xs text-right">Pts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Common units — index-based pairing to handle duplicate names */}
                {diff.unitsCommon.map((unit, i) => {
                  // Build consumed counter to pair with the correct B unit by index
                  const bUnitsWithName = parsedB!.units.filter((u) => u.name === unit.name);
                  let matchIndex = 0;
                  for (let j = 0; j < i; j++) {
                    if (diff.unitsCommon[j].name === unit.name) matchIndex++;
                  }
                  const unitB = bUnitsWithName[matchIndex] ?? bUnitsWithName[0];
                  return (
                    <TableRow key={`common-${i}`}>
                      <TableCell className="text-muted-foreground text-sm">{unit.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm text-right">{unit.points}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{unit.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm text-right">{unitB?.points ?? unit.points}</TableCell>
                    </TableRow>
                  );
                })}
                {/* Removed units (in A, not in B) */}
                {diff.unitsRemoved.map((unit, i) => (
                  <TableRow key={`removed-${i}`} className="bg-red-950/40">
                    <TableCell className="text-red-400 text-sm line-through">{unit.name}</TableCell>
                    <TableCell className="text-red-400 text-sm text-right">{unit.points}</TableCell>
                    <TableCell className="text-sm"></TableCell>
                    <TableCell className="text-sm"></TableCell>
                  </TableRow>
                ))}
                {/* Added units (in B, not in A) */}
                {diff.unitsAdded.map((unit, i) => (
                  <TableRow key={`added-${i}`} className="bg-green-950/40">
                    <TableCell className="text-sm"></TableCell>
                    <TableCell className="text-sm"></TableCell>
                    <TableCell className="text-green-400 text-sm">{unit.name}</TableCell>
                    <TableCell className="text-green-400 text-sm text-right">{unit.points}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
