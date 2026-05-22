import { Loader2, Pencil, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getSyncFreshness, getSyncAgeLabel, FRESHNESS_DOT_CLASS } from "@/lib/syncFreshness";
import type { RulesSyncMeta } from "@/types/datasheet";
import type { UnitOverride } from "@/types/unitOverride";

export type StatKey = "M" | "T" | "Sv" | "W" | "Ld" | "OC";

export const STAT_KEYS: StatKey[] = ["M", "T", "Sv", "W", "Ld", "OC"];

const SECTION_LABEL_CLASS =
  "text-xs font-semibold text-muted-foreground uppercase tracking-wide";

export function formatStatValue(key: StatKey, value: number | null): React.ReactNode {
  if (value === null) {
    return <span className="text-muted-foreground">—</span>;
  }
  if (key === "M") return `${value}"`;
  if (key === "Sv" || key === "Ld" || key === "OC") return `${value}+`;
  return `${value}`;
}

export function parseNumberInput(raw: string): number | null {
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

interface PlaybookStatsProps {
  unitId: number;
  syncMeta: RulesSyncMeta | null | undefined;
  overrideRow: UnitOverride | null | undefined;
  hasDatasheetLink: boolean;
  hasMultipleProfiles: boolean;
  statsEditMode: boolean;
  onToggleStatsEditMode: () => void;
  wahapediaFactionId: string | null | undefined;
  onPickerOpen: () => void;
  onSyncClick: () => void;
  isSyncing: boolean;
  onDeleteOverride: (unitId: number) => void;
  statValue: (key: StatKey) => number | null;
  setStat: (key: StatKey, v: number | null) => void;
  importedStatValue: (key: StatKey) => number | null;
  isStatOverridden: (key: StatKey) => boolean;
  // Points override
  pointsOverrideValue: string;
  onPointsOverrideChange: (value: string) => void;
  unitPoints: number | null | undefined;
  // Sync freshness display
  formatSyncDate: (iso: string | null) => string;
}

export function PlaybookStats({
  syncMeta,
  overrideRow,
  hasDatasheetLink,
  hasMultipleProfiles,
  statsEditMode,
  onToggleStatsEditMode,
  wahapediaFactionId,
  onPickerOpen,
  onSyncClick,
  isSyncing,
  onDeleteOverride,
  statValue,
  setStat,
  importedStatValue,
  isStatOverridden,
  pointsOverrideValue,
  onPointsOverrideChange,
  unitPoints,
  formatSyncDate,
  unitId,
}: PlaybookStatsProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className={SECTION_LABEL_CLASS}>Stats</span>
        <div className="flex items-center gap-2">
          {syncMeta && (() => {
            const freshness = getSyncFreshness(syncMeta.last_sync_at);
            const ageLabel = getSyncAgeLabel(syncMeta.last_sync_at);
            return (
              <div className="flex items-center gap-1.5">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={`inline-block w-2 h-2 rounded-full ${FRESHNESS_DOT_CLASS[freshness]}`} />
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{ageLabel}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <span className="text-xs text-muted-foreground">
                  Last synced: {formatSyncDate(syncMeta.last_sync_at)}
                </span>
              </div>
            );
          })()}
          {syncMeta && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onPickerOpen}
              disabled={!wahapediaFactionId}
            >
              {hasDatasheetLink ? "Re-import" : "Import stats"}
            </Button>
          )}
          {syncMeta && hasDatasheetLink && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Re-sync datasheets"
              onClick={onSyncClick}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          )}
          {overrideRow && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    aria-label="Clear all overrides"
                    onClick={() => {
                      onDeleteOverride(unitId);
                    }}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Clear all overrides</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            aria-label="Edit stats"
            onClick={onToggleStatsEditMode}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Empty-rules-db banner */}
      {!syncMeta && (
        <div className="rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
          Sync datasheets to auto-fill stats.{" "}
          <button
            type="button"
            className="underline underline-offset-2 hover:text-foreground"
            onClick={onSyncClick}
            disabled={isSyncing}
          >
            {isSyncing ? "Syncing…" : "Sync now"}
          </button>
        </div>
      )}

      {/* Points override — edit mode */}
      {hasDatasheetLink && statsEditMode && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs font-medium text-muted-foreground w-16">Points</span>
          <Input
            type="number"
            min={0}
            placeholder={unitPoints != null ? String(unitPoints) : "—"}
            value={pointsOverrideValue}
            onChange={(e) => onPointsOverrideChange(e.target.value)}
            className="h-7 w-24 text-sm tabular-nums"
            aria-label="Points override"
          />
          {overrideRow?.points != null && (
            <span className="text-[10px] text-muted-foreground">
              (imported: {unitPoints ?? "—"})
            </span>
          )}
        </div>
      )}

      {/* Points override — view mode */}
      {hasDatasheetLink && !statsEditMode && overrideRow?.points != null && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs font-medium text-muted-foreground w-16">Points</span>
          <span className="text-sm font-semibold tabular-nums">{overrideRow.points} pts</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Pencil className="h-2.5 w-2.5 text-primary cursor-help" aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent side="top">
                Manual override — imported value: {unitPoints ?? "—"} pts
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      <div className="flex flex-row gap-1">
        {STAT_KEYS.map((key) => (
          <div
            key={key}
            className={`relative flex-1 flex flex-col items-center justify-center min-h-[44px] border ${
              isStatOverridden(key) ? "border-primary bg-primary/5" : statsEditMode ? "border-primary" : "border-border"
            } rounded-sm bg-card gap-1 px-1 py-2`}
          >
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">
              {key}
            </span>
            {isStatOverridden(key) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Pencil className="h-2.5 w-2.5 text-primary absolute top-1 right-1 cursor-help" aria-hidden="true" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Manual override — imported value: {formatStatValue(key, importedStatValue(key))}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {statsEditMode ? (
              <Input
                type="number"
                min={0}
                value={statValue(key) ?? ""}
                onChange={(e) => setStat(key, parseNumberInput(e.target.value))}
                className="h-7 text-center text-base font-semibold p-0 border-0 bg-transparent"
                aria-label={`${key} value`}
              />
            ) : (
              <span className="text-base font-semibold text-foreground tabular-nums">
                {formatStatValue(key, statValue(key))}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* DS-12 multi-profile note */}
      {hasMultipleProfiles && (
        <p className="text-xs text-muted-foreground mt-1">
          Additional model profiles available — see Datasheet Abilities for details.
        </p>
      )}
    </div>
  );
}
