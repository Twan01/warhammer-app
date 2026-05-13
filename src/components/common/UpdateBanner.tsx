import { Download, RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { relaunch } from "@tauri-apps/plugin-process";
import { Button } from "@/components/ui/button";
import { useAppUpdate } from "@/hooks/useAppUpdate";

export function UpdateBanner() {
  const { status, version, progress, installUpdate } = useAppUpdate();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || status === "idle" || status === "checking") return null;

  if (status === "error") return null;

  if (status === "installing") {
    return (
      <div className="flex items-center justify-between gap-3 border-b border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-400">
        <span>Update installed. Restart the app to apply v{version}.</span>
        <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={() => relaunch()}>
          <RefreshCw className="size-3.5" />
          Restart now
        </Button>
      </div>
    );
  }

  if (status === "downloading") {
    return (
      <div className="flex items-center gap-3 border-b border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-400">
        <Download className="size-3.5 animate-bounce" />
        <span>Downloading v{version}... {progress}%</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-400">
      <span>A new version is available: v{version}</span>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={installUpdate}>
          <Download className="size-3.5" />
          Update
        </Button>
        <button type="button" className="text-amber-400/60 hover:text-amber-400" onClick={() => setDismissed(true)}>
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function ManualUpdateCheck({ onUpdateAvailable }: { onUpdateAvailable?: () => void }) {
  const { status, checkForUpdate } = useAppUpdate();

  const handleCheck = async () => {
    await checkForUpdate();
    onUpdateAvailable?.();
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1.5"
      onClick={handleCheck}
      disabled={status === "checking"}
    >
      <RefreshCw className={`size-3.5 ${status === "checking" ? "animate-spin" : ""}`} />
      {status === "checking" ? "Checking..." : "Check for updates"}
    </Button>
  );
}
