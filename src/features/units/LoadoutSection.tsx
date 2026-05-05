import { useMemo, useState } from "react";
import { Plus, Trash2, ChevronDown, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  useUnitLoadouts,
  useCreateLoadout,
  useDeleteLoadout,
  useActivateLoadout,
  useAddWargearToLoadout,
  useRemoveWargearFromLoadout,
} from "@/hooks/useUnitLoadouts";
import { useDatasheet } from "@/hooks/useDatasheet";
import type { RwDatasheetWargear } from "@/types/datasheet";
import type { UnitLoadout } from "@/types/unitLoadout";

const SECTION_LABEL_CLASS =
  "text-xs font-semibold text-muted-foreground uppercase tracking-wide";

interface LoadoutSectionProps {
  unitId: number;
}

export function LoadoutSection({ unitId }: LoadoutSectionProps) {
  const { data: loadouts = [] } = useUnitLoadouts(unitId);
  const { data: datasheet } = useDatasheet(unitId);
  const createLoadout = useCreateLoadout();
  const deleteLoadout = useDeleteLoadout();
  const activateLoadout = useActivateLoadout();
  const addWargear = useAddWargearToLoadout();
  const removeWargear = useRemoveWargearFromLoadout();

  const [newLoadoutName, setNewLoadoutName] = useState<string>("");
  const [expandedLoadoutId, setExpandedLoadoutId] = useState<number | null>(null);
  const [manualWeaponName, setManualWeaponName] = useState<string>("");

  // Pattern 5: group wargear by line field, sorted ASC
  const wargearByLine = useMemo<Array<[number, RwDatasheetWargear[]]>>(() => {
    const groups = new Map<number, RwDatasheetWargear[]>();
    for (const w of datasheet?.wargear ?? []) {
      const bucket = groups.get(w.line) ?? [];
      bucket.push(w);
      groups.set(w.line, bucket);
    }
    return [...groups.entries()].sort(([a], [b]) => a - b);
  }, [datasheet?.wargear]);

  const allDatasheetWeaponNames = useMemo(
    () => new Set((datasheet?.wargear ?? []).map((w) => w.name)),
    [datasheet?.wargear],
  );

  function handleCreateLoadout() {
    const name = newLoadoutName.trim();
    if (!name) {
      toast.error("Enter a loadout name.");
      return;
    }
    createLoadout.mutate(
      { unit_id: unitId, name },
      {
        onSuccess: () => setNewLoadoutName(""),
        onError: (err) => toast.error(`Failed to create loadout: ${err.message}`),
      },
    );
  }

  function handleDeleteLoadout(id: number) {
    deleteLoadout.mutate(
      { id, unitId },
      { onError: (err) => toast.error(`Failed to delete loadout: ${err.message}`) },
    );
  }

  function handleActivateLoadout(loadoutId: number) {
    activateLoadout.mutate(
      { loadoutId, unitId },
      { onError: (err) => toast.error(`Failed to activate loadout: ${err.message}`) },
    );
  }

  function handleToggleWargear(loadout: UnitLoadout, weapon: RwDatasheetWargear) {
    const existing = loadout.wargear.find((w) => w.weapon_name === weapon.name);
    if (existing) {
      removeWargear.mutate(
        { id: existing.id, unitId },
        { onError: (err) => toast.error(`Failed to remove wargear: ${err.message}`) },
      );
    } else {
      addWargear.mutate(
        { loadout_id: loadout.id, weapon_name: weapon.name, weapon_line: weapon.line, is_manual: false, unitId },
        { onError: (err) => toast.error(`Failed to add wargear: ${err.message}`) },
      );
    }
  }

  function handleAddManualWargear(loadout: UnitLoadout) {
    const name = manualWeaponName.trim();
    if (!name) {
      toast.error("Enter a weapon name.");
      return;
    }
    addWargear.mutate(
      { loadout_id: loadout.id, weapon_name: name, weapon_line: null, is_manual: true, unitId },
      {
        onSuccess: () => setManualWeaponName(""),
        onError: (err) => toast.error(`Failed to add weapon: ${err.message}`),
      },
    );
  }

  function handleRemoveWargear(wargearId: number) {
    removeWargear.mutate(
      { id: wargearId, unitId },
      { onError: (err) => toast.error(`Failed to remove wargear: ${err.message}`) },
    );
  }

  const hasDatasheetLink = datasheet !== null && datasheet !== undefined;

  return (
    <div className="flex flex-col gap-3">
      <span className={SECTION_LABEL_CLASS}>Loadouts</span>

      {/* Create loadout row */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Loadout name…"
          className="h-7 text-sm flex-1"
          value={newLoadoutName}
          onChange={(e) => setNewLoadoutName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleCreateLoadout(); }}
          aria-label="New loadout name"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7 shrink-0"
          aria-label="Create loadout"
          onClick={handleCreateLoadout}
          disabled={createLoadout.isPending}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Empty state */}
      {loadouts.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {!hasDatasheetLink
            ? "No datasheet linked. Link a datasheet above to auto-populate wargear options, or create a loadout and add weapons manually."
            : "No loadouts defined. Create a named loadout to track your wargear selections."}
        </p>
      )}

      {/* Loadout list */}
      {loadouts.map((loadout) => (
        <Collapsible
          key={loadout.id}
          open={expandedLoadoutId === loadout.id}
          onOpenChange={(open) => setExpandedLoadoutId(open ? loadout.id : null)}
        >
          <div className="rounded-md border border-border bg-card">
            {/* Trigger row */}
            <div className="flex items-center gap-2 px-3 py-2">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 flex-1 text-left min-w-0"
                  aria-label={`Toggle loadout ${loadout.name}`}
                >
                  <span className="font-medium text-sm truncate">{loadout.name}</span>
                  {loadout.is_active === 1 && (
                    <Badge variant="outline" className="text-green-600 border-green-500 shrink-0 text-xs">
                      Active
                    </Badge>
                  )}
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform ${
                      expandedLoadoutId === loadout.id ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  />
                </button>
              </CollapsibleTrigger>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                aria-label={`Activate loadout ${loadout.name}`}
                onClick={() => handleActivateLoadout(loadout.id)}
                disabled={activateLoadout.isPending || loadout.is_active === 1}
              >
                <Star
                  className={`h-3.5 w-3.5 ${loadout.is_active === 1 ? "fill-yellow-400 text-yellow-400" : ""}`}
                  aria-hidden="true"
                />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                aria-label={`Delete loadout ${loadout.name}`}
                onClick={() => handleDeleteLoadout(loadout.id)}
                disabled={deleteLoadout.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>

            {/* Wargear content (expanded) */}
            <CollapsibleContent>
              <Separator />
              <div className="flex flex-col gap-3 px-3 py-3">
                {hasDatasheetLink ? (
                  <>
                    {/* Datasheet wargear grouped by line */}
                    {wargearByLine.map(([line, weapons]) => (
                      <div key={line} className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          Option group {line}
                        </span>
                        {weapons.map((weapon) => {
                          const isChecked = loadout.wargear.some((w) => w.weapon_name === weapon.name);
                          const checkboxId = `wargear-${loadout.id}-${weapon.line}-${weapon.line_in_wargear}`;
                          return (
                            <label
                              key={`${weapon.line}-${weapon.line_in_wargear}`}
                              htmlFor={checkboxId}
                              className="flex items-center gap-2 cursor-pointer group"
                            >
                              <input
                                id={checkboxId}
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleWargear(loadout, weapon)}
                                className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                              />
                              <span className="text-sm group-hover:text-foreground text-foreground/80">
                                {weapon.name}
                              </span>
                              {weapon.type && (
                                <span className="text-[10px] text-muted-foreground">
                                  {weapon.type}
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    ))}
                  </>
                ) : (
                  /* No datasheet: manual weapon input */
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Weapon name…"
                      className="h-7 text-sm flex-1"
                      value={manualWeaponName}
                      onChange={(e) => setManualWeaponName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddManualWargear(loadout); }}
                      aria-label="Manual weapon name"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      aria-label="Add weapon"
                      onClick={() => handleAddManualWargear(loadout)}
                      disabled={addWargear.isPending}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                )}

                {/* Currently selected wargear list */}
                {loadout.wargear.length > 0 && (
                  <div className="flex flex-col gap-1 pt-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Selected wargear
                    </span>
                    {loadout.wargear.map((w) => {
                      const isStale =
                        w.is_manual === 0 && !allDatasheetWeaponNames.has(w.weapon_name);
                      return (
                        <div key={w.id} className="flex items-center gap-2">
                          <span className="text-sm flex-1 truncate">{w.weapon_name}</span>
                          {isStale && (
                            <Badge
                              variant="outline"
                              className="text-yellow-600 border-yellow-500 text-[10px] px-1"
                            >
                              Stale — weapon may have been renamed after last sync
                            </Badge>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 shrink-0"
                            aria-label={`Remove ${w.weapon_name}`}
                            onClick={() => handleRemoveWargear(w.id)}
                            disabled={removeWargear.isPending}
                          >
                            <Trash2 className="h-3 w-3" aria-hidden="true" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ))}
    </div>
  );
}
