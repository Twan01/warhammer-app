import { Controller, useFormContext } from "react-hook-form";
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
import type { Faction } from "@/types/faction";
import type { UnitFormValues } from "./unitSchema";
import { CategoryCombobox } from "./CategoryCombobox";

interface UnitFormRequiredProps {
  factions: Faction[];
  factionsLoading: boolean;
}

export function UnitFormRequired({ factions, factionsLoading }: UnitFormRequiredProps) {
  const { control, formState } = useFormContext<UnitFormValues>();

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
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <CategoryCombobox value={field.value} onChange={field.onChange} />
          )}
        />
        <FormMessage>{formState.errors.category?.message}</FormMessage>
      </FormItem>
    </>
  );
}
