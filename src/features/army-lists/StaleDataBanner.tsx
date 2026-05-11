import { AlertTriangle } from "lucide-react";

interface StaleDataBannerProps {
  lastSyncAt: string | null | undefined;
}

function isDataStale(lastSyncAt: string | null | undefined): boolean {
  if (lastSyncAt == null) return true;
  const ageDays = (Date.now() - new Date(lastSyncAt).getTime()) / (1000 * 60 * 60 * 24);
  return ageDays > 30;
}

export function StaleDataBanner({ lastSyncAt }: StaleDataBannerProps) {
  if (!isDataStale(lastSyncAt)) return null;

  return (
    <div className="mx-4 rounded-md border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>Rules data is over 30 days old. Sync from the Rules Hub for the latest.</span>
      </div>
    </div>
  );
}
