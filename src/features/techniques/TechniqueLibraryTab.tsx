import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTechniquesWithCounts, useDuplicateTechnique } from "@/hooks/useTechniques";
import type { Technique, TechniqueWithCounts } from "@/types/technique";
import { RECIPE_EFFECTS } from "@/features/techniques/techniqueSchema";
import { applyTechniqueFilters } from "./applyTechniqueFilters";
import { TechniqueCardGrid } from "./TechniqueCardGrid";
import { TechniqueDetailSheet } from "./TechniqueDetailSheet";
import { TechniqueDeleteDialog } from "./TechniqueDeleteDialog";
import { TechniqueFormSheet } from "./TechniqueFormSheet";

export function TechniqueLibraryTab() {
  const { data: techniques = [], isLoading } = useTechniquesWithCounts();
  const duplicateTechnique = useDuplicateTechnique();

  // Filter state
  const [nameFilter, setNameFilter] = useState("");
  const [effectFilter, setEffectFilter] = useState<string | null>(null);

  // Sheet / dialog state
  const [selectedTechnique, setSelectedTechnique] = useState<TechniqueWithCounts | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState<Technique | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<TechniqueWithCounts | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const filtered = useMemo(
    () => applyTechniqueFilters(techniques, { nameFilter, effectFilter }),
    [techniques, nameFilter, effectFilter],
  );

  const isFiltered = nameFilter.trim() !== "" || effectFilter !== null;

  function clearFilters() {
    setNameFilter("");
    setEffectFilter(null);
  }

  function openDetail(technique: TechniqueWithCounts) {
    setSelectedTechnique(technique);
    setDetailOpen(true);
  }
  function closeDetail() {
    setDetailOpen(false);
    setSelectedTechnique(null);
  }

  function openForm(technique?: Technique | null) {
    setEditing(technique ?? null);
    setFormOpen(true);
    // Close detail if open
    setDetailOpen(false);
  }
  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  function openDelete(technique: TechniqueWithCounts) {
    setDeleting(technique);
    setDeleteOpen(true);
    // Close detail if open
    setDetailOpen(false);
  }
  function closeDelete() {
    setDeleteOpen(false);
    setDeleting(null);
  }

  async function handleDuplicate(technique: TechniqueWithCounts) {
    try {
      await duplicateTechnique.mutateAsync({
        originalId: technique.id,
        newName: `Copy of ${technique.name}`,
      });
      toast.success("Technique duplicated.");
    } catch {
      toast.error("Failed to duplicate technique.");
    }
  }

  // Convert TechniqueWithCounts to Technique for detail/form sheets
  function toTechnique(t: TechniqueWithCounts): Technique {
    return {
      id: t.id,
      name: t.name,
      effect: t.effect,
      difficulty: t.difficulty,
      notes: t.notes,
      created_at: t.created_at,
      updated_at: t.updated_at,
    };
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search techniques…"
          className="w-48"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          aria-label="Search techniques"
        />
        <Select
          value={effectFilter ?? "__all__"}
          onValueChange={(v) => setEffectFilter(v === "__all__" ? null : v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Effect" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All effects</SelectItem>
            {RECIPE_EFFECTS.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => openForm(null)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Technique
        </Button>
        {isFiltered && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Card grid */}
      <TechniqueCardGrid
        data={filtered}
        isLoading={isLoading}
        isFiltered={isFiltered}
        onCardClick={openDetail}
        onAdd={() => openForm(null)}
        onEdit={(t) => openForm(toTechnique(t))}
        onDelete={openDelete}
        onDuplicate={handleDuplicate}
      />

      {/* Detail Sheet */}
      <TechniqueDetailSheet
        open={detailOpen}
        technique={selectedTechnique ? toTechnique(selectedTechnique) : null}
        onClose={closeDetail}
        onEdit={(t) => openForm(t)}
        onDelete={(t) => {
          const withCounts = techniques.find((tc) => tc.id === t.id) ?? null;
          if (withCounts) openDelete(withCounts);
        }}
      />

      {/* Form Sheet */}
      <TechniqueFormSheet
        key={editing?.id ?? "new"}
        open={formOpen}
        technique={editing}
        onClose={closeForm}
      />

      {/* Delete Dialog */}
      <TechniqueDeleteDialog
        open={deleteOpen}
        technique={deleting}
        usageCount={deleting?.usage_count ?? 0}
        onClose={closeDelete}
      />
    </div>
  );
}
