import { useState, useEffect, useRef } from "react";
import { Separator } from "@/components/ui/separator";
import { useUpsertRulesNote } from "@/hooks/useRulesNotes";
import type { RulesNote } from "@/types/rulesNote";
import type { RuleType } from "@/types/rulesFavorite";

const SECTION_LABEL_CLASS =
  "text-xs font-semibold text-muted-foreground uppercase tracking-wide";

const TEXTAREA_CLASS =
  "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

interface RuleNoteEditorProps {
  ruleId: string;
  ruleType: RuleType;
  ruleName: string;
  note: RulesNote | null;
}

export function RuleNoteEditor({
  ruleId,
  ruleType,
  ruleName,
  note,
}: RuleNoteEditorProps) {
  const [localText, setLocalText] = useState(note?.note_text ?? "");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const upsertNote = useUpsertRulesNote();

  useEffect(() => {
    setLocalText(note?.note_text ?? "");
  }, [note?.note_text]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setLocalText(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      upsertNote.mutate({
        rule_id: ruleId,
        rule_type: ruleType,
        rule_name: ruleName,
        note_text: value,
      });
    }, 500);
  }

  return (
    <>
      <Separator className="my-2" />
      <p className={SECTION_LABEL_CLASS}>Your Notes</p>
      <textarea
        className={TEXTAREA_CLASS + " min-h-[56px]"}
        rows={2}
        value={localText}
        onChange={handleChange}
        placeholder="Add personal notes..."
      />
    </>
  );
}
