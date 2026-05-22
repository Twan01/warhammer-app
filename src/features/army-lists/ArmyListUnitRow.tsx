import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Info, Link2, Settings2, Sparkles, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { useUpdateArmyListUnit } from "@/hooks/useArmyLists";
import { useUnitLoadouts } from "@/hooks/useUnitLoadouts";
import { useUnitRulesMapping } from "@/hooks/useUnitRulesMapping";
import { computeUnitWarnings } from "@/lib/computeUnitWarnings";
import type { WarningContext } from "@/lib/computeUnitWarnings";
import { resolveUnitPoints } from "@/lib/resolveUnitPoints";
import type { SyncFreshness } from "@/lib/syncFreshness";
import type { ArmyListUnitRow as ArmyListUnitRowType } from "@/types/armyList";
import type { SyncedLeaderTargetRow } from "@/db/queries/bsdataExtended";
import { TACTICAL_ROLES, TACTICAL_ROLES_DISPLAY } from "@/types/armyList";
import { findMatchingDatasheets } from "@/db/queries/unitRulesMapping";
import { useUnitKeywords } from "@/hooks/useUnitKeywords";
import { PointsSourceChip } from "./PointsSourceChip";
import { MatchStatusIndicator } from "./MatchStatusIndicator";
import { RulesMappingSheet } from "./RulesMappingSheet";

interface ArmyListUnitRowProps {
  unit: ArmyListUnitRowType;
  totalPoints: number;
  pointsLimit: number | null;
  freshness: SyncFreshness;
  onRemove: () => void;
  onConfigure: () => void;
  onEnhance: () => void;
  onAttachLeader: () => void;
  enhancementName?: string;
  isIndentedLeader?: boolean;
  leaderName?: string;
  leaderTargets?: SyncedLeaderTargetRow[];
}

/**
 * ARMY-03, ARMY-04 — One unit row inside ArmyListDetailSheet's unit table.
 *
 * Layout (UI-SPEC §ArmyListDetailSheet, in this exact column order):
 *   1. Unit name (+ active loadout name below if set)
 *   2. Painting status badge
 *   3. Points override (inline number Input — saves on blur or Enter)
 *      + Configure trigger (Phase 90)
 *   4. Notes expand toggle (ChevronDown/Up icon)
 *   5. Remove button (Trash2 ghost icon)
 *
 * Critical contract (Pitfall 2): updateArmyListUnit is full-replacement, NOT
 * COALESCE. Every save MUST pass BOTH points_override AND notes — otherwise
 * the un-passed field is overwritten with undefined.
 *
 * Phase 90: The inline tier selector (Phase 24) is replaced with a compact
 * Configure trigger that opens the LoadoutBuilderSheet (D-02, D-04).
 * Tier selection now writes to army_list_units.selected_model_count (per-list).
 */
export function ArmyListUnitRow({ unit, totalPoints, pointsLimit, freshness, onRemove, onConfigure, onEnhance, onAttachLeader, enhancementName, isIndentedLeader = false, leaderName, leaderTargets = [] }: ArmyListUnitRowProps) {
  const isGhost = unit.unit_id === null;
  const updateArmyListUnit = useUpdateArmyListUnit();
  const [expanded, setExpanded] = useState(false);
  const [notesDraft, setNotesDraft] = useState(unit.notes ?? "");
  useEffect(() => { setNotesDraft(unit.notes ?? ""); }, [unit.notes]);
  const [mappingSheetOpen, setMappingSheetOpen] = useState(false);

  const unitIdOrUndefined = unit.unit_id ?? undefined;
  const { data: loadouts } = useUnitLoadouts(unitIdOrUndefined);
  const { data: rulesMapping } = useUnitRulesMapping(unitIdOrUndefined);

  /**
   * Phase 91 — Unit keyword check for enhancement eligibility.
   * Ghost units whose name doesn't match a Wahapedia datasheet will return
   * isCharacter: false — the Enhance trigger won't show. This is expected
   * and correct per D-05 (ghost units can't receive enhancements).
   */
  const { data: keywords } = useUnitKeywords(unit.unit_name);
  const isCharacter = keywords?.isCharacter ?? false;
  const isEpicHero = keywords?.isEpicHero ?? false;
  const showEnhanceTrigger = isCharacter && !isEpicHero;

  // Phase 92 — Leader eligibility: unit name matches a leader_name in synced targets
  const isLeader = leaderTargets.some(
    (lt) => lt.leader_name.toLowerCase() === unit.unit_name.toLowerCase(),
  );

  // Phase 76 — points source resolution
  const resolved = useMemo(
    () =>
      resolveUnitPoints({
        points_override: unit.points_override,
        tier_points: unit.tier_points,
        synced_points: unit.synced_points,
        override_points: unit.override_points,
        unit_points: unit.unit_points,
      }),
    [unit.points_override, unit.tier_points, unit.synced_points, unit.override_points, unit.unit_points],
  );

  // Phase 76 — ambiguity detection (T-76-05: cached by React Query)
  const { data: matchingDatasheets } = useQuery({
    queryKey: ["matching-datasheets", unit.unit_name, unit.faction_id],
    queryFn: () => findMatchingDatasheets(unit.unit_name, unit.faction_id),
    staleTime: 5 * 60 * 1000,
  });
  const ambiguousCount = matchingDatasheets?.length ?? 0;

  const activeLoadout = loadouts?.find((l) => l.is_active === 1);

  // Phase 66 — per-unit warning computation
  const warnings = useMemo(() => {
    const ctx: WarningContext = { totalPoints, pointsLimit, freshness };
    return computeUnitWarnings(unit, ctx);
  }, [unit, totalPoints, pointsLimit, freshness]);

  // Phase 90 — Configure trigger label showing active tier
  const tierLabel = unit.selected_model_count !== null && unit.tier_points !== null
    ? `${unit.selected_model_count} models · ${unit.tier_points}pts`
    : "Configure";

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
      <TableRow
        className={isIndentedLeader ? "border-l-2" : ""}
        style={isIndentedLeader ? { borderLeftColor: "var(--faction-accent, hsl(var(--muted-foreground)))" } : undefined}
      >
        <TableCell className={`font-medium${isIndentedLeader ? " pl-8" : ""}`}>
          <div className="flex items-center">
            {warnings.hard.length > 0 ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex mr-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>{[...warnings.hard, ...warnings.soft].join(", ")}</TooltipContent>
              </Tooltip>
            ) : warnings.soft.length > 0 ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex mr-1">
                    <Info className="h-3.5 w-3.5 text-amber-500" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>{warnings.soft.join(", ")}</TooltipContent>
              </Tooltip>
            ) : null}
            {unit.unit_id != null && (
              <MatchStatusIndicator
                matchStatus={rulesMapping?.match_status ?? null}
                ambiguousCount={ambiguousCount}
                onClick={() => setMappingSheetOpen(true)}
              />
            )}
            <span className={isGhost ? "text-muted-foreground" : ""}>{unit.unit_name}</span>
            {isGhost && <Badge variant="outline" className="ml-1.5 text-xs">Planned</Badge>}
          </div>
          {activeLoadout && (
            <span className="text-xs text-muted-foreground block">
              {activeLoadout.name}
            </span>
          )}
          {enhancementName && (
            <Badge variant="outline" className="text-xs mt-0.5">
              <Sparkles className="h-3 w-3 mr-1" />{enhancementName}
            </Badge>
          )}
          {leaderName && (
            <Badge variant="outline" className="text-xs mt-0.5">
              <Link2 className="h-3 w-3 mr-1" />Leader: {leaderName}
            </Badge>
          )}
          {showEnhanceTrigger && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs mt-1"
              onClick={onEnhance}
              aria-label={`Assign enhancement to ${unit.unit_name}`}
            >
              <Sparkles className="h-3 w-3 mr-1" />Enhance
            </Button>
          )}
          {isLeader && (
            <Button
              type="button"
              variant={unit.leader_attached_to_id != null ? "secondary" : "outline"}
              size="sm"
              className="h-7 text-xs mt-1"
              onClick={onAttachLeader}
              aria-label={
                unit.leader_attached_to_id != null
                  ? `${unit.unit_name} attached`
                  : `Attach ${unit.unit_name} as leader`
              }
            >
              <Link2 className="h-3 w-3 mr-1" />
              {unit.leader_attached_to_id != null ? "Attached" : "Attach Leader"}
            </Button>
          )}
          {!isGhost && (
            <Select
              value={unit.tactical_role ?? ""}
              onValueChange={(val) => {
                const newRole = val === "__none__" ? null : val;
                updateArmyListUnit.mutate(
                  {
                    id: unit.id,
                    list_id: unit.list_id,
                    points_override: unit.points_override,
                    notes: unit.notes,
                    tactical_role: newRole,
                  },
                  {
                    onError: () => toast.error("Failed to update role. Please try again."),
                  },
                );
              }}
            >
              <SelectTrigger className="w-28 h-6 text-xs mt-0.5">
                <SelectValue placeholder="Role..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {TACTICAL_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {TACTICAL_ROLES_DISPLAY[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </TableCell>

        <TableCell className="space-x-1">
          {isGhost ? (
            <span className="text-xs text-muted-foreground">--</span>
          ) : (
            <>
              <Badge variant="secondary">{unit.status_painting}</Badge>
              {unit.status_assembly === 1 && (
                <Badge variant="outline">Assembled</Badge>
              )}
            </>
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
          </div>
          <PointsSourceChip points={resolved.points} source={resolved.source} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs mt-1"
            onClick={onConfigure}
            aria-label={`Configure loadout for ${unit.unit_name}`}
          >
            <Settings2 className="h-3 w-3 mr-1" />
            {tierLabel}
          </Button>
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

      {mappingSheetOpen && unit.unit_id != null && unit.faction_id != null && (
        <RulesMappingSheet
          open={mappingSheetOpen}
          unitId={unit.unit_id}
          unitName={unit.unit_name}
          factionId={unit.faction_id}
          onClose={() => setMappingSheetOpen(false)}
        />
      )}
    </>
  );
}
