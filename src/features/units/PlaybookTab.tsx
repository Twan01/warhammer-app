import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useStrategyNote, useUpsertStrategyNote } from "@/hooks/useStrategyNote";
import { useDatasheet, useWahapediaFactionId, DATASHEET_KEY } from "@/hooks/useDatasheet";
import { useUdbMeta } from "@/hooks/useUdbMeta";
import { useUnitOverride, useUpsertUnitOverride, useDeleteUnitOverride } from "@/hooks/useUnitOverride";
import type { UpsertUnitOverrideInput } from "@/types/unitOverride";
import { PlaybookStats, STAT_KEYS } from "@/features/units/PlaybookStats";
import type { StatKey } from "@/features/units/PlaybookStats";
import { PlaybookDatasheet } from "@/features/units/PlaybookDatasheet";
import { PlaybookRules } from "@/features/units/PlaybookRules";
import { PlaybookStrategy } from "@/features/units/PlaybookStrategy";
import { useFactions } from "@/hooks/useFactions";
import { useUnits } from "@/hooks/useUnits";
import { useQueryClient } from "@tanstack/react-query";
import type { StrategyNote, UpsertStrategyNoteInput } from "@/types/strategyNote";
import { DatasheetPicker } from "@/features/units/DatasheetPicker";
import { TierManager } from "@/features/units/TierManager";
import { LoadoutSection } from "@/features/units/LoadoutSection";
import { PlaybookDetachmentAbilities } from "@/features/units/PlaybookDetachmentAbilities";
import { getUdbUnitDetail } from "@/db/queries/unitDatabase";
import { linkUdbUnit } from "@/db/queries/units";
import { UNITS_KEY, UNITS_ENRICHED_KEY } from "@/hooks/useUnits";
import type { UdbUnitDetail } from "@/db/queries/unitDatabase";

interface PlaybookTabProps {
  unitId: number;
}

// Pure helpers -- no hooks, defined outside the component
function coerceStatToNumber(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const digits = raw.replace(/[^0-9]/g, "");
  return digits === "" ? null : Number(digits);
}

/** Extract a human-readable message from an unknown caught value. */
function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Unknown error";
}

export function PlaybookTab({ unitId }: PlaybookTabProps) {
  const { data, isLoading } = useStrategyNote(unitId);
  const upsert = useUpsertStrategyNote();
  const qc = useQueryClient();
  const { data: factions } = useFactions();
  const { data: units } = useUnits();
  const unit = useMemo(() => units?.find((u) => u.id === unitId) ?? null, [units, unitId]);
  const localFaction = useMemo(() => (unit && factions ? factions.find((f) => f.id === unit.faction_id) ?? null : null), [unit, factions]);
  const { data: wahapediaFactionId } = useWahapediaFactionId(localFaction?.name);
  const { data: udbMeta } = useUdbMeta();
  const { data: datasheet, error: datasheetError, refetch: refetchDatasheet } = useDatasheet(unitId);
  const { data: overrideRow } = useUnitOverride(unitId);
  const upsertOverride = useUpsertUnitOverride();
  const deleteOverride = useDeleteUnitOverride();

  // Local state
  const [move, setMove] = useState<number | null>(null);
  const [toughness, setToughness] = useState<number | null>(null);
  const [saveStat, setSaveStat] = useState<number | null>(null);
  const [wounds, setWounds] = useState<number | null>(null);
  const [leadership, setLeadership] = useState<number | null>(null);
  const [objectiveControl, setObjectiveControl] = useState<number | null>(null);
  const [abilities, setAbilities] = useState("");
  const [keywords, setKeywords] = useState("");
  const [battlefieldRole, setBattlefieldRole] = useState("");
  const [strengths, setStrengths] = useState("");
  const [weaknesses, setWeaknesses] = useState("");
  const [bestTargets, setBestTargets] = useState("");
  const [synergies, setSynergies] = useState("");
  const [mistakesToAvoid, setMistakesToAvoid] = useState("");
  const [rulesReferences, setRulesReferences] = useState("");
  const [notes, setNotes] = useState("");
  const [statsEditMode, setStatsEditMode] = useState(false);
  const [pointsOverrideValue, setPointsOverrideValue] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const initialRef = useRef<StrategyNote | null | undefined>(undefined);
  const autoOpenedRef = useRef(false);

  const hasDatasheetLink = datasheet !== null && datasheet !== undefined;

  // Init state from query
  useEffect(() => {
    if (data === undefined || initialRef.current !== undefined) return;
    initialRef.current = data;
    setMove(data?.move ?? null); setToughness(data?.toughness ?? null); setSaveStat(data?.save ?? null);
    setWounds(data?.wounds ?? null); setLeadership(data?.leadership ?? null); setObjectiveControl(data?.objective_control ?? null);
    setAbilities(data?.abilities ?? ""); setKeywords(data?.keywords ?? "");
    setBattlefieldRole(data?.battlefield_role ?? ""); setStrengths(data?.strengths ?? "");
    setWeaknesses(data?.weaknesses ?? ""); setBestTargets(data?.best_targets ?? "");
    setSynergies(data?.synergies ?? ""); setMistakesToAvoid(data?.mistakes_to_avoid ?? "");
    setRulesReferences(data?.rules_references ?? ""); setNotes(data?.notes ?? "");
  }, [data]);

  useEffect(() => {
    setPointsOverrideValue(overrideRow?.points != null ? String(overrideRow.points) : "");
  }, [overrideRow?.points]);

  // Auto-open picker when unit has no link and stats are empty
  useEffect(() => {
    if (autoOpenedRef.current || initialRef.current === undefined) return;
    if (!hasDatasheetLink && move === null && toughness === null && saveStat === null && wounds === null && leadership === null && objectiveControl === null && udbMeta) {
      setPickerOpen(true); autoOpenedRef.current = true;
    }
  }, [hasDatasheetLink, udbMeta, move, toughness, saveStat, wounds, leadership, objectiveControl]);

  const isDirty = useMemo(() => {
    const s = initialRef.current;
    if (s === undefined) return false;
    return move !== (s?.move ?? null) || toughness !== (s?.toughness ?? null) || saveStat !== (s?.save ?? null) ||
      wounds !== (s?.wounds ?? null) || leadership !== (s?.leadership ?? null) || objectiveControl !== (s?.objective_control ?? null) ||
      abilities !== (s?.abilities ?? "") || keywords !== (s?.keywords ?? "") || battlefieldRole !== (s?.battlefield_role ?? "") ||
      strengths !== (s?.strengths ?? "") || weaknesses !== (s?.weaknesses ?? "") || bestTargets !== (s?.best_targets ?? "") ||
      synergies !== (s?.synergies ?? "") || mistakesToAvoid !== (s?.mistakes_to_avoid ?? "") ||
      rulesReferences !== (s?.rules_references ?? "") || notes !== (s?.notes ?? "") ||
      pointsOverrideValue !== (overrideRow?.points != null ? String(overrideRow.points) : "");
  }, [move, toughness, saveStat, wounds, leadership, objectiveControl, abilities, keywords,
      battlefieldRole, strengths, weaknesses, bestTargets, synergies, mistakesToAvoid, rulesReferences, notes,
      pointsOverrideValue, overrideRow?.points]);

  // Stat helpers
  function statValue(key: StatKey): number | null {
    const local = (() => { switch (key) { case "M": return move; case "T": return toughness; case "Sv": return saveStat; case "W": return wounds; case "Ld": return leadership; case "OC": return objectiveControl; } })();
    if (local === null && hasDatasheetLink) return importedStatValue(key);
    return local;
  }
  function setStat(key: StatKey, v: number | null) {
    switch (key) { case "M": return setMove(v); case "T": return setToughness(v); case "Sv": return setSaveStat(v); case "W": return setWounds(v); case "Ld": return setLeadership(v); case "OC": return setObjectiveControl(v); }
  }
  function isStatOverridden(key: StatKey): boolean {
    if (!overrideRow) return false;
    const map: Record<StatKey, string> = { M: "move", T: "toughness", Sv: "save", W: "wounds", Ld: "leadership", OC: "objective_control" };
    const col = map[key] as keyof typeof overrideRow;
    return overrideRow[col] !== null && overrideRow[col] !== undefined;
  }
  function importedStatValue(key: StatKey): number | null {
    const model = datasheet?.models?.[0];
    if (!model) return null;
    const raw = (() => { switch (key) { case "M": return model.M; case "T": return model.T; case "Sv": return model.Sv; case "W": return model.W; case "Ld": return model.Ld; case "OC": return model.OC; default: return null; } })();
    if (raw === null || raw === undefined || raw === "") return null;
    return Number.isFinite(Number(String(raw).replace(/["+]/g, ""))) ? Number(String(raw).replace(/["+]/g, "")) : null;
  }

  async function handlePickerSelect(datasheetId: string) {
    setPickerOpen(false);
    try {
      // Link via udb_unit_id on the units table
      await linkUdbUnit(unitId, datasheetId);
      qc.invalidateQueries({ queryKey: DATASHEET_KEY(unitId) });
      qc.invalidateQueries({ queryKey: UNITS_KEY });
      qc.invalidateQueries({ queryKey: UNITS_ENRICHED_KEY });
      const fresh = await getUdbUnitDetail(datasheetId);
      if (!fresh) { toast.error("Unit not found in database."); return; }
      applyIncomingStats(fresh);
    } catch (err) {
      console.error("[PlaybookTab] handlePickerSelect failed:", err);
      toast.error(`Failed to link datasheet: ${errorMessage(err)}`);
    }
  }

  function applyIncomingStats(fresh: UdbUnitDetail) {
    const m0 = fresh.models[0] ?? null;
    if (m0) {
      if (move === null) setMove(coerceStatToNumber(m0.M));
      if (toughness === null) setToughness(coerceStatToNumber(m0.T));
      if (saveStat === null) setSaveStat(coerceStatToNumber(m0.Sv));
      if (wounds === null) setWounds(coerceStatToNumber(m0.W));
      if (leadership === null) setLeadership(coerceStatToNumber(m0.Ld));
      if (objectiveControl === null) setObjectiveControl(coerceStatToNumber(m0.OC));
    }
    if (!abilities.trim() && fresh.abilities.length > 0) {
      const abText = fresh.abilities.map((a) => `${a.name}${a.description ? ": " + a.description : ""}`).join("\n");
      setAbilities(abText);
    }
    if (!keywords.trim() && fresh.keywords.length > 0) {
      setKeywords(fresh.keywords.map((k) => k.keyword).join(", "));
    }
  }

  async function handleSave() {
    const payload: UpsertStrategyNoteInput = {
      unit_id: unitId, move, toughness, save: saveStat, wounds, leadership, objective_control: objectiveControl,
      abilities: abilities || null, keywords: keywords || null, battlefield_role: battlefieldRole || null,
      strengths: strengths || null, weaknesses: weaknesses || null, best_targets: bestTargets || null,
      synergies: synergies || null, mistakes_to_avoid: mistakesToAvoid || null,
      rules_references: rulesReferences || null, notes: notes || null,
    };
    try {
      await upsert.mutateAsync(payload);
      if (datasheet) {
        const pts = pointsOverrideValue.trim() !== "" ? parseInt(pointsOverrideValue, 10) : null;
        const parsedPts = pts !== null && Number.isFinite(pts) ? pts : null;
        // Only persist a value as an override when it actually differs from the imported
        // datasheet value. Convention (unitOverrides.ts): NULL = use imported, non-NULL =
        // manual override. Writing imported values here would falsely flag every stat as
        // manually overridden (showing the "manual override" pencil on untouched stats).
        const statOverride = (k: StatKey): number | null => {
          const imp = importedStatValue(k);
          const cur = statValue(k);
          return imp !== null && cur !== null && cur !== imp ? cur : null;
        };
        const importedKeywords = datasheet.keywords.length > 0 ? datasheet.keywords.map((k) => k.keyword).join(", ") : "";
        const importedAbilities = datasheet.abilities.length > 0
          ? datasheet.abilities.map((a) => `${a.name}${a.description ? ": " + a.description : ""}`).join("\n")
          : "";
        const keywordsOvr = keywords.trim() !== "" && keywords !== importedKeywords ? keywords : null;
        const abilitiesOvr = abilities.trim() !== "" && abilities !== importedAbilities ? abilities : null;
        const op: UpsertUnitOverrideInput = {
          unit_id: unitId, points: parsedPts,
          move: statOverride("M"), toughness: statOverride("T"), save: statOverride("Sv"),
          wounds: statOverride("W"), leadership: statOverride("Ld"), objective_control: statOverride("OC"),
          keywords: keywordsOvr, abilities: abilitiesOvr,
        };
        const hasStatOvr = STAT_KEYS.some((k) => statOverride(k) !== null);
        if (hasStatOvr || parsedPts !== null || keywordsOvr !== null || abilitiesOvr !== null) {
          try { await upsertOverride.mutateAsync(op); } catch (overrideErr) { console.error("[PlaybookTab] override save failed:", overrideErr); }
        }
      }
      toast.success("Playbook saved");
      initialRef.current = { ...(initialRef.current ?? {} as StrategyNote), ...payload } as StrategyNote;
      setStatsEditMode(false);
    } catch (err) {
      console.error("[PlaybookTab] handleSave failed:", err);
      toast.error(`Failed to save playbook: ${errorMessage(err)}`);
    }
  }

  function handleFieldChange(field: string, value: string) {
    const setters: Record<string, (v: string) => void> = { abilities: setAbilities, keywords: setKeywords, battlefield_role: setBattlefieldRole,
      strengths: setStrengths, weaknesses: setWeaknesses, best_targets: setBestTargets, synergies: setSynergies,
      mistakes_to_avoid: setMistakesToAvoid, rules_references: setRulesReferences, notes: setNotes };
    setters[field]?.(value);
  }

  return (
    <div className={`flex flex-col gap-6 p-4 ${isLoading ? "opacity-50 pointer-events-none" : ""}`} aria-busy={isLoading}>
      {datasheetError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive flex items-center justify-between gap-2">
          <span>Failed to load datasheet: {errorMessage(datasheetError)}.</span>
          <Button variant="outline" size="sm" onClick={() => refetchDatasheet()}>
            Retry
          </Button>
        </div>
      )}
      <PlaybookStats unitId={unitId} syncMeta={udbMeta} overrideRow={overrideRow} hasDatasheetLink={hasDatasheetLink}
        hasMultipleProfiles={(datasheet?.models?.length ?? 0) > 1} statsEditMode={statsEditMode}
        onToggleStatsEditMode={() => setStatsEditMode((v) => !v)} wahapediaFactionId={wahapediaFactionId}
        onPickerOpen={() => setPickerOpen(true)}
        onDeleteOverride={(id) => deleteOverride.mutate(id, { onSuccess: () => toast.success("Overrides cleared"), onError: () => toast.error("Failed to clear overrides") })}
        statValue={statValue} setStat={setStat} importedStatValue={importedStatValue} isStatOverridden={isStatOverridden}
        pointsOverrideValue={pointsOverrideValue} onPointsOverrideChange={setPointsOverrideValue}
        unitPoints={unit?.points} />
      <Separator />
      <PlaybookDatasheet datasheet={datasheet} />
      <PlaybookRules />
      {wahapediaFactionId && <PlaybookDetachmentAbilities factionId={wahapediaFactionId} />}
      <TierManager unitId={unitId} />
      <Separator />
      <LoadoutSection unitId={unitId} />
      <Separator />
      <PlaybookStrategy abilities={abilities} keywords={keywords} battlefieldRole={battlefieldRole} strengths={strengths}
        weaknesses={weaknesses} bestTargets={bestTargets} synergies={synergies} mistakesToAvoid={mistakesToAvoid}
        rulesReferences={rulesReferences} notes={notes} onFieldChange={handleFieldChange} />
      {(() => {
        const saveDisabled = !isDirty || isLoading || upsert.isPending;
        const tooltipMessage = isLoading ? "Loading..." : "No changes to save";
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={saveDisabled ? "w-full" : undefined}>
                  <Button type="button" variant="default" className="w-full mt-4" disabled={saveDisabled} onClick={handleSave}>
                    Save Playbook
                  </Button>
                </span>
              </TooltipTrigger>
              {saveDisabled && (
                <TooltipContent>{tooltipMessage}</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      })()}
      <DatasheetPicker open={pickerOpen} factionId={wahapediaFactionId ?? undefined}
        factionName={localFaction?.name ?? "this faction"}
        onSelect={(id) => { void handlePickerSelect(id); }} onClose={() => setPickerOpen(false)} />
    </div>
  );
}
