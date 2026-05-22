import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useStrategyNote, useUpsertStrategyNote } from "@/hooks/useStrategyNote";
import { useDatasheet, useRulesSyncMeta, useWahapediaFactionId, DATASHEET_KEY } from "@/hooks/useDatasheet";
import { useRulesSync } from "@/hooks/useRulesSync";
import { useUnitOverride, useUpsertUnitOverride, useDeleteUnitOverride } from "@/hooks/useUnitOverride";
import type { SyncDiff } from "@/lib/computeSyncDiff";
import type { UpsertUnitOverrideInput } from "@/types/unitOverride";
import { useRulesSyncErrors } from "@/hooks/useSyncErrors";
import { PlaybookStats, STAT_KEYS } from "@/features/units/PlaybookStats";
import type { StatKey } from "@/features/units/PlaybookStats";
import { PlaybookSyncDetails } from "@/features/units/PlaybookSyncDetails";
import { PlaybookDatasheet } from "@/features/units/PlaybookDatasheet";
import { PlaybookRules } from "@/features/units/PlaybookRules";
import { PlaybookStrategy } from "@/features/units/PlaybookStrategy";
import { useStratagemsByFaction, useDetachmentsByFaction, useSharedAbilitiesByFaction } from "@/hooks/useRulesExtended";
import { useFactions } from "@/hooks/useFactions";
import { useUnits } from "@/hooks/useUnits";
import { useQueryClient } from "@tanstack/react-query";
import { upsertDatasheetLink } from "@/db/queries/datasheets";
import type { DatasheetConflict, DatasheetImportPayload, FullDatasheet, RwDatasheetAbility } from "@/types/datasheet";
import type { StrategyNote, UpsertStrategyNoteInput } from "@/types/strategyNote";
import { DatasheetPicker } from "@/features/units/DatasheetPicker";
import { TierManager } from "@/features/units/TierManager";
import { LoadoutSection } from "@/features/units/LoadoutSection";

interface PlaybookTabProps {
  unitId: number;
  onDatasheetConflict?: (payload: DatasheetImportPayload) => void;
  pendingImportResolution?: { resolution: import("@/types/datasheet").DatasheetImportResolution; payload: DatasheetImportPayload } | null;
  onClearImportResolution?: () => void;
}

// Pure helpers — no hooks, defined outside the component
function coerceStatToNumber(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const digits = raw.replace(/[^0-9]/g, "");
  return digits === "" ? null : Number(digits);
}

function formatAbilitiesAsText(list: RwDatasheetAbility[]): string {
  return list.map((a) => `${a.name}${a.description ? ": " + a.description : ""}`).join("\n");
}

function formatSyncDate(iso: string | null): string {
  if (!iso) return "---";
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

export function PlaybookTab({ unitId, onDatasheetConflict, pendingImportResolution, onClearImportResolution }: PlaybookTabProps) {
  const { data, isLoading } = useStrategyNote(unitId);
  const upsert = useUpsertStrategyNote();
  const qc = useQueryClient();
  const { data: factions } = useFactions();
  const { data: units } = useUnits();
  const unit = useMemo(() => units?.find((u) => u.id === unitId) ?? null, [units, unitId]);
  const localFaction = useMemo(() => (unit && factions ? factions.find((f) => f.id === unit.faction_id) ?? null : null), [unit, factions]);
  const { data: wahapediaFactionId } = useWahapediaFactionId(localFaction?.name);
  const { data: syncMeta } = useRulesSyncMeta();
  const { data: syncErrors = [] } = useRulesSyncErrors();
  const { data: datasheet } = useDatasheet(unitId);
  const rulesSync = useRulesSync();
  const { data: overrideRow } = useUnitOverride(unitId);
  const upsertOverride = useUpsertUnitOverride();
  const deleteOverride = useDeleteUnitOverride();
  const { data: stratagems = [] } = useStratagemsByFaction(wahapediaFactionId ?? undefined);
  const { data: detachments = [] } = useDetachmentsByFaction(wahapediaFactionId ?? undefined);
  const { data: sharedAbilities = [] } = useSharedAbilitiesByFaction(wahapediaFactionId ?? undefined);

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
  const [lastSyncDiff, setLastSyncDiff] = useState<SyncDiff | null>(null);
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

  // DS-04 auto-open picker
  useEffect(() => {
    if (autoOpenedRef.current || initialRef.current === undefined) return;
    if (!hasDatasheetLink && move === null && toughness === null && saveStat === null && wounds === null && leadership === null && objectiveControl === null && syncMeta) {
      setPickerOpen(true); autoOpenedRef.current = true;
    }
  }, [hasDatasheetLink, syncMeta, move, toughness, saveStat, wounds, leadership, objectiveControl]);

  // Import resolution subscription
  useEffect(() => {
    if (!pendingImportResolution) return;
    const { resolution, payload } = pendingImportResolution;
    const m0 = payload.datasheet.models[0] ?? null;
    const abText = formatAbilitiesAsText(payload.datasheet.abilities);
    const kwText = payload.datasheet.keywords.map((k) => k.keyword).join(", ");
    if (resolution.M === "use" && m0) setMove(coerceStatToNumber(m0.M));
    if (resolution.T === "use" && m0) setToughness(coerceStatToNumber(m0.T as unknown as string));
    if (resolution.Sv === "use" && m0) setSaveStat(coerceStatToNumber(m0.Sv));
    if (resolution.W === "use" && m0) setWounds(coerceStatToNumber(m0.W as unknown as string));
    if (resolution.Ld === "use" && m0) setLeadership(coerceStatToNumber(m0.Ld));
    if (resolution.OC === "use" && m0) setObjectiveControl(coerceStatToNumber(m0.OC as unknown as string));
    if (resolution.abilities === "use") setAbilities(abText);
    if (resolution.keywords === "use") setKeywords(kwText);
    onClearImportResolution?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingImportResolution]);

  const isDirty = useMemo(() => {
    const s = initialRef.current;
    if (s === undefined) return false;
    return move !== (s?.move ?? null) || toughness !== (s?.toughness ?? null) || saveStat !== (s?.save ?? null) ||
      wounds !== (s?.wounds ?? null) || leadership !== (s?.leadership ?? null) || objectiveControl !== (s?.objective_control ?? null) ||
      abilities !== (s?.abilities ?? "") || keywords !== (s?.keywords ?? "") || battlefieldRole !== (s?.battlefield_role ?? "") ||
      strengths !== (s?.strengths ?? "") || weaknesses !== (s?.weaknesses ?? "") || bestTargets !== (s?.best_targets ?? "") ||
      synergies !== (s?.synergies ?? "") || mistakesToAvoid !== (s?.mistakes_to_avoid ?? "") ||
      rulesReferences !== (s?.rules_references ?? "") || notes !== (s?.notes ?? "");
  }, [move, toughness, saveStat, wounds, leadership, objectiveControl, abilities, keywords,
      battlefieldRole, strengths, weaknesses, bestTargets, synergies, mistakesToAvoid, rulesReferences, notes]);

  // Stat helpers
  function statValue(key: StatKey): number | null {
    switch (key) { case "M": return move; case "T": return toughness; case "Sv": return saveStat; case "W": return wounds; case "Ld": return leadership; case "OC": return objectiveControl; }
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
      await upsertDatasheetLink({ unit_id: unitId, datasheet_id: datasheetId });
      qc.invalidateQueries({ queryKey: DATASHEET_KEY(unitId) });
      const { getFullDatasheet } = await import("@/db/queries/datasheets");
      const fresh = await getFullDatasheet(datasheetId);
      if (!fresh) { toast.error("Datasheet not found in rules database — try re-syncing."); return; }
      applyIncomingOrRouteConflicts(fresh);
    } catch { toast.error("Failed to link datasheet — try again."); }
  }

  function applyIncomingOrRouteConflicts(fresh: FullDatasheet) {
    const m0 = fresh.models[0] ?? null;
    const inc = { M: m0 ? coerceStatToNumber(m0.M) : null, T: m0 ? coerceStatToNumber(m0.T as unknown as string) : null,
      Sv: m0 ? coerceStatToNumber(m0.Sv) : null, W: m0 ? coerceStatToNumber(m0.W as unknown as string) : null,
      Ld: m0 ? coerceStatToNumber(m0.Ld) : null, OC: m0 ? coerceStatToNumber(m0.OC as unknown as string) : null,
      ab: formatAbilitiesAsText(fresh.abilities), kw: fresh.keywords.map((k) => k.keyword).join(", ") };
    const cur = { M: move, T: toughness, Sv: saveStat, W: wounds, Ld: leadership, OC: objectiveControl };
    const conflicts: DatasheetConflict[] = [];
    (["M","T","Sv","W","Ld","OC"] as const).forEach((k) => {
      if (cur[k] !== null && inc[k] !== null && cur[k] !== inc[k])
        conflicts.push({ key: k, label: k, currentValue: String(cur[k]), incomingValue: String(inc[k]), choice: "use" });
    });
    if (abilities.trim() && inc.ab.trim() && abilities.trim() !== inc.ab.trim())
      conflicts.push({ key: "abilities", label: "Personal Ability Notes", currentValue: abilities, incomingValue: inc.ab, choice: "use" });
    if (keywords.trim() && inc.kw.trim() && keywords.trim() !== inc.kw.trim())
      conflicts.push({ key: "keywords", label: "Keywords", currentValue: keywords, incomingValue: inc.kw, choice: "use" });
    if (conflicts.length === 0) {
      if (inc.M !== null && move === null) setMove(inc.M); if (inc.T !== null && toughness === null) setToughness(inc.T);
      if (inc.Sv !== null && saveStat === null) setSaveStat(inc.Sv); if (inc.W !== null && wounds === null) setWounds(inc.W);
      if (inc.Ld !== null && leadership === null) setLeadership(inc.Ld); if (inc.OC !== null && objectiveControl === null) setObjectiveControl(inc.OC);
      if (!abilities.trim() && inc.ab.trim()) setAbilities(inc.ab); if (!keywords.trim() && inc.kw.trim()) setKeywords(inc.kw);
      return;
    }
    onDatasheetConflict?.({ unitId, datasheet: fresh, conflicts });
  }

  function handleSyncClick() {
    rulesSync.mutate(undefined, {
      onSuccess: (d) => {
        const c = d.rowCounts;
        const summary = [`${c.datasheets} datasheets`, `${c.stratagems} stratagems`, `${c.abilities} abilities`, `${c.wargear} wargear`, `${c.keywords} keywords`].join(", ");
        setLastSyncDiff(d.diff);
        if (d.diff.total_changed > 0) {
          const parts = [d.diff.added.length && `${d.diff.added.length} added`, d.diff.removed.length && `${d.diff.removed.length} removed`,
            d.diff.renamed.length && `${d.diff.renamed.length} renamed`, d.diff.modified.length && `${d.diff.modified.length} modified`].filter(Boolean);
          toast.success(`Synced: ${summary} (${parts.join(", ")})`);
        } else toast.success(`Synced: ${summary}`);
      },
      onError: (err) => toast.error(`Sync failed: ${err.message}`),
    });
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
        const op: UpsertUnitOverrideInput = { unit_id: unitId, points: parsedPts, move, toughness, save: saveStat, wounds, leadership, objective_control: objectiveControl, keywords: keywords || null, abilities: abilities || null };
        const hasStatOvr = STAT_KEYS.some((k) => { const imp = importedStatValue(k); const cur = statValue(k); return imp !== null && cur !== null && cur !== imp; });
        if (hasStatOvr || parsedPts !== null || (keywords || null) !== null || (abilities || null) !== null) {
          try { await upsertOverride.mutateAsync(op); } catch { /* non-critical */ }
        }
      }
      toast.success("Playbook saved");
      initialRef.current = { ...(initialRef.current ?? {} as StrategyNote), ...payload } as StrategyNote;
      setStatsEditMode(false);
    } catch { toast.error("Failed to save playbook — try again"); }
  }

  function handleFieldChange(field: string, value: string) {
    const setters: Record<string, (v: string) => void> = { abilities: setAbilities, keywords: setKeywords, battlefield_role: setBattlefieldRole,
      strengths: setStrengths, weaknesses: setWeaknesses, best_targets: setBestTargets, synergies: setSynergies,
      mistakes_to_avoid: setMistakesToAvoid, rules_references: setRulesReferences, notes: setNotes };
    setters[field]?.(value);
  }

  return (
    <div className={`flex flex-col gap-6 p-4 ${isLoading ? "opacity-50 pointer-events-none" : ""}`} aria-busy={isLoading}>
      <PlaybookStats unitId={unitId} syncMeta={syncMeta} overrideRow={overrideRow} hasDatasheetLink={hasDatasheetLink}
        hasMultipleProfiles={(datasheet?.models?.length ?? 0) > 1} statsEditMode={statsEditMode}
        onToggleStatsEditMode={() => setStatsEditMode((v) => !v)} wahapediaFactionId={wahapediaFactionId}
        onPickerOpen={() => setPickerOpen(true)} onSyncClick={handleSyncClick} isSyncing={rulesSync.isPending}
        onDeleteOverride={(id) => deleteOverride.mutate(id, { onSuccess: () => toast.success("Overrides cleared"), onError: () => toast.error("Failed to clear overrides") })}
        statValue={statValue} setStat={setStat} importedStatValue={importedStatValue} isStatOverridden={isStatOverridden}
        pointsOverrideValue={pointsOverrideValue} onPointsOverrideChange={setPointsOverrideValue}
        unitPoints={unit?.points} formatSyncDate={formatSyncDate} />
      {syncMeta && <PlaybookSyncDetails syncMeta={syncMeta} syncErrors={syncErrors} lastSyncDiff={lastSyncDiff} />}
      <Separator />
      <PlaybookDatasheet datasheet={datasheet} />
      <PlaybookRules stratagems={stratagems} detachments={detachments} sharedAbilities={sharedAbilities} />
      <TierManager unitId={unitId} />
      <Separator />
      <LoadoutSection unitId={unitId} />
      <Separator />
      <PlaybookStrategy abilities={abilities} keywords={keywords} battlefieldRole={battlefieldRole} strengths={strengths}
        weaknesses={weaknesses} bestTargets={bestTargets} synergies={synergies} mistakesToAvoid={mistakesToAvoid}
        rulesReferences={rulesReferences} notes={notes} onFieldChange={handleFieldChange} />
      <Button type="button" variant="default" className="w-full mt-4" disabled={!isDirty || isLoading || upsert.isPending} onClick={handleSave}>
        Save Playbook
      </Button>
      <DatasheetPicker open={pickerOpen} factionId={wahapediaFactionId ?? undefined}
        factionName={localFaction?.name ?? "this faction"}
        onSelect={(id) => { void handlePickerSelect(id); }} onClose={() => setPickerOpen(false)} />
    </div>
  );
}
