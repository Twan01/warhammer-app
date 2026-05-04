import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
import { useCreateFaction, useUpdateFaction } from "@/hooks/useFactions";
import type { Faction } from "@/types/faction";
import { factionSchema, type FactionFormValues } from "./factionSchema";

interface FactionSheetProps {
  open: boolean;
  faction: Faction | null; // null = create mode; Faction = edit mode
  onClose: () => void;
}

const DEFAULT_VALUES: FactionFormValues = {
  name: "",
  game_system: "Warhammer 40K",
  description: "",
  color_theme: "#4A90D9",
  icon_path: "",
  lore_notes: "",
};

export function FactionSheet({ open, faction, onClose }: FactionSheetProps) {
  const createFaction = useCreateFaction();
  const updateFaction = useUpdateFaction();
  const isEdit = faction !== null;

  const form = useForm<FactionFormValues>({
    resolver: zodResolver(factionSchema),
    defaultValues: faction
      ? {
          name: faction.name,
          game_system: faction.game_system,
          description: faction.description ?? "",
          color_theme: faction.color_theme,
          icon_path: faction.icon_path ?? "",
          lore_notes: faction.lore_notes ?? "",
        }
      : DEFAULT_VALUES,
  });

  // Pitfall 3: reset form when the faction prop changes between create and edit modes
  useEffect(() => {
    form.reset(
      faction
        ? {
            name: faction.name,
            game_system: faction.game_system,
            description: faction.description ?? "",
            color_theme: faction.color_theme,
            icon_path: faction.icon_path ?? "",
            lore_notes: faction.lore_notes ?? "",
          }
        : DEFAULT_VALUES
    );
  }, [faction, form]);

  async function onSubmit(values: FactionFormValues) {
    try {
      if (isEdit && faction) {
        await updateFaction.mutateAsync({
          id: faction.id,
          name: values.name,
          game_system: values.game_system,
          description: values.description || null,
          color_theme: values.color_theme,
          icon_path: values.icon_path || null,
          lore_notes: values.lore_notes || null,
        });
        toast.success("Faction updated.");
      } else {
        await createFaction.mutateAsync({
          name: values.name,
          game_system: values.game_system,
          description: values.description || null,
          color_theme: values.color_theme,
          icon_path: values.icon_path || null,
          lore_notes: values.lore_notes || null,
        });
        toast.success("Faction created.");
      }
      onClose();
    } catch {
      toast.error("Something went wrong. Please try again.");
      // Sheet stays open so user can retry
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Faction" : "New Faction"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update the details for this faction."
              : "Add a new faction to your collection."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 p-4">
            <FormField
              name="name"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Tau Empire" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="game_system"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Game System</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="description"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Optional"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="lore_notes"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lore Notes</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Chapter backstory, homeworld, custom lore, campaign history…"
                      rows={4}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="color_theme"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color Theme</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={field.value}
                        onChange={field.onChange}
                        className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent"
                        aria-label="Pick faction color"
                      />
                      {/* CONTEXT.md: 24px circular live-preview swatch */}
                      <span
                        className="inline-block rounded-full border border-border"
                        style={{ width: 24, height: 24, backgroundColor: field.value }}
                        aria-hidden
                      />
                      <span className="text-sm text-muted-foreground">{field.value}</span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="icon_path"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon Path</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Optional — text path only, no upload UI in v1"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter className="mt-6 gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Discard changes
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Save Faction
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
