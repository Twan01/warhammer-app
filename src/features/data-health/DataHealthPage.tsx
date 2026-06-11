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
import { PointsCoverageCard } from "./PointsCoverageCard";
import { BackupCard } from "./BackupCard";
import { SafetyBackupsList } from "./SafetyBackupsList";
import { PageHeader } from "@/components/common/PageHeader";

export function DataHealthPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title="Data Health" />

      <VersionInfoCard />

      <div className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Table Counts</p>
        <TableCountsGrid />
      </div>

      <DiagnosticsCard />

      <PointsCoverageCard />

      <BackupCard />

      <div className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Safety Backups</p>
        <SafetyBackupsList />
      </div>
    </div>
  );
}
