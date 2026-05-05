import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2, Pencil, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useStrategyNote, useUpsertStrategyNote } from "@/hooks/useStrategyNote";
import { useDatasheet, useRulesSyncMeta, useWahapediaFactionId, DATASHEET_KEY } from "@/hooks/useDatasheet";
import { useRulesSync } from "@/hooks/useRulesSync";
import { useFactions } from "@/hooks/useFactions";
import { useUnits } from "@/hooks/useUnits";
import { useQueryClient } from "@tanstack/react-query";
import { upsertDatasheetLink } from "@/db/queries/datasheets";
import type { DatasheetConflict, DatasheetImportPayload, FullDatasheet, RwDatasheetAbility, RwDatasheetWargear } from "@/types/datasheet";
import type { StrategyNote, UpsertStrategyNoteInput } from "@/types/strategyNote";
import { DatasheetPicker } from "@/features/units/DatasheetPicker";
import { TierManager } from "@/features/units/TierManager";
import { LoadoutSection } from "@/features/units/LoadoutSection";

interface PlaybookTabProps {
  unitId: number;
  /** Called when an import produces field-level conflicts. CollectionPage opens the
   *  DatasheetImportDialog (sibling portal) and routes user-confirmed resolutions back
   *  via onApplyImportResolution. Optional so tests / Phase 9 callers don't break. */
  onDatasheetConflict?: (payload: DatasheetImportPayload) => void;
  /** Subscribed to from CollectionPage — when the dialog confirms, this object
   *  contains { resolution, payload }. PlaybookTab applies the resolved values to
   *  local state. Optional for the same reason. */
  pendingImportResolution?: { resolution: import("@/types/datasheet").DatasheetImportResolution; payload: DatasheetImportPayload } | null;
  /** Called by PlaybookTab to acknowledge that pendingImportResolution has been
   *  applied — CollectionPage clears its state. */
  onClearImportResolution?: () => void;
}

type StatKey = "M" | "T" | "Sv" | "W" | "Ld" | "OC";

const STAT_KEYS: StatKey[] = ["M", "T", "Sv", "W", "Ld", "OC"];

const STRATEGY_NOTE_FIELDS: ReadonlyArray<{
  key:
    | "battlefield_role"
    | "strengths"
    | "weaknesses"
    | "best_targets"
    | "synergies"
    | "mistakes_to_avoid"
    | "rules_references"
    | "notes";
  label: string;
  placeholder: string;
}> = [
  { key: "battlefield_role", label: "Battlefield Role", placeholder: "e.g. Objective holder, close-combat distraction" },
  { key: "strengths", label: "Strengths", placeholder: "What this unit is good at" },
  { key: "weaknesses", label: "Weaknesses", placeholder: "What to avoid" },
  { key: "best_targets", label: "Best Targets", placeholder: "Profiles this unit excels into" },
  { key: "synergies", label: "Synergies", placeholder: "Stratagems, auras, buffs that pair well" },
  { key: "mistakes_to_avoid", label: "Mistakes to Avoid", placeholder: "Lessons from past games" },
  { key: "rules_references", label: "Rules Page References", placeholder: "Codex page numbers, FAQ refs" },
  { key: "notes", label: "Personal Notes", placeholder: "Anything else" },
];

const TEXTAREA_CLASS =
  "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const SECTION_LABEL_CLASS =
  "text-xs font-semibold text-muted-foreground uppercase tracking-wide";

function formatStatValue(key: StatKey, value: number | null): React.ReactNode {
  if (value === null) {
    return <span className="text-muted-foreground">—</span>;
  }
  if (key === "M") return `${value}"`;
  if (key === "Sv" || key === "Ld" || key === "OC") return `${value}+`;
  return `${value}`;
}

function parseNumberInput(raw: string): number | null {
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function PlaybookTab({
  unitId,
  onDatasheetConflict,
  pendingImportResolution,
  onClearImportResolution,
}: PlaybookTabProps) {
  const { data, isLoading } = useStrategyNote(unitId);
  const upsert = useUpsertStrategyNote();

  // 6 stats
  const [move, setMove] = useState<number | null>(null);
  const [toughness, setToughness] = useState<number | null>(null);
  const [saveStat, setSaveStat] = useState<number | null>(null);
  const [wounds, setWounds] = useState<number | null>(null);
  const [leadership, setLeadership] = useState<number | null>(null);
  const [objectiveControl, setObjectiveControl] = useState<number | null>(null);

  // 2 free-text fields
  const [abilities, setAbilities] = useState<string>("");
  const [keywords, setKeywords] = useState<string>("");

  // 8 strategy note fields
  const [battlefieldRole, setBattlefieldRole] = useState<string>("");
  const [strengths, setStrengths] = useState<string>("");
  const [weaknesses, setWeaknesses] = useState<string>("");
  const [bestTargets, setBestTargets] = useState<string>("");
  const [synergies, setSynergies] = useState<string>("");
  const [mistakesToAvoid, setMistakesToAvoid] = useState<string>("");
  const [rulesReferences, setRulesReferences] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Stats block edit-mode toggle (display vs. inputs)
  const [statsEditMode, setStatsEditMode] = useState(false);

  // Initial snapshot for dirty detection — undefined until first data load
  const initialRef = useRef<StrategyNote | null | undefined>(undefined);

  // Initialize state from query result. Only set when data becomes defined for the
  // FIRST time on this mount. Subsequent invalidations re-run this effect —
  // we update the snapshot manually after save instead.
  useEffect(() => {
    if (data === undefined) return;
    if (initialRef.current !== undefined) return; // already initialized; do not clobber edits
    initialRef.current = data;
    setMove(data?.move ?? null);
    setToughness(data?.toughness ?? null);
    setSaveStat(data?.save ?? null);
    setWounds(data?.wounds ?? null);
    setLeadership(data?.leadership ?? null);
    setObjectiveControl(data?.objective_control ?? null);
    setAbilities(data?.abilities ?? "");
    setKeywords(data?.keywords ?? "");
    setBattlefieldRole(data?.battlefield_role ?? "");
    setStrengths(data?.strengths ?? "");
    setWeaknesses(data?.weaknesses ?? "");
    setBestTargets(data?.best_targets ?? "");
    setSynergies(data?.synergies ?? "");
    setMistakesToAvoid(data?.mistakes_to_avoid ?? "");
    setRulesReferences(data?.rules_references ?? "");
    setNotes(data?.notes ?? "");
  }, [data]);

  const isDirty = useMemo(() => {
    const snap = initialRef.current;
    if (snap === undefined) return false;
    return (
      move !== (snap?.move ?? null) ||
      toughness !== (snap?.toughness ?? null) ||
      saveStat !== (snap?.save ?? null) ||
      wounds !== (snap?.wounds ?? null) ||
      leadership !== (snap?.leadership ?? null) ||
      objectiveControl !== (snap?.objective_control ?? null) ||
      abilities !== (snap?.abilities ?? "") ||
      keywords !== (snap?.keywords ?? "") ||
      battlefieldRole !== (snap?.battlefield_role ?? "") ||
      strengths !== (snap?.strengths ?? "") ||
      weaknesses !== (snap?.weaknesses ?? "") ||
      bestTargets !== (snap?.best_targets ?? "") ||
      synergies !== (snap?.synergies ?? "") ||
      mistakesToAvoid !== (snap?.mistakes_to_avoid ?? "") ||
      rulesReferences !== (snap?.rules_references ?? "") ||
      notes !== (snap?.notes ?? "")
    );
  }, [
    move, toughness, saveStat, wounds, leadership, objectiveControl,
    abilities, keywords, battlefieldRole, strengths, weaknesses,
    bestTargets, synergies, mistakesToAvoid, rulesReferences, notes,
  ]);

  async function handleSave() {
    const payload: UpsertStrategyNoteInput = {
      unit_id: unitId,
      move,
      toughness,
      save: saveStat,
      wounds,
      leadership,
      objective_control: objectiveControl,
      // Empty-string-vs-null round-trip
      abilities: abilities || null,
      keywords: keywords || null,
      battlefield_role: battlefieldRole || null,
      strengths: strengths || null,
      weaknesses: weaknesses || null,
      best_targets: bestTargets || null,
      synergies: synergies || null,
      mistakes_to_avoid: mistakesToAvoid || null,
      rules_references: rulesReferences || null,
      notes: notes || null,
    };
    try {
      await upsert.mutateAsync(payload);
      toast.success("Playbook saved");
      // Update snapshot so isDirty becomes false without round-trip refetch
      initialRef.current = {
        ...(initialRef.current ?? {} as StrategyNote),
        unit_id: unitId,
        move: payload.move,
        toughness: payload.toughness,
        save: payload.save,
        wounds: payload.wounds,
        leadership: payload.leadership,
        objective_control: payload.objective_control,
        abilities: payload.abilities,
        keywords: payload.keywords,
        battlefield_role: payload.battlefield_role,
        strengths: payload.strengths,
        weaknesses: payload.weaknesses,
        best_targets: payload.best_targets,
        synergies: payload.synergies,
        mistakes_to_avoid: payload.mistakes_to_avoid,
        rules_references: payload.rules_references,
        notes: payload.notes,
      } as StrategyNote;
      setStatsEditMode(false);
    } catch {
      toast.error("Failed to save playbook — try again");
      // Save button re-enables automatically: isDirty stays true; upsert.isPending resets
    }
  }

  // Stat cell helpers — keep render concise
  function statValue(key: StatKey): number | null {
    switch (key) {
      case "M": return move;
      case "T": return toughness;
      case "Sv": return saveStat;
      case "W": return wounds;
      case "Ld": return leadership;
      case "OC": return objectiveControl;
    }
  }

  function setStat(key: StatKey, v: number | null) {
    switch (key) {
      case "M": return setMove(v);
      case "T": return setToughness(v);
      case "Sv": return setSaveStat(v);
      case "W": return setWounds(v);
      case "Ld": return setLeadership(v);
      case "OC": return setObjectiveControl(v);
    }
  }

  // Datasheet integration hooks (DS-01..DS-12)
  const qc = useQueryClient();
  const { data: factions } = useFactions();
  const { data: units } = useUnits();
  const unit = useMemo(() => units?.find((u) => u.id === unitId) ?? null, [units, unitId]);
  const localFaction = useMemo(
    () => (unit && factions ? factions.find((f) => f.id === unit.faction_id) ?? null : null),
    [unit, factions]
  );
  const { data: wahapediaFactionId } = useWahapediaFactionId(localFaction?.name);
  const { data: syncMeta } = useRulesSyncMeta();
  const { data: datasheet } = useDatasheet(unitId);
  const rulesSync = useRulesSync();

  // Picker open state — local to PlaybookTab so the auto-open trigger is a one-shot effect.
  const [pickerOpen, setPickerOpen] = useState(false);

  // Track whether the auto-open trigger has already fired for this mount, so the picker
  // doesn't reopen on every re-render after the user dismisses it.
  const autoOpenedRef = useRef(false);

  const hasDatasheetLink = datasheet !== null && datasheet !== undefined;

  // DS-04 auto-open: on first PlaybookTab mount where (a) NO datasheet link AND (b) ALL 6 stats null AND (c) rules.db populated → open picker once.
  useEffect(() => {
    if (autoOpenedRef.current) return;
    if (initialRef.current === undefined) return; // wait until strategy_note loaded
    const allStatsNull =
      move === null && toughness === null && saveStat === null &&
      wounds === null && leadership === null && objectiveControl === null;
    if (!hasDatasheetLink && allStatsNull && syncMeta) {
      setPickerOpen(true);
      autoOpenedRef.current = true;
    }
  }, [hasDatasheetLink, syncMeta, move, toughness, saveStat, wounds, leadership, objectiveControl]);

  // Stat-suffix coercion: rules.db stores "6\"" / "3+" / "6+" (TEXT) but unit_strategy_notes
  // is INTEGER. Strip non-digit chars and Number() the leading digits.
  function coerceStatToNumber(raw: string | null | undefined): number | null {
    if (raw === null || raw === undefined || raw === "") return null;
    const digits = raw.replace(/[^0-9]/g, "");
    if (digits === "") return null;
    return Number(digits);
  }

  /**
   * DS-06 + DS-07 + DS-08: process the picker's selection.
   * 1. Persist the link to hobbyforge.db.
   * 2. Refetch the FullDatasheet (invalidate to force fresh data).
   * 3. Derive incoming values + conflicts.
   * 4. If no conflicts: load incoming directly. If conflicts: dispatch payload up.
   */
  async function handlePickerSelect(datasheetId: string) {
    setPickerOpen(false);
    try {
      await upsertDatasheetLink({ unit_id: unitId, datasheet_id: datasheetId });
      qc.invalidateQueries({ queryKey: DATASHEET_KEY(unitId) });
      const linkedId = datasheetId; // we just upserted it
      const { getFullDatasheet } = await import("@/db/queries/datasheets");
      const fresh = await getFullDatasheet(linkedId);
      if (!fresh) {
        toast.error("Datasheet not found in rules database — try re-syncing.");
        return;
      }
      applyIncomingOrRouteConflicts(fresh);
    } catch (e) {
      console.error(e);
      toast.error("Failed to link datasheet — try again.");
    }
  }

  /** DS-08 conflict derivation. */
  function applyIncomingOrRouteConflicts(fresh: FullDatasheet) {
    const m0 = fresh.models[0] ?? null;
    const incomingM = m0 ? coerceStatToNumber(m0.M) : null;
    const incomingT = m0 ? m0.T : null;
    const incomingSv = m0 ? coerceStatToNumber(m0.Sv) : null;
    const incomingW = m0 ? m0.W : null;
    const incomingLd = m0 ? coerceStatToNumber(m0.Ld) : null;
    const incomingOC = m0 ? m0.OC : null;
    const incomingAbilities = formatDatasheetAbilitiesAsText(fresh.abilities);
    const incomingKeywords = fresh.keywords.map((k) => k.keyword).join(", ");

    // Build conflict list — only fields where BOTH current and incoming are non-empty AND differ.
    const conflicts: DatasheetConflict[] = [];
    function addStatConflict(
      key: DatasheetConflict["key"],
      label: string,
      current: number | null,
      incoming: number | null
    ) {
      if (current !== null && incoming !== null && current !== incoming) {
        conflicts.push({ key, label, currentValue: String(current), incomingValue: String(incoming), choice: "use" });
      }
    }
    addStatConflict("M", "M", move, incomingM);
    addStatConflict("T", "T", toughness, incomingT);
    addStatConflict("Sv", "Sv", saveStat, incomingSv);
    addStatConflict("W", "W", wounds, incomingW);
    addStatConflict("Ld", "Ld", leadership, incomingLd);
    addStatConflict("OC", "OC", objectiveControl, incomingOC);
    if (abilities.trim() !== "" && incomingAbilities.trim() !== "" && abilities.trim() !== incomingAbilities.trim()) {
      conflicts.push({ key: "abilities", label: "Personal Ability Notes", currentValue: abilities, incomingValue: incomingAbilities, choice: "use" });
    }
    if (keywords.trim() !== "" && incomingKeywords.trim() !== "" && keywords.trim() !== incomingKeywords.trim()) {
      conflicts.push({ key: "keywords", label: "Keywords", currentValue: keywords, incomingValue: incomingKeywords, choice: "use" });
    }

    if (conflicts.length === 0) {
      // No conflicts: load fields directly (only fields where incoming is non-null and current is empty).
      if (incomingM !== null && move === null) setMove(incomingM);
      if (incomingT !== null && toughness === null) setToughness(incomingT);
      if (incomingSv !== null && saveStat === null) setSaveStat(incomingSv);
      if (incomingW !== null && wounds === null) setWounds(incomingW);
      if (incomingLd !== null && leadership === null) setLeadership(incomingLd);
      if (incomingOC !== null && objectiveControl === null) setObjectiveControl(incomingOC);
      if (abilities.trim() === "" && incomingAbilities.trim() !== "") setAbilities(incomingAbilities);
      if (keywords.trim() === "" && incomingKeywords.trim() !== "") setKeywords(incomingKeywords);
      return;
    }

    // Conflicts: dispatch up to CollectionPage. Pass the FRESH datasheet so the dialog has full context.
    const payload: DatasheetImportPayload = { unitId, datasheet: fresh, conflicts };
    onDatasheetConflict?.(payload);
  }

  /** Format datasheet abilities as a single readable text block for the Personal Ability Notes
   *  textarea (which is plain text, not structured). Used only for conflict-detection comparison
   *  and direct-load no-conflict path; the rendered Datasheet Abilities section uses the
   *  structured RwDatasheetAbility[] directly. */
  function formatDatasheetAbilitiesAsText(list: RwDatasheetAbility[]): string {
    return list
      .map((a) => `${a.name}${a.description ? ": " + a.description : ""}`)
      .join("\n");
  }

  // Subscribe to import resolutions dispatched from CollectionPage's DatasheetImportDialog.
  useEffect(() => {
    if (!pendingImportResolution) return;
    const { resolution, payload } = pendingImportResolution;
    const m0 = payload.datasheet.models[0] ?? null;
    const incomingAbilitiesText = formatDatasheetAbilitiesAsText(payload.datasheet.abilities);
    const incomingKeywordsText = payload.datasheet.keywords.map((k) => k.keyword).join(", ");
    if (resolution.M === "use" && m0) setMove(coerceStatToNumber(m0.M));
    if (resolution.T === "use" && m0) setToughness(m0.T);
    if (resolution.Sv === "use" && m0) setSaveStat(coerceStatToNumber(m0.Sv));
    if (resolution.W === "use" && m0) setWounds(m0.W);
    if (resolution.Ld === "use" && m0) setLeadership(coerceStatToNumber(m0.Ld));
    if (resolution.OC === "use" && m0) setObjectiveControl(m0.OC);
    if (resolution.abilities === "use") setAbilities(incomingAbilitiesText);
    if (resolution.keywords === "use") setKeywords(incomingKeywordsText);
    onClearImportResolution?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingImportResolution]);

  function handleSyncClick() {
    rulesSync.mutate(undefined, {
      onSuccess: () => toast.success("Datasheets synced"),
      onError: (err) => {
        console.error("[useRulesSync] sync failed:", err);
        toast.error("Sync failed — check your connection and try again");
      },
    });
  }

  // Group datasheet abilities into Core / Faction / Unit sub-groups for the collapsible.
  const coreAbilities = (datasheet?.abilities ?? []).filter((a) => a.type === "Core");
  const factionAbilities = (datasheet?.abilities ?? []).filter((a) => a.type === "Faction");
  const unitAbilities = (datasheet?.abilities ?? []).filter((a) =>
    a.type !== "Core" && a.type !== "Faction"
  );
  const hasAnyDatasheetAbility = coreAbilities.length > 0 || factionAbilities.length > 0 || unitAbilities.length > 0;
  const hasMultipleProfiles = (datasheet?.models?.length ?? 0) > 1;
  const sources = datasheet?.source ? [datasheet.source] : [];
  const rangedWeapons = (datasheet?.wargear ?? []).filter((w) => w.type === "Ranged");
  const meleeWeapons = (datasheet?.wargear ?? []).filter((w) => w.type === "Melee" || (w.type !== "Ranged" && w.range === "Melee"));
  const hasWeapons = (datasheet?.wargear ?? []).length > 0;

  function formatSyncDate(iso: string | null): string {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return iso;
    }
  }

  return (
    <div
      className={`flex flex-col gap-6 p-4 ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
      aria-busy={isLoading}
    >
      {/* Stats section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className={SECTION_LABEL_CLASS}>Stats</span>
          <div className="flex items-center gap-2">
            {syncMeta && (
              <span className="text-xs text-muted-foreground">
                Last synced: {formatSyncDate(syncMeta.last_sync_at)}
              </span>
            )}
            {syncMeta && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPickerOpen(true)}
                disabled={!wahapediaFactionId}
              >
                {hasDatasheetLink ? "Re-import" : "Import stats"}
              </Button>
            )}
            {syncMeta && hasDatasheetLink && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Re-sync datasheets"
                onClick={handleSyncClick}
                disabled={rulesSync.isPending}
              >
                {rulesSync.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              aria-label="Edit stats"
              onClick={() => setStatsEditMode((v) => !v)}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Empty-rules-db banner — shown when no syncMeta */}
        {!syncMeta && (
          <div className="rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
            Sync datasheets to auto-fill stats.{" "}
            <button
              type="button"
              className="underline underline-offset-2 hover:text-foreground"
              onClick={handleSyncClick}
              disabled={rulesSync.isPending}
            >
              {rulesSync.isPending ? "Syncing…" : "Sync now"}
            </button>
          </div>
        )}

        <div className="flex flex-row gap-1">
          {STAT_KEYS.map((key) => (
            <div
              key={key}
              className={`flex-1 flex flex-col items-center justify-center min-h-[44px] border ${
                statsEditMode ? "border-primary" : "border-border"
              } rounded-sm bg-card gap-1 px-1 py-2`}
            >
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                {key}
              </span>
              {statsEditMode ? (
                <Input
                  type="number"
                  min={0}
                  value={statValue(key) ?? ""}
                  onChange={(e) => setStat(key, parseNumberInput(e.target.value))}
                  className="h-7 text-center text-base font-semibold p-0 border-0 bg-transparent"
                  aria-label={`${key} value`}
                />
              ) : (
                <span className="text-base font-semibold text-foreground tabular-nums">
                  {formatStatValue(key, statValue(key))}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* DS-12 multi-profile note */}
        {hasMultipleProfiles && (
          <p className="text-xs text-muted-foreground mt-1">
            Additional model profiles available — see Datasheet Abilities for details.
          </p>
        )}
      </div>

      <Separator />

      {/* Weapons collapsible */}
      {hasWeapons && (
        <Collapsible defaultOpen={true}>
          <CollapsibleTrigger asChild>
            <button type="button" className="flex items-center justify-between w-full py-2 text-left">
              <span className="text-base font-semibold">Weapons</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" aria-hidden="true" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-col gap-4">
              {rangedWeapons.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className={SECTION_LABEL_CLASS}>Ranged</span>
                  <WargearTable weapons={rangedWeapons} statLabel="BS" />
                </div>
              )}
              {meleeWeapons.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className={SECTION_LABEL_CLASS}>Melee</span>
                  <WargearTable weapons={meleeWeapons} statLabel="WS" />
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {hasWeapons && <Separator />}

      {/* DS-09 Datasheet Abilities collapsible */}
      {hasAnyDatasheetAbility && (
        <Collapsible defaultOpen={true}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex items-center justify-between w-full py-2 text-left"
            >
              <span className="text-base font-semibold">Datasheet Abilities</span>
              <ChevronDown
                className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180"
                aria-hidden="true"
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-col gap-4">
              {coreAbilities.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className={SECTION_LABEL_CLASS}>Core Abilities</span>
                  {coreAbilities.map((a, idx) => (
                    <AbilityEntry key={`${a.datasheet_id}-${a.line}-${idx}`} ability={a} />
                  ))}
                </div>
              )}
              {factionAbilities.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className={SECTION_LABEL_CLASS}>Faction Abilities</span>
                  {factionAbilities.map((a, idx) => (
                    <AbilityEntry key={`${a.datasheet_id}-${a.line}-${idx}`} ability={a} />
                  ))}
                </div>
              )}
              {unitAbilities.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className={SECTION_LABEL_CLASS}>Unit Abilities</span>
                  {unitAbilities.map((a, idx) => (
                    <AbilityEntry key={`${a.datasheet_id}-${a.line}-${idx}`} ability={a} />
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* DS-10 Sources list */}
      {sources.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className={SECTION_LABEL_CLASS}>Sources</span>
          <ul className="flex flex-col gap-1 pl-2">
            {sources.map((s) => (
              <li key={s.id} className="text-sm text-muted-foreground">
                {s.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(hasAnyDatasheetAbility || sources.length > 0) && <Separator />}

      {/* Point Tiers — Phase 24 */}
      <TierManager unitId={unitId} />

      <Separator />

      {/* Loadouts — Phase 24 */}
      <LoadoutSection unitId={unitId} />

      <Separator />

      {/* DS-11 Personal Ability Notes (renamed from "Abilities") */}
      <div className="flex flex-col gap-1">
        <label htmlFor="playbook-abilities" className={SECTION_LABEL_CLASS}>
          Personal Ability Notes
        </label>
        <textarea
          id="playbook-abilities"
          className={TEXTAREA_CLASS}
          rows={3}
          placeholder="Personal notes on how to use this unit's abilities…"
          value={abilities}
          onChange={(e) => setAbilities(e.target.value)}
        />
      </div>

      {/* Keywords (single-line Input — unchanged) */}
      <div className="flex flex-col gap-1">
        <label htmlFor="playbook-keywords" className={SECTION_LABEL_CLASS}>
          Keywords
        </label>
        <Input
          id="playbook-keywords"
          type="text"
          placeholder="e.g. Infantry, Battleline, Core"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
        />
      </div>

      <Separator />

      {/* 8 strategy note fields (unchanged from Phase 9) */}
      <div className="flex flex-col gap-4">
        {STRATEGY_NOTE_FIELDS.map((field) => {
          const value = (() => {
            switch (field.key) {
              case "battlefield_role": return battlefieldRole;
              case "strengths": return strengths;
              case "weaknesses": return weaknesses;
              case "best_targets": return bestTargets;
              case "synergies": return synergies;
              case "mistakes_to_avoid": return mistakesToAvoid;
              case "rules_references": return rulesReferences;
              case "notes": return notes;
            }
          })();
          const setter = (() => {
            switch (field.key) {
              case "battlefield_role": return setBattlefieldRole;
              case "strengths": return setStrengths;
              case "weaknesses": return setWeaknesses;
              case "best_targets": return setBestTargets;
              case "synergies": return setSynergies;
              case "mistakes_to_avoid": return setMistakesToAvoid;
              case "rules_references": return setRulesReferences;
              case "notes": return setNotes;
            }
          })();
          const inputId = `playbook-${field.key.replace(/_/g, "-")}`;
          return (
            <div key={field.key} className="flex flex-col gap-1">
              <label htmlFor={inputId} className={SECTION_LABEL_CLASS}>
                {field.label}
              </label>
              <textarea
                id={inputId}
                className={TEXTAREA_CLASS}
                rows={2}
                placeholder={field.placeholder}
                value={value}
                onChange={(e) => setter(e.target.value)}
              />
            </div>
          );
        })}
      </div>

      {/* Save button (unchanged from Phase 9) */}
      <Button
        type="button"
        variant="default"
        className="w-full mt-4"
        disabled={!isDirty || isLoading || upsert.isPending}
        onClick={handleSave}
      >
        Save Playbook
      </Button>

      {/* DS-04 picker — mounted inside PlaybookTab.
          The picker Dialog uses its own portal which detaches from the tab DOM tree,
          so there is no Radix portal nesting issue. The conflict dialog MUST be hoisted
          to CollectionPage (Task 3) since it can open right after the picker closes. */}
      <DatasheetPicker
        open={pickerOpen}
        factionId={wahapediaFactionId ?? undefined}
        factionName={localFaction?.name ?? "this faction"}
        onSelect={(datasheetId) => { void handlePickerSelect(datasheetId); }}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}

// WargearTable sub-component — renders a weapon stat table for one type (Ranged/Melee).
function WargearTable({ weapons, statLabel }: { weapons: RwDatasheetWargear[]; statLabel: "BS" | "WS" }) {
  return (
    <div className="flex flex-col">
      {/* Header row */}
      <div className="grid grid-cols-[1fr_36px_32px_36px_28px_32px_28px] gap-x-1 px-2 py-1 border-b border-border">
        {["Name", "Rng", "A", statLabel, "S", "AP", "D"].map((h) => (
          <span key={h} className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide text-center first:text-left">
            {h}
          </span>
        ))}
      </div>
      {weapons.map((w, i) => {
        const range = w.range && /^\d+$/.test(w.range) ? `${w.range}"` : (w.range ?? "—");
        const attacks = w.dice ? `${w.dice}+${w.A ?? 0}` : (w.A ?? "—");
        const bsws = w.BS_WS ? `${w.BS_WS}+` : "—";
        return (
          <div key={`${w.datasheet_id}-${w.line}-${w.line_in_wargear}-${i}`} className="border-b border-border last:border-0">
            <div className="grid grid-cols-[1fr_36px_32px_36px_28px_32px_28px] gap-x-1 px-2 py-1.5 items-center">
              <span className="text-sm font-medium truncate">{w.name}</span>
              <span className="text-xs text-center tabular-nums">{range}</span>
              <span className="text-xs text-center tabular-nums">{attacks}</span>
              <span className="text-xs text-center tabular-nums">{bsws}</span>
              <span className="text-xs text-center tabular-nums">{w.S ?? "—"}</span>
              <span className="text-xs text-center tabular-nums">{w.AP ?? "0"}</span>
              <span className="text-xs text-center tabular-nums">{w.D ?? "—"}</span>
            </div>
            {w.description && (
              <p className="px-2 pb-1.5 text-xs text-muted-foreground leading-relaxed">
                {w.description}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// AbilityEntry sub-component — module-local, NOT exported.
function AbilityEntry({ ability }: { ability: import("@/types/datasheet").RwDatasheetAbility }) {
  return (
    <div className="flex flex-col gap-1 pl-2 border-l border-border">
      <span className="text-sm font-semibold text-foreground">{ability.name}</span>
      {ability.description && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {ability.description}
        </p>
      )}
    </div>
  );
}
