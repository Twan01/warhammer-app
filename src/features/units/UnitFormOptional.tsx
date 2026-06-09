import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { ChevronDown, ChevronUp, FolderOpen } from "lucide-react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import type { Unit, EnrichedUnit } from "@/types/unit";
import { PRIORITY_OPTIONS, type UnitFormValues } from "./unitSchema";
import {
  CheckboxField,
  NullableNumberField,
  NullableDateField,
  NullableTextField,
  NullableTextareaField,
} from "./UnitFormFields";
import { useUdbPointsTiers } from "@/hooks/useUnitDatabase";

interface UnitFormOptionalProps {
  hasTiers: boolean;
  tiersCount: number;
  unit: Unit | EnrichedUnit | null;
  udbUnitId: string | null;
}

export function UnitFormOptional({ hasTiers, tiersCount, unit, udbUnitId }: UnitFormOptionalProps) {
  const { control, setValue } = useFormContext<UnitFormValues>();
  const [expanded, setExpanded] = useState(false);

  const udbBasePoints = unit && "udb_base_points" in unit ? (unit as EnrichedUnit).udb_base_points : null;
  const isLinked = unit && "is_linked" in unit ? (unit as EnrichedUnit).is_linked : !!udbUnitId;
  const { data: udbTiers = [] } = useUdbPointsTiers(udbUnitId);
  const hasUdbTiers = udbTiers.length > 0;

  async function handlePickImage() {
    const path = await openDialog({
      multiple: false,
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }],
    });
    if (typeof path === "string") {
      setValue("main_image_path", path, { shouldValidate: true });
    }
  }

  return (
    <>
      <Separator />

      <button
        type="button"
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
        {expanded ? "Hide details" : "More details"}
      </button>

      {expanded && (
        <div className="flex flex-col gap-4">
          {/* Project management */}
          <CheckboxField name="is_active_project" label="Active project" />

          <FormField
            name="priority"
            control={control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select
                  value={field.value ?? "__none__"}
                  onValueChange={(v) => field.onChange(v === "__none__" ? null : v)}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <NullableDateField name="target_completion_date" label="Target Completion Date" />

          <Separator />

          {/* Counts & points */}
          {hasUdbTiers ? (
            <FormField
              name="model_count"
              control={control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model Count</FormLabel>
                  <Select
                    value={field.value !== null && field.value !== undefined ? String(field.value) : "__none__"}
                    onValueChange={(v) => {
                      if (v === "__none__") {
                        field.onChange(null);
                        if (!hasTiers) setValue("points", null, { shouldValidate: true });
                        return;
                      }
                      const mc = parseInt(v, 10);
                      field.onChange(mc);
                      const tier = udbTiers.find((t) => t.model_count === mc);
                      if (tier && !hasTiers) {
                        setValue("points", tier.points, { shouldValidate: true });
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select model count" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {udbTiers.map((tier) => (
                        <SelectItem key={tier.model_count} value={String(tier.model_count)}>
                          {tier.model_count} models — {tier.points} pts
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Valid sizes from unit database
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <NullableNumberField name="model_count" label="Model Count" min={0} />
          )}
          <NullableNumberField name="owned_count" label="Owned Count" min={0} />

          <FormField
            name="points"
            control={control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Points</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    placeholder={udbBasePoints !== null ? `${udbBasePoints} from database` : "Optional"}
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === "" ? null : e.target.valueAsNumber
                      )
                    }
                    disabled={hasTiers || hasUdbTiers}
                    className={hasTiers || hasUdbTiers ? "cursor-not-allowed opacity-60" : undefined}
                  />
                </FormControl>
                {hasTiers ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    Managed by point tiers ({tiersCount} tier{tiersCount !== 1 ? "s" : ""} defined)
                  </p>
                ) : hasUdbTiers ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto-set from model count tier
                  </p>
                ) : isLinked && udbBasePoints !== null && field.value === null ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    Will use {udbBasePoints} pts from unit database
                  </p>
                ) : null}
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator />

          {/* Purchase & storage */}
          <NullableDateField name="purchase_date" label="Purchase Date" />

          <FormField
            name="purchase_price_pounds"
            control={control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purchase Price</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">£</span>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      className="pl-7"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))
                      }
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <NullableTextField name="storage_location" label="Storage Location" placeholder="Optional" />

          {/* Image picker */}
          <FormField
            name="main_image_path"
            control={control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Image</FormLabel>
                <div className="flex items-center gap-2">
                  <FormControl>
                    <Input
                      placeholder="Select an image..."
                      {...field}
                      value={(field.value as string | null) ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      className="flex-1"
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handlePickImage}
                    aria-label="Browse for image"
                  >
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator />

          {/* Notes & enrichment */}
          <NullableTextareaField name="notes" label="Notes" placeholder="Optional notes, lore, backstory..." />
          <NullableTextField name="undercoat" label="Undercoat" placeholder="e.g. Chaos Black, Wraithbone" />
        </div>
      )}
    </>
  );
}
