import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, AlertCircle, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useRulesSyncMeta } from "@/hooks/useDatasheet";
import { useRulesSync } from "@/hooks/useRulesSync";
import { useRulesSyncErrors } from "@/hooks/useSyncErrors";
import {
  getSyncFreshness,
  getSyncAgeLabel,
  FRESHNESS_DOT_CLASS,
} from "@/lib/syncFreshness";
import type { SyncDiff } from "@/lib/computeSyncDiff";

interface SyncStatusCardProps {
  lastSyncDiff: SyncDiff | null;
  onSyncComplete: (diff: SyncDiff) => void;
}

export function SyncStatusCard({
  lastSyncDiff,
  onSyncComplete,
}: SyncStatusCardProps) {
  const { data: syncMeta } = useRulesSyncMeta();
  const rulesSync = useRulesSync();
  const { data: syncErrors = [] } = useRulesSyncErrors();
  const [errorsOpen, setErrorsOpen] = useState(false);

  const freshness = getSyncFreshness(syncMeta?.last_sync_at ?? null);
  const ageLabel = getSyncAgeLabel(syncMeta?.last_sync_at ?? null);

  function handleSyncClick() {
    rulesSync.mutate(undefined, {
      onSuccess: (data) => {
        onSyncComplete(data.diff);
        toast.success("Rules synced successfully");
      },
      onError: (err) => {
        toast.error(`Sync failed: ${err.message}`);
      },
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    "inline-block h-2 w-2 rounded-full",
                    FRESHNESS_DOT_CLASS[freshness],
                  )}
                />
              </TooltipTrigger>
              <TooltipContent>{ageLabel}</TooltipContent>
            </Tooltip>
            <span className="text-sm font-medium">{ageLabel}</span>
            {syncMeta?.wahapedia_version && (
              <Badge variant="secondary" className="text-xs">
                v{syncMeta.wahapedia_version}
              </Badge>
            )}
          </div>

          <Button
            size="sm"
            onClick={handleSyncClick}
            disabled={rulesSync.isPending}
          >
            <RefreshCw
              className={cn("mr-1.5 h-3.5 w-3.5", rulesSync.isPending && "animate-spin")}
            />
            {rulesSync.isPending ? "Syncing…" : "Sync now"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {syncMeta && (
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {syncMeta.datasheets_count !== null && (
              <span>
                <span className="font-semibold text-foreground">
                  {syncMeta.datasheets_count}
                </span>{" "}
                datasheets
              </span>
            )}
            {syncMeta.stratagems_count !== null && (
              <span>
                <span className="font-semibold text-foreground">
                  {syncMeta.stratagems_count}
                </span>{" "}
                stratagems
              </span>
            )}
            {syncMeta.detachments_count !== null && (
              <span>
                <span className="font-semibold text-foreground">
                  {syncMeta.detachments_count}
                </span>{" "}
                detachments
              </span>
            )}
          </div>
        )}

        {lastSyncDiff !== null && (
          <p className="text-xs text-muted-foreground">
            Last sync:{" "}
            <span className="text-green-600">
              +{lastSyncDiff.added.length} added
            </span>
            {" / "}
            <span className="text-red-600">
              -{lastSyncDiff.removed.length} removed
            </span>
            {" / "}
            <span className="text-amber-600">
              ~{lastSyncDiff.modified.length} modified
            </span>
            {" / "}
            <span className="text-blue-600">
              {lastSyncDiff.renamed.length} renamed
            </span>
          </p>
        )}

        <Collapsible open={errorsOpen} onOpenChange={setErrorsOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <AlertCircle className="h-3.5 w-3.5" />
              Sync errors ({syncErrors.length})
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  errorsOpen && "rotate-180",
                )}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {syncErrors.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                No sync errors recorded.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {syncErrors.map((err) => (
                  <li key={err.id} className="text-xs">
                    <Badge variant="destructive" className="mr-1.5 text-xs">
                      {err.error_type}
                    </Badge>
                    <span className="text-muted-foreground">
                      {err.occurred_at.slice(0, 10)}
                    </span>{" "}
                    — {err.message}
                  </li>
                ))}
              </ul>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
