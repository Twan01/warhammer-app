import { Controller, useFormContext } from "react-hook-form";
import { Sparkles } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Faction } from "@/types/faction";
import type { UnitFormValues } from "./unitSchema";
import { CategoryCombobox } from "./CategoryCombobox";
import { useDatasheetRole } from "@/hooks/useUnitRulesMapping";

interface UnitFormRequiredProps {
  factions: Faction[];
  factionsLoading: boolean;
  unitId?: number;
}

export function UnitFormRequired({ factions, factionsLoading, unitId }: UnitFormRequiredProps) {
  const { control, formState, setValue, watch } = useFormContext<UnitFormValues>();
  const { data: datasheetRole } = useDatasheetRole(unitId);
  const currentCategory = watch("category");

  const canSuggestCategory = datasheetRole && datasheetRole !== currentCategory;

  return (
    <>
      <FormField
        name="name"
        control={control}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Tau Fire Warriors" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="faction_id"
        control={control}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Faction</FormLabel>
            <Select
              disabled={factionsLoading}
              value={field.value ? String(field.value) : ""}
              onValueChange={(v) => field.onChange(Number(v))}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={factionsLoading ? "Loading factions..." : "Select faction"} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {factions.map((faction) => (
                  <SelectItem key={faction.id} value={String(faction.id)}>
                    {faction.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormItem>
        <FormLabel>Category</FormLabel>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <CategoryCombobox value={field.value} onChange={field.onChange} />
              )}
            />
          </div>
          {canSuggestCategory && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setValue("category", datasheetRole, { shouldValidate: true })}
                >
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Use "{datasheetRole}" from rules data</TooltipContent>
            </Tooltip>
          )}
        </div>
        <FormMessage>{formState.errors.category?.message}</FormMessage>
      </FormItem>
    </>
  );
}
