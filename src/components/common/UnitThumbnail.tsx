import { useState } from "react";
import { Swords } from "lucide-react";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";
import type { UnitPhotoWithUrl } from "@/hooks/useUnitPhotos";

const SIZE_MAP = {
  sm: { px: "w-11 h-11", icon: 16 },  // 44px for compact project rows
  md: { px: "w-20 h-20", icon: 24 },  // 80px for CurrentFocusCard hero
} as const;

export function UnitThumbnail({
  photo,
  unit,
  faction,
  size,
}: {
  photo: UnitPhotoWithUrl | undefined;
  unit: Unit;
  faction: Faction | undefined;
  size: "sm" | "md";
}) {
  const [imgFailed, setImgFailed] = useState(false);

  if (photo && !imgFailed) {
    return (
      <img
        src={photo.assetUrl}
        alt={`${unit.name} photo`}
        className={`${SIZE_MAP[size].px} object-cover rounded-lg shrink-0`}
        loading="lazy"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${SIZE_MAP[size].px} rounded-lg shrink-0 flex items-center justify-center`}
      style={{ backgroundColor: faction?.color_theme ?? "hsl(var(--muted))" }}
      aria-hidden="true"
    >
      <Swords size={SIZE_MAP[size].icon} className="text-white/80" />
    </div>
  );
}
