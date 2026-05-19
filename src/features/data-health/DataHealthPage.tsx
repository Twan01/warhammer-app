/**
 * Phase 77 -- Data Health page root (UI-SPEC full layout).
 *
 * Single-column scrollable page assembling five sections:
 *   1. Page header ("Data Health")
 *   2. VersionInfoCard -- app version, schema versions, sync metadata
 *   3. Table Counts section title + TableCountsGrid
 *   4. DiagnosticsCard -- flags with severity badges
 *   5. BackupCard -- backup action + last backup status
 *
 * Each section loads independently via its own React Query hook.
 */
import { VersionInfoCard } from "./VersionInfoCard";
import { TableCountsGrid } from "./TableCountsGrid";
import { DiagnosticsCard } from "./DiagnosticsCard";
import { BackupCard } from "./BackupCard";
import { SafetyBackupsList } from "./SafetyBackupsList";

export function DataHealthPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Data Health</h1>

      <VersionInfoCard />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Table Counts</h2>
        <TableCountsGrid />
      </div>

      <DiagnosticsCard />

      <BackupCard />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Safety Backups</h2>
        <SafetyBackupsList />
      </div>
    </div>
  );
}
