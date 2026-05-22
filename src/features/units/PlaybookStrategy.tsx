import { Input } from "@/components/ui/input";

const SECTION_LABEL_CLASS =
  "text-xs font-semibold text-muted-foreground uppercase tracking-wide";

const TEXTAREA_CLASS =
  "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

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

type StrategyFieldKey = typeof STRATEGY_NOTE_FIELDS[number]["key"];

interface PlaybookStrategyProps {
  /** Current values for abilities, keywords, and all 8 strategy note fields */
  abilities: string;
  keywords: string;
  battlefieldRole: string;
  strengths: string;
  weaknesses: string;
  bestTargets: string;
  synergies: string;
  mistakesToAvoid: string;
  rulesReferences: string;
  notes: string;
  /** Called when any field changes */
  onFieldChange: (field: StrategyFieldKey | "abilities" | "keywords", value: string) => void;
}

export function PlaybookStrategy({
  abilities,
  keywords,
  battlefieldRole,
  strengths,
  weaknesses,
  bestTargets,
  synergies,
  mistakesToAvoid,
  rulesReferences,
  notes,
  onFieldChange,
}: PlaybookStrategyProps) {
  function getFieldValue(key: StrategyFieldKey): string {
    switch (key) {
      case "battlefield_role": return battlefieldRole;
      case "strengths": return strengths;
      case "weaknesses": return weaknesses;
      case "best_targets": return bestTargets;
      case "synergies": return synergies;
      case "mistakes_to_avoid": return mistakesToAvoid;
      case "rules_references": return rulesReferences;
      case "notes": return notes;
    }
  }

  return (
    <>
      {/* DS-11 Personal Ability Notes (renamed from "Abilities") */}
      <div className="flex flex-col gap-1">
        <label htmlFor="playbook-abilities" className={SECTION_LABEL_CLASS}>
          Personal Ability Notes
        </label>
        <textarea
          id="playbook-abilities"
          className={TEXTAREA_CLASS}
          rows={3}
          placeholder="Personal notes on how to use this unit's abilities..."
          value={abilities}
          onChange={(e) => onFieldChange("abilities", e.target.value)}
        />
      </div>

      {/* Keywords (single-line Input) */}
      <div className="flex flex-col gap-1">
        <label htmlFor="playbook-keywords" className={SECTION_LABEL_CLASS}>
          Keywords
        </label>
        <Input
          id="playbook-keywords"
          type="text"
          placeholder="e.g. Infantry, Battleline, Core"
          value={keywords}
          onChange={(e) => onFieldChange("keywords", e.target.value)}
        />
      </div>

      {/* 8 strategy note fields */}
      <div className="flex flex-col gap-4">
        {STRATEGY_NOTE_FIELDS.map((field) => {
          const value = getFieldValue(field.key);
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
                onChange={(e) => onFieldChange(field.key, e.target.value)}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}
