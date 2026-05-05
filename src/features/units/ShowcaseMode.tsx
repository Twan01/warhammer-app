import { useState, useMemo, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@tauri-apps/api/core";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";
import type { UnitPhotoWithUrl } from "@/hooks/useUnitPhotos";

interface ShowcaseModeProps {
  units: Unit[];
  photos: Map<number, UnitPhotoWithUrl>;
  factions: Faction[];
  onClose: () => void;
}

export function ShowcaseMode({ units, photos, factions, onClose }: ShowcaseModeProps) {
  const [index, setIndex] = useState(0);

  const factionMap = useMemo(
    () => new Map(factions.map((f) => [f.id, f])),
    [factions],
  );

  const unit = units[index];
  const photo = unit ? photos.get(unit.id) : undefined;
  const faction = unit ? factionMap.get(unit.faction_id) : undefined;

  const handleClose = useCallback(async () => {
    if (isTauri()) {
      await getCurrentWindow().setFullscreen(false);
    } else {
      if (document.fullscreenElement) await document.exitFullscreen?.();
    }
    onClose();
  }, [onClose]);

  // Enter fullscreen on mount, exit on unmount
  useEffect(() => {
    let mounted = true;

    async function enterFullscreen() {
      if (isTauri()) {
        await getCurrentWindow().setFullscreen(true);
      } else {
        await document.documentElement.requestFullscreen?.();
      }
    }

    enterFullscreen();

    return () => {
      mounted = false;
      // Safety net: exit fullscreen on unmount for any reason
      if (isTauri()) {
        getCurrentWindow().setFullscreen(false).catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
      void mounted;
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
      } else if (e.key === "ArrowRight") {
        setIndex((i) => (i + 1) % units.length);
      } else if (e.key === "ArrowLeft") {
        // Pitfall 6: signed modulo fix — ensure non-negative index
        setIndex((i) => (i - 1 + units.length) % units.length);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [units.length, handleClose]);

  const handlePrev = () => setIndex((i) => (i - 1 + units.length) % units.length);
  const handleNext = () => setIndex((i) => (i + 1) % units.length);

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      data-testid="showcase-overlay"
    >
      {/* Exit button — top right */}
      <button
        className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors z-10"
        onClick={handleClose}
        aria-label="Exit Showcase"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Prev arrow — left edge */}
      <button
        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors z-10"
        onClick={handlePrev}
        aria-label="Previous unit"
      >
        <ChevronLeft className="h-8 w-8" />
      </button>

      {/* Next arrow — right edge */}
      <button
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors z-10"
        onClick={handleNext}
        aria-label="Next unit"
      >
        <ChevronRight className="h-8 w-8" />
      </button>

      {/* Photo — centered */}
      <img
        src={photo?.assetUrl}
        alt={unit?.name ?? "Unit photo"}
        className="max-h-[90vh] max-w-[90vw] object-contain"
      />

      {/* Bottom overlay bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-8 py-6">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-white text-lg font-medium">{unit?.name}</span>
            <span className="text-white/60 text-sm ml-3">{faction?.name}</span>
          </div>
          <span className="text-white/40 text-sm">{index + 1} of {units.length}</span>
        </div>
      </div>
    </div>
  );
}
