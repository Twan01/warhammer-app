import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { save, open as openDialog } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { Database, Download, Upload, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAppSettings, upsertAppSetting } from "@/db/queries/appSettings";
import { APP_SETTINGS_KEY } from "@/hooks/useAppSettings";

export function DataManagementTab() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      const settings = await getAppSettings();
      const payload = {
        version: 1,
        exported_at: new Date().toISOString(),
        settings,
      };
      const today = new Date().toISOString().slice(0, 10);
      const destination = await save({
        defaultPath: `hobbyforge-preferences-${today}.json`,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!destination) return;
      await writeTextFile(destination, JSON.stringify(payload, null, 2));
      toast.success("Preferences exported");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to export preferences",
      );
    } finally {
      setIsExporting(false);
    }
  }

  async function handleImport() {
    setIsImporting(true);
    try {
      const path = (await openDialog({
        filters: [{ name: "JSON", extensions: ["json"] }],
      })) as string | null;
      if (!path) return;
      const raw = await readTextFile(path);
      let payload: unknown;
      try {
        payload = JSON.parse(raw);
      } catch {
        toast.error("Could not read file — is it a valid JSON file?");
        return;
      }
      if (
        typeof payload !== "object" ||
        payload === null ||
        (payload as Record<string, unknown>).version !== 1 ||
        typeof (payload as Record<string, unknown>).settings !== "object"
      ) {
        toast.error("Invalid preferences file — missing version or settings");
        return;
      }
      const settings = (payload as { settings: Record<string, unknown> })
        .settings;
      let count = 0;
      for (const [key, value] of Object.entries(settings)) {
        if (typeof value === "string") {
          await upsertAppSetting(key, value);
          count++;
        }
      }
      await qc.invalidateQueries({ queryKey: APP_SETTINGS_KEY });
      toast.success(`Imported ${count} setting(s)`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to import preferences",
      );
    } finally {
      setIsImporting(false);
    }
  }

  async function handleFactoryReset() {
    setIsResetting(true);
    try {
      await invoke("factory_reset");
      localStorage.clear();
      await relaunch();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Factory reset failed",
      );
      setIsResetting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Data Health Link */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Database className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Data Health</p>
                <p className="text-sm text-muted-foreground">
                  View diagnostics, backup & restore
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/data-health" })}
            >
              Open Data Health
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preference Export */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Download className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Export Preferences</p>
                <p className="text-sm text-muted-foreground">
                  Save your current settings to a JSON file for safekeeping
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                "Export Preferences"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preference Import */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Import Preferences</p>
                <p className="text-sm text-muted-foreground">
                  Restore settings from a previously exported JSON file
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleImport}
              disabled={isImporting}
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                "Import Preferences"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Factory Reset */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Factory Reset</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete all your data and start fresh. This cannot
                  be undone.
                </p>
              </div>
            </div>
            <Button variant="destructive" onClick={() => setOpen(true)}>
              Factory Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Factory Reset Confirmation Dialog */}
      <AlertDialog
        open={open}
        onOpenChange={(v) => {
          if (!isResetting) {
            setOpen(v);
            if (!v) setPhrase("");
          }
        }}
      >
        <AlertDialogContent
          onEscapeKeyDown={(e) => isResetting && e.preventDefault()}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              Factory Reset — Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your collection, paints, army
              lists, recipes, battle logs, and photos.
            </AlertDialogDescription>
            <AlertDialogDescription>
              A safety backup will be created first. The app will restart
              automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reset-confirm">
              Type &quot;RESET&quot; to confirm
            </Label>
            <Input
              id="reset-confirm"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder="RESET"
              autoComplete="off"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>
              Keep My Data
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={phrase !== "RESET" || isResetting}
              onClick={handleFactoryReset}
            >
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset App"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
