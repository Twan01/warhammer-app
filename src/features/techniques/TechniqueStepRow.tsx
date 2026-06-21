import { GripVertical, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DraftTechniqueStep, DraftTechniqueSlot } from "@/types/technique";
import { PAINTING_PHASES } from "./techniqueSchema";

export interface TechniqueStepRowProps {
  step: DraftTechniqueStep;
  slots: DraftTechniqueSlot[];
  onChange: (next: DraftTechniqueStep) => void;
  onRemove: () => void;
}

export function TechniqueStepRow({ step, slots, onChange, onRemove }: TechniqueStepRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.localId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex gap-2 rounded-md border p-2"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab self-start text-muted-foreground"
        aria-label="Drag to reorder step"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex flex-1 flex-col gap-1.5">
        {/* Line 1: painting_phase Select + step_name Input + slot picker (replaces PaintCombobox) */}
        <div className="flex items-center gap-2">
          <Select
            value={step.painting_phase ?? "__none__"}
            onValueChange={(v) => onChange({ ...step, painting_phase: v === "__none__" ? null : v })}
          >
            <SelectTrigger className="w-[7.5rem]">
              <SelectValue placeholder="Phase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">-- phase --</SelectItem>
              {PAINTING_PHASES.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            className="flex-1"
            placeholder="e.g. Edge highlight on pauldrons"
            value={step.step_name}
            onChange={(e) => onChange({ ...step, step_name: e.target.value })}
          />

          {/* Slot picker — replaces PaintCombobox; no photo button */}
          <div className="w-40">
            <Select
              value={step.colour_slot_id ?? "__none__"}
              onValueChange={(v) =>
                onChange({ ...step, colour_slot_id: v === "__none__" ? null : v })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Colour slot" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">-- no slot --</SelectItem>
                {slots.map((s) => (
                  <SelectItem key={s.localId} value={s.localId}>
                    {s.name || <span className="text-muted-foreground italic">Unnamed slot</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Line 2: tool + technique + dilution + time + (5th cell omitted — no alt paint on techniques) */}
        <div className="grid grid-cols-5 gap-1.5">
          <Input
            placeholder="Tool"
            className="text-xs"
            value={step.tool ?? ""}
            onChange={(e) => onChange({ ...step, tool: e.target.value || null })}
            list="tool-suggestions"
          />
          <Input
            placeholder="Technique"
            className="text-xs"
            value={step.technique ?? ""}
            onChange={(e) => onChange({ ...step, technique: e.target.value || null })}
            list="technique-suggestions"
          />
          <Input
            placeholder="Dilution"
            className="text-xs"
            value={step.dilution ?? ""}
            onChange={(e) => onChange({ ...step, dilution: e.target.value || null })}
          />
          <Input
            type="number"
            step={1}
            min={1}
            placeholder="Min"
            className="text-xs w-16"
            value={step.time_estimate_minutes ?? ""}
            onChange={(e) => {
              const n = Math.round(Number(e.target.value));
              onChange({
                ...step,
                time_estimate_minutes:
                  e.target.value && Number.isFinite(n) && n >= 1 ? n : null,
              });
            }}
          />
          {/* 5th cell: alt paint omitted on technique steps */}
          <div />
        </div>

        {/* Line 3: notes */}
        <Input
          className="text-xs"
          placeholder="Notes…"
          value={step.notes ?? ""}
          onChange={(e) => onChange({ ...step, notes: e.target.value || null })}
        />
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="self-start"
        onClick={onRemove}
        aria-label="Remove step"
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
