/**
 * Phase 80 -- Backup action card (UI-SPEC Section 5).
 *
 * Opens a native save dialog via @tauri-apps/plugin-dialog, invokes the
 * Rust `export_backup` command (structured ZIP export), and persists the
 * result to localStorage. Shows health tier dot + age label when available.
 */
import { useState } from "react";
import { save, open as openDialog } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { Download, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useBackupStatus,
  BACKUP_STORAGE_KEY,
  type BackupStatus,
} from "@/hooks/useDiagnostics";
import {
  getBackupFreshness,
  getBackupAgeLabel,
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

  return (
    <>
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-6">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Database Backup</span>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className={`inline-block h-2 w-2 rounded-full ${BACKUP_FRESHNESS_DOT_CLASS[tier]}`} />
            <span>{tier === "never" ? "Never — No backup yet" : `${tierLabel} — ${ageLabel}`}</span>
          </div>
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
