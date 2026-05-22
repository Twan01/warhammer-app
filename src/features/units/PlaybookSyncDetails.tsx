import { AlertCircle, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { relativeDate } from "@/lib/dates";
import type { RulesSyncMeta } from "@/types/datasheet";
import type { SyncDiff } from "@/lib/computeSyncDiff";
import type { SyncError } from "@/db/queries/syncErrors";

interface PlaybookSyncDetailsProps {
  syncMeta: RulesSyncMeta;
  syncErrors: SyncError[];
  lastSyncDiff: SyncDiff | null;
}

export function PlaybookSyncDetails({
  syncMeta,
  syncErrors,
  lastSyncDiff,
}: PlaybookSyncDetailsProps) {
  if (!syncMeta.last_sync_at) return null;

  return (
    <div className="flex flex-col gap-1">
      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ChevronDown className="h-3 w-3" />
          <span>Sync details</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-1.5 pl-4">
          <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            {/* META-03: Wahapedia version */}
            {syncMeta.wahapedia_version && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Source:</span>
                <span>Wahapedia {syncMeta.wahapedia_version}</span>
              </div>
            )}
            {/* META-02: Per-table row counts */}
            {syncMeta.datasheets_count != null && (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                <span>{syncMeta.datasheets_count} datasheets</span>
                <span>{syncMeta.stratagems_count ?? 0} stratagems</span>
                <span>{syncMeta.abilities_count ?? 0} abilities</span>
                <span>{syncMeta.wargear_count ?? 0} wargear</span>
                <span>{syncMeta.keywords_count ?? 0} keywords</span>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* META-04: Error history */}
      {syncErrors.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-destructive/80 hover:text-destructive transition-colors">
            <AlertCircle className="h-3 w-3" />
            <span>Sync errors ({syncErrors.length})</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-1.5 pl-4">
            <div className="flex flex-col gap-1 text-xs">
              {syncErrors.slice(0, 10).map((err) => (
                <div key={err.id} className="flex items-start gap-2 text-muted-foreground">
                  <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
                    {err.error_type.replace("_", " ")}
                  </Badge>
                  <span className="flex-1 break-words">{err.message}</span>
                  <span className="shrink-0 tabular-nums">{relativeDate(err.occurred_at)}</span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* OVRD-06/07: Post-sync diff view */}
      {lastSyncDiff && lastSyncDiff.total_changed > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown className="h-3 w-3 transition-transform data-[state=open]:rotate-180" aria-hidden="true" />
            <span>Changes since last sync ({lastSyncDiff.total_changed})</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-1.5 pl-4 flex flex-col gap-1.5">
            {lastSyncDiff.removed.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-destructive" aria-hidden="true" />
                  <span className="text-xs font-semibold text-destructive">Removed ({lastSyncDiff.removed.length})</span>
                </div>
                {lastSyncDiff.removed.map((d) => (
                  <span key={d.id} className="text-xs text-muted-foreground pl-4">{d.name}</span>
                ))}
              </div>
            )}
            {lastSyncDiff.renamed.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-muted-foreground">Renamed ({lastSyncDiff.renamed.length})</span>
                {lastSyncDiff.renamed.map((d) => (
                  <span key={d.id} className="text-xs text-muted-foreground pl-4">
                    {d.oldName} &rarr; {d.newName}
                  </span>
                ))}
              </div>
            )}
            {lastSyncDiff.modified.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-muted-foreground">
                  Modified ({lastSyncDiff.modified.length})
                </span>
                {lastSyncDiff.modified.map((d) => (
                  <div key={d.id} className="flex flex-col gap-0.5 pl-4">
                    <span className="text-xs text-muted-foreground font-medium">{d.name}</span>
                    {d.changes.slice(0, 5).map((c, i) => (
                      <span key={i} className="text-xs text-muted-foreground pl-2">
                        {c.oldValue && c.newValue
                          ? `${c.field}: ${c.oldValue} → ${c.newValue}`
                          : c.newValue
                            ? `+${c.field}`
                            : `-${c.field}`}
                      </span>
                    ))}
                    {d.changes.length > 5 && (
                      <span className="text-xs text-muted-foreground pl-2 italic">
                        &hellip;and {d.changes.length - 5} more
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {lastSyncDiff.added.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-muted-foreground">Added ({lastSyncDiff.added.length})</span>
                {lastSyncDiff.added.map((d) => (
                  <span key={d.id} className="text-xs text-muted-foreground pl-4">{d.name}</span>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
