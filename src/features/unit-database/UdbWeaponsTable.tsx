import type { UdbWeapon } from "@/db/queries/unitDatabase";

const HEADER_CLASS =
  "text-[10px] font-semibold text-muted-foreground uppercase tracking-wide text-center first:text-left";

interface UdbWeaponsTableProps {
  weapons: UdbWeapon[];
  statLabel: "BS" | "WS";
}

export function UdbWeaponsTable({ weapons, statLabel }: UdbWeaponsTableProps) {
  return (
    <div className="flex flex-col">
      {/* Header row */}
      <div className="grid grid-cols-[1fr_36px_32px_36px_28px_32px_28px] gap-x-1 px-2 py-1 border-b border-border">
        {["Name", "Range", "A", statLabel, "S", "AP", "D"].map((h) => (
          <span key={h} className={HEADER_CLASS}>
            {h}
          </span>
        ))}
      </div>

      {/* Weapon rows */}
      {weapons.map((w) => (
        <div
          key={w.id}
          className="border-b border-border last:border-0"
        >
          <div className="grid grid-cols-[1fr_36px_32px_36px_28px_32px_28px] gap-x-1 px-2 py-1.5 items-center">
            <span className="text-sm font-medium truncate">{w.name}</span>
            <span className="text-xs text-center tabular-nums">
              {w.range ?? "—"}
            </span>
            <span className="text-xs text-center tabular-nums">
              {w.attacks ?? "—"}
            </span>
            <span className="text-xs text-center tabular-nums">
              {w.skill ?? "—"}
            </span>
            <span className="text-xs text-center tabular-nums">
              {w.strength ?? "—"}
            </span>
            <span className="text-xs text-center tabular-nums">
              {w.ap ?? "0"}
            </span>
            <span className="text-xs text-center tabular-nums">
              {w.damage ?? "—"}
            </span>
          </div>
          {w.keywords && (
            <p className="px-2 pb-1.5 text-xs text-muted-foreground italic">
              {w.keywords}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
