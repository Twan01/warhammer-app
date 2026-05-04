import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useStrategyNote, useUpsertStrategyNote } from "@/hooks/useStrategyNote";
import type { StrategyNote, UpsertStrategyNoteInput } from "@/types/strategyNote";

interface PlaybookTabProps {
  unitId: number;
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

export function PlaybookTab({ unitId }: PlaybookTabProps) {
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

  return (
    <div
      className={`flex flex-col gap-6 p-4 ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
      aria-busy={isLoading}
    >
      {/* Stats section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className={SECTION_LABEL_CLASS}>Stats</span>
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
      </div>

      <Separator />

      {/* Abilities */}
      <div className="flex flex-col gap-1">
        <label htmlFor="playbook-abilities" className={SECTION_LABEL_CLASS}>
          Abilities
        </label>
        <textarea
          id="playbook-abilities"
          className={TEXTAREA_CLASS}
          rows={3}
          placeholder="Enter unit abilities…"
          value={abilities}
          onChange={(e) => setAbilities(e.target.value)}
        />
      </div>

      {/* Keywords (single-line Input per UI-SPEC §4) */}
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

      {/* 8 strategy note fields in fixed order */}
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

      {/* Save button at the bottom of the Playbook tab scroll area (NOT in SheetFooter) */}
      <Button
        type="button"
        variant="default"
        className="w-full mt-4"
        disabled={!isDirty || isLoading || upsert.isPending}
        onClick={handleSave}
      >
        Save Playbook
      </Button>
    </div>
  );
}
