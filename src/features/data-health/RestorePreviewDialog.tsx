/**
 * Phase 81 (RST-01 through RST-05, RST-09) -- Restore Preview Dialog.
 *
 * AlertDialog-based preview showing backup manifest details and schema
 * compatibility state. Gates the destructive "Replace current database"
 * action behind explicit confirmation. Newer-than-current schema versions
 * disable the action button entirely (RST-04).
 */
import { AlertTriangle, Loader2, ShieldAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { BackupManifest } from "@/types/backup";
import { formatBytes } from "@/lib/formatBytes";

type SchemaState = "match" | "older" | "newer";

function getSchemaState(
  manifestVersion: number,
  currentVersion: number,
): SchemaState {
  if (manifestVersion > currentVersion) return "newer";
  if (manifestVersion < currentVersion) return "older";
  return "match";
}

function formatRelativeDate(isoDate: string): string {
  const ms = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function RestorePreviewDialog({
  manifest,
  currentSchemaVersion,
  open,
  onOpenChange,
  onConfirm,
  isRestoring = false,
}: {
  manifest: BackupManifest;
  currentSchemaVersion: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isRestoring?: boolean;
}) {
  const schemaState = getSchemaState(
    manifest.schema_version,
    currentSchemaVersion,
  );

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!isRestoring) onOpenChange(v); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restore Backup</AlertDialogTitle>
          <AlertDialogDescription>
            Review the backup details below. Restoring will replace your current
            database. A safety backup will be created automatically.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Manifest detail grid */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-border py-2">
            <span className="text-sm text-muted-foreground">Created</span>
            <span className="text-sm font-medium">
              {formatRelativeDate(manifest.created_at)} (
              {manifest.created_at})
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-border py-2">
            <span className="text-sm text-muted-foreground">App Version</span>
            <span className="text-sm font-medium">
              {manifest.app_version}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-border py-2">
            <span className="text-sm text-muted-foreground">
              Schema Version
            </span>
            <span className="flex items-center gap-2 text-sm font-medium">
              {manifest.schema_version}
              {schemaState === "match" && (
                <Badge
                  variant="secondary"
                  className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                >
                  Matches current
                </Badge>
              )}
              {schemaState === "older" && (
                <Badge
                  variant="secondary"
                  className="bg-amber-500/10 text-amber-500 border-amber-500/20"
                >
                  Older version
                </Badge>
              )}
              {schemaState === "newer" && (
                <Badge variant="destructive">Newer than app</Badge>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-border py-2">
            <span className="text-sm text-muted-foreground">Platform</span>
            <span className="text-sm font-medium">
              {capitalize(manifest.platform)}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-border py-2">
            <span className="text-sm text-muted-foreground">
              Database Size
            </span>
            <span className="text-sm font-medium">
              {formatBytes(manifest.db_size_bytes)}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-border py-2">
            <span className="text-sm text-muted-foreground">
              Rules Database
            </span>
            <span className="text-sm font-medium">
              {manifest.includes_rules_db ? "Included" : "Not included (re-sync after restore)"}
            </span>
          </div>
          {manifest.notes && (
            <div className="flex items-center justify-between border-b border-border py-2">
              <span className="text-sm text-muted-foreground">Notes</span>
              <span className="text-sm font-medium">{manifest.notes}</span>
            </div>
          )}
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">
              Rules Schema
            </span>
            <span className="text-sm font-medium">
              {manifest.rules_schema_version > 0
                ? `v${manifest.rules_schema_version}`
                : "Unknown"}
            </span>
          </div>
        </div>

        {/* Schema compatibility banners */}
        {schemaState === "newer" && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              This backup was created with a newer version of HobbyForge.
              Update the app before restoring.
            </span>
          </div>
        )}
        {schemaState === "older" && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-500">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              This backup was created with an older version. Some data may
              need migration after restore.
            </span>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRestoring}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: "destructive" })}
            disabled={schemaState === "newer" || isRestoring}
            onClick={onConfirm}
          >
            {isRestoring ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Restoring...
              </>
            ) : (
              "Replace current database"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
