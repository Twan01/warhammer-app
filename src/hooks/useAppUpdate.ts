import { useState, useEffect, useCallback } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";

export type UpdateStatus = "idle" | "checking" | "available" | "downloading" | "installing" | "error";

export function useAppUpdate() {
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [update, setUpdate] = useState<Update | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const checkForUpdate = useCallback(async () => {
    try {
      setStatus("checking");
      setError(null);
      const result = await check();
      if (result) {
        setUpdate(result);
        setStatus("available");
      } else {
        setStatus("idle");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }, []);

  const installUpdate = useCallback(async () => {
    if (!update) return;
    try {
      setStatus("downloading");
      let totalLength = 0;
      let downloaded = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === "Started" && event.data.contentLength) {
          totalLength = event.data.contentLength;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          if (totalLength > 0) {
            setProgress(Math.round((downloaded / totalLength) * 100));
          }
        } else if (event.event === "Finished") {
          // "Finished" = DOWNLOAD finished, not install. Do NOT flip to
          // "installing" here: that triggers the auto-relaunch useEffect, which
          // on Windows restarts the OLD binary mid-install before the NSIS
          // passive installer can replace it — producing an update loop
          // (REL-06 verification finding). Just mark the download complete.
          setProgress(100);
        }
      });
      // Reached only if downloadAndInstall RESOLVES. On Windows the installer
      // exits the app before this runs and installMode "passive" /R performs the
      // relaunch; on macOS/Linux this flips to "installing" so the relaunch()
      // safety net in UpdateBanner applies (REL-07 / D-04, D-06).
      setStatus("installing");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }, [update]);

  useEffect(() => {
    let cancelled = false;
    checkForUpdate().finally(() => {
      if (cancelled) {
        // Component unmounted — reset state to avoid stale updates
        setStatus("idle");
        setUpdate(null);
      }
    });
    return () => { cancelled = true; };
  }, [checkForUpdate]);

  return {
    status,
    update,
    error,
    progress,
    version: update?.version ?? null,
    checkForUpdate,
    installUpdate,
  };
}
