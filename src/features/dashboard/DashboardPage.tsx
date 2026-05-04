/**
 * DASH-01..08 — Top-level Dashboard page.
 *
 * Handles three query branches: isLoading (Skeletons), isError (error message),
 * and data (populated or empty state based on stats.hasUnits).
 *
 * Sheet/Dialog state pattern mirrors CollectionPage (Phase 3):
 * - selectedUnitId: ID-based derivation to avoid stale unit data after mutations
 * - editingUnit / deletingUnit: direct object refs for Sheet/Dialog
 * - All three Sheet/Dialog mounted as TOP-LEVEL siblings (Pitfall 4 — never nested)
 * - All three keyed per entity?.id (POLISH-04 — forces fresh remount per unit)
 */
import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useHobbyAnalytics } from "@/hooks/useHobbyAnalytics";
import { UnitDetailSheet } from "@/features/units/UnitDetailSheet";
import { UnitSheet } from "@/features/units/UnitSheet";
import { UnitDeleteDialog } from "@/features/units/UnitDeleteDialog";
import { DatasheetImportDialog } from "@/features/units/DatasheetImportDialog";
import type { DatasheetImportPayload, DatasheetImportResolution } from "@/types/datasheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { UnitPhotoWithUrl } from "@/hooks/useUnitPhotos";
import type { Unit } from "@/types/unit";
import { useActiveFaction } from "@/context/ActiveFactionContext";
import { StatCard } from "./StatCard";
import { DashboardListRow } from "./DashboardListRow";
import { FactionSummaryCard } from "./FactionSummaryCard";
import { DashboardEmptyState } from "./DashboardEmptyState";

export function DashboardPage() {
  const { data: stats, isLoading, isError } = useDashboardStats();
  const { data: analytics, isLoading: analyticsLoading } = useHobbyAnalytics();
  const { activeFactionId, setActiveFaction } = useActiveFaction();

  // Sheet/dialog state — Pitfall 6: keep ID, derive unit from the displayed lists
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // JOUR-05 sibling lightbox — owned at DashboardPage level (mirrors CollectionPage pattern).
  const [lightboxPhoto, setLightboxPhoto] = useState<UnitPhotoWithUrl | null>(null);

  // DS-08 — conflict-resolution dialog state. Owned by DashboardPage so the
  // Dialog is a sibling of UnitDetailSheet's Sheet portal (not nested).
  const [conflictPayload, setConflictPayload] = useState<DatasheetImportPayload | null>(null);
  const [pendingResolution, setPendingResolution] = useState<{
    resolution: DatasheetImportResolution;
    payload: DatasheetImportPayload;
  } | null>(null);

  // Union of the two displayed lists so selectedUnit derivation covers both
  const allDisplayedUnits = useMemo(() => {
    if (!stats) return [];
    const seen = new Set<number>();
    const result: Unit[] = [];
    for (const u of [...stats.recentlyUpdated, ...stats.activeProjects]) {
      if (!seen.has(u.id)) {
        seen.add(u.id);
        result.push(u);
      }
    }
    return result;
  }, [stats]);

  const selectedUnit = useMemo(
    () =>
      selectedUnitId !== null
        ? allDisplayedUnits.find((u) => u.id === selectedUnitId) ?? null
        : null,
    [allDisplayedUnits, selectedUnitId]
  );

  const handleRowClick = (unit: Unit) => setSelectedUnitId(unit.id);
  const handleCloseDetail = () => setSelectedUnitId(null);
  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setEditSheetOpen(true);
  };
  const handleCloseEdit = () => {
    setEditSheetOpen(false);
    setEditingUnit(null);
  };
  const handleDelete = (unit: Unit) => {
    setDeletingUnit(unit);
    setDeleteDialogOpen(true);
  };
  const handleCloseDelete = () => {
    setDeleteDialogOpen(false);
    setDeletingUnit(null);
    if (selectedUnit && deletingUnit && selectedUnit.id === deletingUnit.id) {
      setSelectedUnitId(null);
    }
  };

  // --- Error state ---
  if (isError) {
    return (
      <div className="flex flex-col gap-12 p-6">
        <div className="flex items-center justify-between pb-6 border-b border-border/40">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Your hobby command center at a glance</p>
          </div>
          <div className="flex items-center gap-2" />
        </div>
        <p className="text-sm text-destructive">
          Failed to load dashboard. Try refreshing the app.
        </p>
      </div>
    );
  }

  // --- Loading state ---
  if (isLoading || !stats) {
    return (
      <div className="flex flex-col gap-12 p-6">
        <div className="flex items-center justify-between pb-6 border-b border-border/40">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Your hobby command center at a glance</p>
          </div>
          <div className="flex items-center gap-2" />
        </div>

        {/* Top stat row — 4 skeletons */}
        <div className="grid grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={`top-${i}`} className="h-24 w-full" />
          ))}
        </div>

        {/* Progress row — 3 skeletons */}
        <section className="flex flex-col gap-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Progress
          </p>
          <div className="grid grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={`prog-${i}`} className="h-24 w-full" />
            ))}
          </div>
        </section>

        {/* HOBBY HEALTH skeleton (Phase 19 ANLY-04/05) */}
        <section className="flex flex-col gap-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Hobby Health
          </p>
          <div className="grid grid-cols-2 gap-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </section>

        {/* Faction row — 3 skeletons (representative count) */}
        <section className="flex flex-col gap-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            By Faction
          </p>
          <div className="flex flex-wrap gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={`fac-${i}`} className="h-20 w-[180px]" />
            ))}
          </div>
        </section>

        {/* Lists — 2 columns of 5 skeletons each */}
        <div className="grid grid-cols-2 gap-6">
          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">Active Projects</h2>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={`act-${i}`} className="h-11 w-full" />
            ))}
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">Recently Updated</h2>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={`rec-${i}`} className="h-11 w-full" />
            ))}
          </section>
        </div>
      </div>
    );
  }

  // --- DASH-08: Empty state ---
  if (!stats.hasUnits) {
    return (
      <>
        <div className="flex flex-col gap-12 p-6">
          <div className="flex items-center justify-between pb-6 border-b border-border/40">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">Your hobby command center at a glance</p>
            </div>
            <div className="flex items-center gap-2" />
          </div>
          <DashboardEmptyState />
        </div>

        {/* Sibling sheets still mounted for forward-compat; no-op when no units */}
        <UnitDetailSheet
          key="none-detail"
          open={false}
          unit={null}
          onClose={handleCloseDetail}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onPhotoClick={(photo) => setLightboxPhoto(photo)}
        />
        <UnitSheet key="new-edit" open={false} unit={null} onClose={handleCloseEdit} />
        <UnitDeleteDialog key="none-delete" open={false} unit={null} onClose={handleCloseDelete} />
      </>
    );
  }

  // Helper: look up faction by id
  const factionById = (id: number) => stats.factions.find((f) => f.id === id);

  // --- Populated state ---
  return (
    <>
      <div className="flex flex-col gap-12 p-6">
        <div className="flex items-center justify-between pb-6 border-b border-border/40">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Your hobby command center at a glance</p>
          </div>
          <div className="flex items-center gap-2" />
        </div>

        {/* Top stat row (DASH-01) */}
        <div className="grid grid-cols-4 gap-6">
          <StatCard value={stats.totalModels} label="Total Models" animate={true} />
          <StatCard value={stats.fullyPainted} label="Fully Painted" animate={true} />
          <StatCard value={stats.battleReadyPoints} label="Battle-Ready Points" animate={true} />
          <StatCard value={stats.activeProjectsCount} label="Active Projects" animate={true} />
        </div>

        {/* Progress section (DASH-03, DASH-04) */}
        <section className="flex flex-col gap-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Progress
          </p>
          <div className="grid grid-cols-3 gap-6">
            <StatCard value={`${stats.paintingPct}%`} label="Painting Progress" />
            <StatCard value={`${stats.assemblyPct}%`} label="Assembly Progress" />
            <StatCard value={`${stats.basingPct}%`} label="Basing Progress" />
          </div>
        </section>

        {/* HOBBY HEALTH section (Phase 19 ANLY-04/05) */}
        <section className="flex flex-col gap-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Hobby Health
          </p>
          <div className="grid grid-cols-2 gap-6">
            {analyticsLoading ? (
              <>
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </>
            ) : (
              <>
                <StatCard
                  value={analytics?.velocityString ?? "0.0"}
                  label="Hobby Velocity · units/month"
                  animate={false}
                />
                <StatCard
                  value={analytics?.streakString ?? "0 days"}
                  label="Painting Streak"
                  animate={false}
                />
              </>
            )}
          </div>
        </section>

        {/* Faction section (DASH-02) */}
        <section className="flex flex-col gap-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            By Faction
          </p>
          <div className="flex flex-wrap gap-4">
            {stats.factionStats.map((s) => (
              <FactionSummaryCard
                key={s.faction.id}
                stat={s}
                isActive={activeFactionId === s.faction.id}
                onActivate={() => {
                  if (activeFactionId === s.faction.id) {
                    setActiveFaction(null);
                  } else {
                    setActiveFaction(s.faction);
                  }
                }}
              />
            ))}
          </div>
        </section>

        {/* Lists section (DASH-05, DASH-06) */}
        <div className="grid grid-cols-2 gap-6">
          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">Active Projects</h2>
            {stats.activeProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active projects yet</p>
            ) : (
              stats.activeProjects.map((unit) => (
                <DashboardListRow
                  key={unit.id}
                  unit={unit}
                  faction={factionById(unit.faction_id)}
                  onClick={handleRowClick}
                />
              ))
            )}
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">Recently Updated</h2>
            {stats.recentlyUpdated.length === 0 ? (
              <p className="text-sm text-muted-foreground">No units yet</p>
            ) : (
              stats.recentlyUpdated.map((unit) => (
                <DashboardListRow
                  key={unit.id}
                  unit={unit}
                  faction={factionById(unit.faction_id)}
                  showTime
                  onClick={handleRowClick}
                />
              ))
            )}
          </section>
        </div>
      </div>

      {/* Pitfall 4: SIBLINGS, not nested. POLISH-04: key forces fresh mount per unit. */}
      <UnitDetailSheet
        key={selectedUnit?.id ?? "none-detail"}
        open={selectedUnitId !== null}
        unit={selectedUnit}
        onClose={handleCloseDetail}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPhotoClick={(photo) => setLightboxPhoto(photo)}
        onDatasheetConflict={(payload) => setConflictPayload(payload)}
        pendingImportResolution={pendingResolution}
        onClearImportResolution={() => setPendingResolution(null)}
      />

      <UnitSheet
        key={editingUnit?.id ?? "new-edit"}
        open={editSheetOpen}
        unit={editingUnit}
        onClose={handleCloseEdit}
      />

      <UnitDeleteDialog
        key={deletingUnit?.id ?? "none-delete"}
        open={deleteDialogOpen}
        unit={deletingUnit}
        onClose={handleCloseDelete}
      />

      {/* JOUR-05 sibling photo lightbox — mounted at page level, NOT nested in UnitDetailSheet.
          See Phase 8 STATE.md: "Sibling Sheet/Dialog portal pattern — never nest Radix portals". */}
      <Dialog open={!!lightboxPhoto} onOpenChange={(o) => { if (!o) setLightboxPhoto(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{lightboxPhoto?.stage_label ?? ""}</DialogTitle>
            <DialogDescription>{lightboxPhoto?.caption ?? ""}</DialogDescription>
          </DialogHeader>
          {lightboxPhoto && (
            <img
              src={lightboxPhoto.assetUrl}
              alt={lightboxPhoto.stage_label ?? "Unit photo"}
              className="max-h-[70vh] w-auto mx-auto object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* DS-08 — conflict-resolution dialog. Sibling to Sheet portal — NEVER nested.
          PlaybookTab raises onDatasheetConflict via UnitDetailSheet → setConflictPayload.
          When the user confirms, we drop the payload back into pendingResolution and
          PlaybookTab subscribes via useEffect, applies the resolution, then calls
          onClearImportResolution to reset state. */}
      <DatasheetImportDialog
        open={conflictPayload !== null}
        conflicts={conflictPayload?.conflicts ?? []}
        onConfirm={(resolution) => {
          if (conflictPayload) setPendingResolution({ resolution, payload: conflictPayload });
          setConflictPayload(null);
        }}
        onClose={() => setConflictPayload(null)}
      />
    </>
  );
}
