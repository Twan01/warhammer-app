/**
 * Phase 82 -- Safety backup listing component (SAF-04).
 *
 * Queries the Rust backend for safety backups created before restore and
 * rules sync operations. Renders inside a Card with loading, empty,
 * populated, and error states.
 */
import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield } from "lucide-react";
import { formatBytes } from "@/lib/formatBytes";

interface SafetyBackupEntry {
  filename: string;
  timestamp: string;
  size_bytes: number;
}

export const SAFETY_BACKUPS_KEY = ["safety-backups"] as const;

export function SafetyBackupsList() {
  const { data, isLoading, isError } = useQuery({
    queryKey: SAFETY_BACKUPS_KEY,
    queryFn: () => invoke<SafetyBackupEntry[]>("list_safety_backups"),
  });

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-sm font-semibold mb-3">Safety Backups</h3>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-muted-foreground">
            Could not load safety backups — refresh the page to try again.
          </p>
        ) : !data || data.length === 0 ? (
          <div>
            <p className="text-sm text-muted-foreground">No safety backups yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Safety backups are created automatically before each restore and
              rules sync.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.map((entry) => (
              <div
                key={entry.filename}
                className="flex items-center gap-2 py-2"
              >
                <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground">
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
                <span className="text-sm text-muted-foreground ml-auto">
                  {formatBytes(entry.size_bytes)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
