import { usePaints } from "@/hooks/usePaints";
import { PaintCombobox } from "./PaintCombobox";
import type { TechniqueColourSlot } from "@/types/technique";

export interface SlotFillRowProps {
  slot: TechniqueColourSlot;
  paintId: number | null;
  onChange: (paintId: number | null) => void;
  /** Open the inline "create a new paint" flow for this slot (TECH-UX-02). */
  onCreateNew?: () => void;
}

/**
 * One row in the slot-fill dialog: slot name + role hint + swatch + PaintCombobox.
 * Unassigned is valid (SLOT-05) — dashed swatch, never an error state.
 */
export function SlotFillRow({ slot, paintId, onChange, onCreateNew }: SlotFillRowProps) {
  const { data: paints = [] } = usePaints();
  const paint = paintId !== null ? (paints.find((p) => p.id === paintId) ?? null) : null;

  return (
    <div className="flex items-center gap-3 rounded-md border p-2">
      {/* Name + role hint column */}
      <div className="flex w-36 shrink-0 flex-col gap-1">
        <span className="text-sm font-semibold">{slot.name}</span>
        <span className="text-xs text-muted-foreground">
          {slot.role_hint ?? "No hint"}
        </span>
      </div>

      {/* Swatch circle */}
      {paintId !== null && paint !== null ? (
        <span
          className="h-4 w-4 rounded-full shrink-0"
          style={{ backgroundColor: paint.hex_color ?? "transparent" }}
          aria-hidden="true"
        />
      ) : (
        <span
          className="h-4 w-4 rounded-full shrink-0 border border-dashed border-muted-foreground"
          aria-hidden="true"
        />
      )}

      {/* Paint combobox */}
      <div className="flex-1">
        <PaintCombobox
          value={paintId}
          onChange={onChange}
          onCreateNew={onCreateNew}
          aria-label={`Paint for slot: ${slot.name}`}
          placeholder="Assign paint (optional)"
        />
      </div>
    </div>
  );
}
