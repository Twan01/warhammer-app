import { GripVertical, Trash2, ImageIcon } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DraftStep } from "./recipeSteps";
import { PAINTING_PHASES } from "./recipeSchema";
import { PaintCombobox } from "./PaintCombobox";

export interface RecipeStepRowProps {
  step: DraftStep;
  onChange: (next: DraftStep) => void;
  onRemove: () => void;
  onCreateNewPaint: () => void;
}

export function RecipeStepRow({
  step,
  onChange,
  onRemove,
  onCreateNewPaint,
}: RecipeStepRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.localId,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  async function handlePhotoUpload() {
    try {
      const result = (await openDialog({
        multiple: false,
        directory: false,
        filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }],
      })) as string | null;
      if (result === null) return; // user cancelled

      const ext = result.split(".").pop()?.toLowerCase() ?? "jpg";
      const data = await readFile(result); // absolute path — NO baseDir option
      const filename = `${crypto.randomUUID()}.${ext}`;
      await writeFile(filename, data, { baseDir: BaseDirectory.AppData });

      onChange({ ...step, step_photo_path: filename });
      toast.success("Step photo added.");
    } catch {
      toast.error("Failed to upload photo.");
    }
  }

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
        {/* Line 1: painting_phase Select + step_name Input + PaintCombobox */}
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
          <div className="w-40">
            <PaintCombobox
              value={step.paint_id}
              onChange={(paintId) => onChange({ ...step, paint_id: paintId })}
              onCreateNew={onCreateNewPaint}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handlePhotoUpload}
            aria-label="Upload step photo"
          >
            <ImageIcon className={step.step_photo_path ? "h-4 w-4 text-primary" : "h-4 w-4"} />
          </Button>
        </div>
        {/* Line 2: tool + technique + dilution + time estimate */}
        <div className="grid grid-cols-4 gap-1.5">
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
            onChange={(e) =>
              onChange({
                ...step,
                time_estimate_minutes: e.target.value ? Math.round(Number(e.target.value)) : null,
              })
            }
          />
        </div>
        <datalist id="tool-suggestions">
          {["Size 0 brush", "Size 1 brush", "Size 2 brush", "Dry brush", "Airbrush", "Sponge", "Palette knife"].map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <datalist id="technique-suggestions">
          {["Thin layers", "Stipple", "Wet blend", "Dry brush", "Wash", "Glaze", "Edge highlight", "Feathering"].map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
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
