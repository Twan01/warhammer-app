import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateBattleLog, useUpdateBattleLog } from "@/hooks/useBattleLogs";
import { useAppendStrategyNotes } from "@/hooks/useStrategyNote";
import { useArmyLists } from "@/hooks/useArmyLists";
import { useUnits } from "@/hooks/useUnits";
import {
  battleLogSchema,
  BATTLE_LOG_RESULTS,
  type BattleLogFormValues,
} from "./battleLogSchema";
import type { BattleLog } from "@/types/battleLog";
import { todayISO } from "@/lib/dates";

const NO_LIST = "__none__";
const NO_UNIT = "__none__";

const TEXTAREA_CLASS =
  "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const DEFAULT_VALUES: BattleLogFormValues = {
  battle_date: todayISO(),
  opponent_faction: "",
  mission: "",
  result: "Win",
  opponent: null,
  points_played: null,
  my_score: null,
  opponent_score: null,
  army_list_id: null,
  mvp_unit_id: null,
  underperforming_unit_id: null,
  lessons_learned: null,
  changes_next_time: null,
  notes: null,
  forgotten_rules: null,
  mvp_notes: null,
  underperformer_notes: null,
};

function parseForgottenRules(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr.join("\n");
  } catch { /* malformed JSON */ }
  return null;
}

function serializeForgottenRules(text: string | null): string | null {
  if (!text) return null;
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.length > 0 ? JSON.stringify(lines) : null;
}

function buildDefaultValues(
  log: BattleLog | null,
  prefill?: Partial<BattleLogFormValues>,
): BattleLogFormValues {
  if (log) {
    return {
      battle_date: log.battle_date.slice(0, 10),
      opponent_faction: log.opponent_faction,
      mission: log.mission,
      result: log.result,
      opponent: log.opponent,
      points_played: log.points_played,
      my_score: log.my_score,
      opponent_score: log.opponent_score,
      army_list_id: log.army_list_id,
      mvp_unit_id: log.mvp_unit_id,
      underperforming_unit_id: log.underperforming_unit_id,
      lessons_learned: log.lessons_learned,
      changes_next_time: log.changes_next_time,
      notes: log.notes,
      forgotten_rules: parseForgottenRules(log.forgotten_rules),
      mvp_notes: log.mvp_notes,
      underperformer_notes: log.underperformer_notes,
    };
  }
  return { ...DEFAULT_VALUES, battle_date: todayISO(), ...prefill };
}

export function BattleLogSheet({
  open,
  log,
  onClose,
  prefill,
}: {
  open: boolean;
  log: BattleLog | null;
  onClose: () => void;
  prefill?: Partial<BattleLogFormValues>;
}) {
  const isEdit = log !== null;
  const isPrefilled = prefill !== undefined && log === null;
  const createBattleLog = useCreateBattleLog();
  const updateBattleLog = useUpdateBattleLog();
  const appendNotes = useAppendStrategyNotes();
  const { data: armyLists, isLoading: armyListsLoading } = useArmyLists();
  const { data: units, isLoading: unitsLoading } = useUnits();

  const form = useForm<BattleLogFormValues>({
    resolver: zodResolver(battleLogSchema),
    defaultValues: buildDefaultValues(log, prefill),
  });

  useEffect(() => {
    form.reset(buildDefaultValues(log, prefill));
  }, [log, prefill]);

  async function onSubmit(values: BattleLogFormValues) {
    try {
      const payload = {
        battle_date: values.battle_date,
        opponent_faction: values.opponent_faction,
        mission: values.mission,
        result: values.result,
        opponent: values.opponent ?? null,
        points_played: values.points_played ?? null,
        my_score: values.my_score ?? null,
        opponent_score: values.opponent_score ?? null,
        army_list_id: values.army_list_id ?? null,
        mvp_unit_id: values.mvp_unit_id ?? null,
        underperforming_unit_id: values.underperforming_unit_id ?? null,
        lessons_learned: values.lessons_learned ?? null,
        changes_next_time: values.changes_next_time ?? null,
        notes: values.notes ?? null,
        forgotten_rules: serializeForgottenRules(values.forgotten_rules ?? null),
        mvp_notes: values.mvp_notes ?? null,
        underperformer_notes: values.underperformer_notes ?? null,
        promoted_to_reminder: 0,
      };

      if (isEdit && log) {
        await updateBattleLog.mutateAsync({ id: log.id, ...payload });
        toast.success("Game updated.");
      } else {
        await createBattleLog.mutateAsync(payload);
        toast.success("Game logged.");
      }

      if (!isEdit) {
        if (values.mvp_unit_id && values.mvp_notes) {
          appendNotes.mutate({
            unit_id: values.mvp_unit_id,
            text: `[MVP ${values.battle_date}] ${values.mvp_notes}`,
          });
        }
        if (values.underperforming_unit_id && values.underperformer_notes) {
          appendNotes.mutate({
            unit_id: values.underperforming_unit_id,
            text: `[Underperformed ${values.battle_date}] ${values.underperformer_notes}`,
          });
        }
      }

      onClose();
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? "Edit Game" : isPrefilled ? "End Game" : "Log Game"}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update this game log entry."
              : isPrefilled
                ? "Record your game result and after-action notes."
                : "Record a new game — result, opponent, mission, and notes."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 p-4">

            {/* Group 1 — Required fields (no separator) */}
            <FormField
              name="battle_date"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="opponent_faction"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opponent Faction</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Tau Empire, Tyranids"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="mission"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mission</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Take and Hold, Scorched Earth"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="result"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Result</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select result" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BATTLE_LOG_RESULTS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Group 2 — Game Details */}
            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Game Details
            </p>

            <FormField
              name="opponent"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opponent Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Player name (optional)"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="points_played"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Points</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="e.g. 2000"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? null : e.target.valueAsNumber,
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                name="my_score"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>My VP</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Victory points scored"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "" ? null : e.target.valueAsNumber,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="opponent_score"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opponent VP</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Opponent's victory points"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "" ? null : e.target.valueAsNumber,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Group 3 — Linked Records (army list only; MVP/underperformer moved to After-Action) */}
            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Linked Records
            </p>

            <FormField
              name="army_list_id"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Army List Used</FormLabel>
                  <Select
                    disabled={armyListsLoading}
                    value={field.value !== null ? String(field.value) : NO_LIST}
                    onValueChange={(v) => field.onChange(v === NO_LIST ? null : Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select army list (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_LIST}>No army list</SelectItem>
                      {(armyLists ?? []).map((l) => (
                        <SelectItem key={l.id} value={String(l.id)}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes field */}
            <FormField
              name="notes"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <textarea
                      className={TEXTAREA_CLASS}
                      rows={3}
                      placeholder="General notes about the game…"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* After-Action collapsible section */}
            <Separator />
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger className="flex w-full items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  After-Action
                </span>
                <ChevronDown size={12} className="ml-auto text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent className="flex flex-col gap-4 pt-2">
                <FormField
                  name="forgotten_rules"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Forgotten Rules</FormLabel>
                      <FormControl>
                        <textarea
                          className={TEXTAREA_CLASS}
                          rows={4}
                          placeholder="Rules you forgot this game — one per line"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="mvp_unit_id"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>MVP Unit</FormLabel>
                      <Select
                        disabled={unitsLoading}
                        value={field.value !== null ? String(field.value) : NO_UNIT}
                        onValueChange={(v) => field.onChange(v === NO_UNIT ? null : Number(v))}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select unit (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NO_UNIT}>None</SelectItem>
                          {(units ?? []).map((u) => (
                            <SelectItem key={u.id} value={String(u.id)}>
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="mvp_notes"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>MVP Notes</FormLabel>
                      <FormControl>
                        <textarea
                          className={TEXTAREA_CLASS}
                          rows={2}
                          placeholder="Notes on MVP unit"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="underperforming_unit_id"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Underperformed</FormLabel>
                      <Select
                        disabled={unitsLoading}
                        value={field.value !== null ? String(field.value) : NO_UNIT}
                        onValueChange={(v) => field.onChange(v === NO_UNIT ? null : Number(v))}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select unit (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NO_UNIT}>None</SelectItem>
                          {(units ?? []).map((u) => (
                            <SelectItem key={u.id} value={String(u.id)}>
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="underperformer_notes"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Underperformer Notes</FormLabel>
                      <FormControl>
                        <textarea
                          className={TEXTAREA_CLASS}
                          rows={2}
                          placeholder="Notes on underperformer"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="lessons_learned"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lessons Learned</FormLabel>
                      <FormControl>
                        <textarea
                          className={TEXTAREA_CLASS}
                          rows={3}
                          placeholder="What worked, what didn't…"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="changes_next_time"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Changes Next Time</FormLabel>
                      <FormControl>
                        <textarea
                          className={TEXTAREA_CLASS}
                          rows={3}
                          placeholder="Tactics or list adjustments to try…"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>

            <SheetFooter className="mt-6 gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Discard changes
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {isEdit ? "Update Game" : isPrefilled ? "Log Game" : "Log Game"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
