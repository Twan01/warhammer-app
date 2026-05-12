/**
 * DASH-01..06 — Hobby Command Center top-level page (Phase 26 rework).
 *
 * Renders three branches: isLoading (Skeletons), isError (error message),
 * and data (empty state via DashboardEmptyState OR populated layout).
 *
 * Layout (populated state, top-to-bottom):
 *   1. PageHeader  — "Hobby Command Center" + dynamic subtitle + actions
 *   2. CurrentFocusCard  — full-width primary anchor (DASH-03)
 *   3. Top stat row  — 4 StatCards (unchanged from Phase 11)
 *   4. HobbyPipeline  — 11-stage strip (DASH-04, replaces Progress section)
 *   5. Hobby Health  — Velocity + Streak (Phase 19, unchanged)
 *   6. By Faction  — upgraded FactionSummaryCards (DASH-05)
 *   7. RecentActivityFeed  — 10-event feed (DASH-06, replaces 2-column lists)
 *
 * Sibling portal contract (Pitfall 1): every Sheet/Dialog is a TOP-LEVEL
 * sibling of the main content div, never nested. The Quick Add UnitSheet
 * uses key="quick-add" so it's a separate React instance from the edit
 * UnitSheet (Pitfall 2). selectedUnit derives from stats.units (full array)
 * not the sliced sub-arrays (Pitfall 3). Loading/error branches do NOT
 * access stats fields in subtitle (Pitfall 7).
 */
import { useMemo, useState } from "react";
import { Plus, Paintbrush } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useHobbyAnalytics } from "@/hooks/useHobbyAnalytics";
import { useRecentActivity } from "@/hooks/useRecentActivity";
import { getRecipeNamesByUnitIds } from "@/db/queries/recipes";
import { useWorkflowPositions } from "@/hooks/useWorkflowPositions";
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
import { useLatestUnitPhotos } from "@/hooks/useUnitPhotos";
import type { UnitPhotoWithUrl } from "@/hooks/useUnitPhotos";
import type { Unit } from "@/types/unit";
import { useActiveFaction } from "@/context/ActiveFactionContext";
import { StatCard } from "./StatCard";
import { FactionSummaryCard } from "./FactionSummaryCard";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { CurrentFocusCard } from "./CurrentFocusCard";
import { HobbyPipeline } from "./HobbyPipeline";
import { RecentActivityFeed } from "./RecentActivityFeed";
import { ArmyReadinessCard } from "./ArmyReadinessCard";
import { ActiveProjectsPanel } from "./ActiveProjectsPanel";
import { LogSessionSheet } from "./LogSessionSheet";
import { PageHeader } from "@/components/common/PageHeader";

export function DashboardPage() {
  const { data: stats, isLoading, isError } = useDashboardStats();
  const { data: analytics, isLoading: analyticsLoading } = useHobbyAnalytics();
  const { data: activityEvents } = useRecentActivity(stats?.units);
  const { activeFactionId, setActiveFaction, activeFactionHex } = useActiveFaction();
  const { data: latestPhotos } = useLatestUnitPhotos();

  // Sheet/dialog state
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Phase 26 — Quick Add (UnitSheet create mode) + Log Session sheet
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [logSessionOpen, setLogSessionOpen] = useState(false);
  const [logDefaultUnitId, setLogDefaultUnitId] = useState<number | undefined>(undefined);

  // JOUR-05 sibling lightbox — owned at DashboardPage level
  const [lightboxPhoto, setLightboxPhoto] = useState<UnitPhotoWithUrl | null>(null);

  // DATA-06 — recipe name for focus unit (called unconditionally per Rules of Hooks)
  const focusUnitId = stats?.activeProjects?.[0]?.id ?? null;
  const { data: focusRecipes } = useQuery({
    queryKey: ["recipes", "by-unit", focusUnitId ?? 0],
    queryFn: () => getRecipeNamesByUnitIds([focusUnitId!]),
    enabled: focusUnitId !== null,
  });
  const { data: focusWorkflowPositions } = useWorkflowPositions(
    focusUnitId !== null ? [focusUnitId] : [],
  );

  // DS-08 — conflict-resolution dialog state
  const [conflictPayload, setConflictPayload] = useState<DatasheetImportPayload | null>(null);
  const [pendingResolution, setPendingResolution] = useState<{
    resolution: DatasheetImportResolution;
    payload: DatasheetImportPayload;
  } | null>(null);

  // Pitfall 3 — selectedUnit derives from the full units array (Wave 1 added stats.units)
  const allDisplayedUnits = useMemo<Unit[]>(() => stats?.units ?? [], [stats]);

  const selectedUnit = useMemo(
    () =>
      selectedUnitId !== null
        ? allDisplayedUnits.find((u) => u.id === selectedUnitId) ?? null
        : null,
    [allDisplayedUnits, selectedUnitId]
  );

  const handleUnitIdClick = (unitId: number) => setSelectedUnitId(unitId);
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

  // --- Error state (Pitfall 7: do not access stats here) ---
  if (isError) {
    return (
      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[3fr_2fr] items-start">
        <div className="col-span-full">
          <PageHeader title="Hobby Command Center" />
        </div>
        <p className="col-span-full text-sm text-destructive">
          Failed to load dashboard. Try refreshing the app.
        </p>
      </div>
    );
  }

  // --- Loading state (Pitfall 7: do not access stats here) ---
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[3fr_2fr] items-start">
        {/* PageHeader — full width */}
        <div className="col-span-full">
          <PageHeader title="Hobby Command Center" />
        </div>

        {/* CurrentFocusCard skeleton — full width */}
        <Skeleton className="col-span-full h-32 w-full" />

        {/* StatCards skeleton — full width, 4-col inner grid */}
        <div className="col-span-full grid grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={`top-${i}`} className="h-24 w-full" />
          ))}
        </div>

        {/* Pipeline skeleton — full width */}
        <Skeleton className="col-span-full h-32 w-full" />

        {/* Left column: Hobby Health + Faction skeletons */}
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-4">
            <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Hobby Health
            </p>
            <div className="grid grid-cols-2 gap-6">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </section>
          <section className="flex flex-col gap-4">
            <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              By Faction
            </p>
            <div className="flex flex-wrap gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={`fac-${i}`} className="h-32 w-[220px]" />
              ))}
            </div>
          </section>
        </div>

        {/* Right column: Active Projects + Recent Activity + Army Readiness skeletons */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Active Projects
            </p>
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={`proj-${i}`} className="h-14 w-full" />
              ))}
            </div>
          </div>
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  // --- DASH-08: Empty state — Quick Add still available so user can add their first unit ---
  if (!stats.hasUnits) {
    return (
      <>
        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[3fr_2fr] items-start">
          <div className="col-span-full">
            <PageHeader
              title="Hobby Command Center"
              actions={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickAddOpen(true)}
                >
                  <Plus size={14} className="mr-1.5" aria-hidden={true} />
                  Quick Add
                </Button>
              }
            />
          </div>
          <div className="col-span-full">
            <DashboardEmptyState />
          </div>
        </div>

        {/* Sibling sheets — Quick Add must work in empty state */}
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
        <UnitSheet
          key="quick-add"
          open={quickAddOpen}
          unit={null}
          onClose={() => setQuickAddOpen(false)}
        />
        <UnitDeleteDialog key="none-delete" open={false} unit={null} onClose={handleCloseDelete} />
      </>
    );
  }

  // Helper: look up faction by id
  const factionById = (id: number) => stats.factions.find((f) => f.id === id);

  // DASH-03 — most recently active project (already sorted DESC by computeStats)
  const focusUnit = stats.activeProjects[0] ?? null;
  const focusFaction = focusUnit ? factionById(focusUnit.faction_id) : undefined;

  // DASH-01 — dynamic subtitle (middle dot separator U+00B7)
  const subtitle = `${stats.activeProjectsCount} active projects · ${stats.totalModels} models tracked · ${stats.battleReadyPoints} battle-ready points`;

  // --- Populated state ---
  return (
    <>
      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[3fr_2fr] items-start">
        {/* VIS-02 — Hero gradient wrapper: PageHeader + StatCards */}
        <div
          className="col-span-full rounded-xl p-6 -m-0"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${activeFactionHex}12 0%, transparent 70%)`,
          }}
        >
          <div className="mb-6">
            <PageHeader
              title="Hobby Command Center"
              subtitle={subtitle}
              actions={
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLogDefaultUnitId(undefined);  // Header button = no pre-selection
                      setLogSessionOpen(true);
                    }}
                  >
                    <Paintbrush size={14} className="mr-1.5" aria-hidden={true} />
                    Log Session
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickAddOpen(true)}
                  >
                    <Plus size={14} className="mr-1.5" aria-hidden={true} />
                    Quick Add
                  </Button>
                </>
              }
            />
          </div>
          <div className="grid grid-cols-4 gap-6">
            <StatCard value={stats.totalModels} label="Total Models" animate={true} to="/collection" />
            <StatCard value={stats.fullyPainted} label="Fully Painted" animate={true} to="/collection" />
            <StatCard value={stats.battleReadyPoints} label="Battle-Ready Points" animate={true} to="/army-lists" />
            <StatCard value={stats.activeProjectsCount} label="Active Projects" animate={true} to="/painting-projects" />
          </div>
        </div>

        {/* DASH-03 — primary visual anchor — full width */}
        <div className="col-span-full">
          <CurrentFocusCard
            unit={focusUnit}
            faction={focusFaction}
            photo={latestPhotos?.get(focusUnit?.id ?? -1)}
            onOpen={() => focusUnit && setSelectedUnitId(focusUnit.id)}
            onLog={() => {
              if (focusUnit) {
                setLogDefaultUnitId(focusUnit.id);
                setLogSessionOpen(true);
              }
            }}
            recipeName={focusRecipes?.[0]?.name ?? null}
            extraRecipeCount={Math.max(0, (focusRecipes?.length ?? 0) - 1)}
            workflowPosition={focusWorkflowPositions?.get(focusUnit?.id ?? -1)}
          />
        </div>

        {/* DASH-04 — HobbyPipeline replaces the old Progress section — full width */}
        <div className="col-span-full">
          <HobbyPipeline units={stats.units} />
        </div>

        {/* Left column: Hobby Health + By Faction stacked */}
        <div className="flex flex-col gap-6">
          {/* HOBBY HEALTH section (Phase 19) — Hobby Health StatCards have NO to prop */}
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

          {/* By Faction section (DASH-05 — FactionSummaryCard upgraded in-place) */}
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
        </div>

        {/* Right column: Active Projects + Recent Activity + Army Readiness stacked */}
        <div className="flex flex-col gap-6">
          <ActiveProjectsPanel
            projects={stats.activeProjects}
            factions={stats.factions}
            latestPhotos={latestPhotos}
            onOpen={(unitId) => setSelectedUnitId(unitId)}
            onLog={(unitId) => {
              setLogDefaultUnitId(unitId);
              setLogSessionOpen(true);
            }}
          />
          <RecentActivityFeed
            events={activityEvents ?? []}
            onUnitClick={handleUnitIdClick}
          />
          <ArmyReadinessCard />
        </div>
      </div>

      {/* Pitfall 1: SIBLINGS, never nested. POLISH-04: key forces fresh mount per unit. */}
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

      {/* Edit-mode UnitSheet (existing) */}
      <UnitSheet
        key={editingUnit?.id ?? "new-edit"}
        open={editSheetOpen}
        unit={editingUnit}
        onClose={handleCloseEdit}
      />

      {/* Pitfall 2: Quick Add UnitSheet is a SEPARATE React instance with key="quick-add" */}
      <UnitSheet
        key="quick-add"
        open={quickAddOpen}
        unit={null}
        onClose={() => setQuickAddOpen(false)}
      />

      {/* Phase 26 — Log Session sheet (sibling, never nested) */}
      <LogSessionSheet
        open={logSessionOpen}
        onClose={() => {
          setLogSessionOpen(false);
          setLogDefaultUnitId(undefined);  // Reset to prevent stale pre-selection (Pitfall 3)
        }}
        defaultUnitId={logDefaultUnitId}
      />

      <UnitDeleteDialog
        key={deletingUnit?.id ?? "none-delete"}
        open={deleteDialogOpen}
        unit={deletingUnit}
        onClose={handleCloseDelete}
      />

      {/* JOUR-05 sibling photo lightbox */}
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

      {/* DS-08 — conflict-resolution dialog */}
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
