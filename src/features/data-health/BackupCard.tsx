/**
 * Phase 77 -- Backup action card (UI-SPEC Section 5).
 *
 * Opens a native save dialog via @tauri-apps/plugin-dialog, invokes the
 * Rust `backup_database` command (VACUUM INTO), and persists the result
 * to localStorage. Shows last backup date and filename when available.
 */
import { useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useBackupStatus,
  BACKUP_STORAGE_KEY,
  type BackupStatus,
} from "@/hooks/useDiagnostics";

function formatRelativeDate(isoDate: string): string {
  const ms = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

function extractFilename(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || path;
}

export function BackupCard() {
  const initialStatus = useBackupStatus();
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(
    initialStatus,
  );
  const [isBackingUp, setIsBackingUp] = useState(false);

  async function handleBackup() {
    const defaultFilename = `hobbyforge-backup-${new Date().toISOString().slice(0, 10)}.db`;

    const destination = await save({
      title: "Save Database Backup",
      defaultPath: defaultFilename,
      filters: [{ name: "SQLite Database", extensions: ["db"] }],
    });

    if (!destination) return;

    setIsBackingUp(true);
    try {
      await invoke("backup_database", { destination });
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

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-6">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Database Backup</span>
          <span className="text-sm text-muted-foreground">
            {backupStatus
              ? `Last backup: ${formatRelativeDate(backupStatus.date)} -- ${extractFilename(backupStatus.path)}`
              : "No backups yet"}
          </span>
        </div>
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
      </CardContent>
    </Card>
  );
}
