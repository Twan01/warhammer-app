/**
 * Phase 80 -- Backup action card (UI-SPEC Section 5).
 *
 * Opens a native save dialog via @tauri-apps/plugin-dialog, invokes the
 * Rust `export_backup` command (structured ZIP export), and persists the
 * result to localStorage. Shows health tier dot + age label when available.
 */
import { useState, useEffect } from "react";
import { save, open as openDialog } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { relaunch } from "@tauri-apps/plugin-process";
import { ChevronDown, Download, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  useBackupStatus,
  BACKUP_STORAGE_KEY,
  type BackupStatus,
} from "@/hooks/useDiagnostics";
import {
  getBackupFreshness,
  getBackupAgeLabel,
  hasVersionMismatch,
  BACKUP_FRESHNESS_DOT_CLASS,
} from "@/lib/backupFreshness";
import type { BackupManifest } from "@/types/backup";
import { RestorePreviewDialog } from "./RestorePreviewDialog";

export function BackupCard() {
  const initialStatus = useBackupStatus();
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(
    initialStatus,
  );
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [manifest, setManifest] = useState<BackupManifest | null>(null);
  const [currentSchemaVersion, setCurrentSchemaVersion] = useState<
    number | null
  >(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => setAppVersion("unknown"));
  }, []);

  async function handleBackup() {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const year = now.getUTCFullYear();
    const month = pad(now.getUTCMonth() + 1);
    const day = pad(now.getUTCDate());
    const hours = pad(now.getUTCHours());
    const minutes = pad(now.getUTCMinutes());
    const defaultFilename = `hobbyforge-backup-${year}-${month}-${day}-${hours}${minutes}.zip`;

    const destination = await save({
      title: "Save Backup",
      defaultPath: defaultFilename,
      filters: [{ name: "HobbyForge Backup", extensions: ["zip"] }],
    });

    if (!destination) return;

    setIsBackingUp(true);
    try {
      await invoke("export_backup", { destination });
      const status: BackupStatus = {
        date: new Date().toISOString(),
        path: destination,
        success: true,
        ...(appVersion ? { app_version: appVersion } : {}),
      };
      localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(status));
      setBackupStatus(status);
      toast.success("Backup created successfully");
    } catch (error) {
      toast.error(
        `Backup failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setIsBackingUp(false);
    }
  }

  async function handleRestore() {
    const result = (await openDialog({
      multiple: false,
      directory: false,
      filters: [{ name: "Backup Archive", extensions: ["zip"] }],
    })) as string | null;

    if (result === null) return;

    setIsValidating(true);
    try {
      const validatedManifest = await invoke<BackupManifest>(
        "validate_backup",
        { path: result },
      );
      const schemaVersion = await invoke<number>("get_schema_version");
      setManifest(validatedManifest);
      setCurrentSchemaVersion(schemaVersion);
      setPreviewOpen(true);
      setSelectedPath(result);
    } catch (error) {
      toast.error(
        `Invalid backup file: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setIsValidating(false);
    }
  }

  async function handleConfirmRestore() {
    if (!selectedPath) return;
    setIsRestoring(true);
    try {
      await invoke("restore_from_backup", { path: selectedPath });
      // Persist last restore date before relaunch
      const existing = backupStatus ?? { date: "", path: "", success: true };
      const updated: BackupStatus = { ...existing, last_restore_date: new Date().toISOString() };
      localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(updated));
      await relaunch();
    } catch (error) {
      toast.error(
        `Restore failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      setIsRestoring(false);
      setPreviewOpen(false);
      setManifest(null);
      setSelectedPath(null);
    }
  }

  const tier = getBackupFreshness(backupStatus?.date ?? null);
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  const ageLabel = getBackupAgeLabel(backupStatus?.date ?? null);
  const versionMismatch = hasVersionMismatch(
    backupStatus?.app_version,
    appVersion,
  );

  // Compute version display for diagnostic row
  function getVersionDisplay(): { text: string; dotClass: string } {
    if (!backupStatus?.app_version) {
      return { text: "Version info unavailable", dotClass: "bg-muted-foreground" };
    }
    if (!appVersion) {
      return { text: "Loading...", dotClass: "bg-muted-foreground" };
    }
    if (versionMismatch) {
      return {
        text: `Backup: v${backupStatus.app_version} / Current: v${appVersion}`,
        dotClass: "bg-amber-500",
      };
    }
    return {
      text: `v${appVersion} (matches backup)`,
      dotClass: "bg-green-500",
    };
  }

  const versionDisplay = getVersionDisplay();

  // Tier status text and color
  const tierStatusMap: Record<typeof tier, { text: string; colorClass: string }> = {
    healthy: { text: "Healthy", colorClass: "text-green-500" },
    recommended: { text: "Recommended", colorClass: "text-amber-500" },
    overdue: { text: "Overdue", colorClass: "text-orange-500" },
    never: { text: "No backup — export one to protect your data", colorClass: "text-muted-foreground" },
  };
  const tierStatus = tierStatusMap[tier];

  return (
    <>
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Database Backup</span>
            <Collapsible defaultOpen={false}>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span className={`inline-block h-2 w-2 rounded-full ${BACKUP_FRESHNESS_DOT_CLASS[tier]}`} />
                <span>{tier === "never" ? "Never — No backup yet" : `${tierLabel} — ${ageLabel}`}</span>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-0.5 text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors"
                    aria-label="Toggle backup details"
                  >
                    <ChevronDown className="h-3 w-3 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                  </button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="pt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Backup age</span>
                    <span className="flex items-center gap-1.5">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${BACKUP_FRESHNESS_DOT_CLASS[tier]}`} />
                      {ageLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">App version</span>
                    <span className="flex items-center gap-1.5">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${versionDisplay.dotClass}`} />
                      {versionDisplay.text}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <span className={`flex items-center gap-1.5 ${tierStatus.colorClass}`}>
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${BACKUP_FRESHNESS_DOT_CLASS[tier]}`} />
                      {tierStatus.text}
                    </span>
                  </div>
                  {backupStatus && backupStatus.success === false && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Last attempt</span>
                      <span className="flex items-center gap-1.5 text-destructive">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-destructive" />
                        Backup failed
                      </span>
                    </div>
                  )}
                  {backupStatus?.path && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Location</span>
                      <span className="max-w-[280px] truncate text-right" title={backupStatus.path}>
                        {backupStatus.path}
                      </span>
                    </div>
                  )}
                  {backupStatus?.last_restore_date && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Last restore</span>
                      <span>{getBackupAgeLabel(backupStatus.last_restore_date).replace("Backed up ", "Restored ")}</span>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleBackup} disabled={isBackingUp}>
              {isBackingUp ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating backup...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Create Backup
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleRestore}
              disabled={isValidating || isRestoring}
            >
              {isValidating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Restore from Backup
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
    {manifest !== null && currentSchemaVersion !== null && (
      <RestorePreviewDialog
        manifest={manifest}
        currentSchemaVersion={currentSchemaVersion}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onConfirm={handleConfirmRestore}
        isRestoring={isRestoring}
      />
    )}
    </>
  );
}
