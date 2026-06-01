import type { UdbWeapon } from "@/db/queries/unitDatabase";

interface WeaponTableProps {
  weapons: UdbWeapon[];
  statLabel: "BS" | "WS";
}

export function WeaponTable({ weapons, statLabel }: WeaponTableProps) {
  return (
    <div className="flex flex-col">
      {/* Header row */}
      <div className="grid grid-cols-[1fr_36px_32px_36px_28px_32px_28px] gap-x-1 px-2 py-1 border-b border-border">
        {["Name", "Rng", "A", statLabel, "S", "AP", "D"].map((h) => (
          <span key={h} className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide text-center first:text-left">
            {h}
          </span>
        ))}
      </div>
      {weapons.map((w, i) => {
        const range = w.range && /^\d+$/.test(w.range) ? `${w.range}"` : (w.range ?? "—");
        const skill = w.skill ? `${w.skill}+` : "—";
        return (
          <div key={`${w.unit_id}-${w.weapon_group}-${w.line_order}-${i}`} className="border-b border-border last:border-0">
            <div className="grid grid-cols-[1fr_36px_32px_36px_28px_32px_28px] gap-x-1 px-2 py-1.5 items-center">
              <span className="text-sm font-medium truncate">{w.name}</span>
              <span className="text-xs text-center tabular-nums">{range}</span>
              <span className="text-xs text-center tabular-nums">{w.attacks ?? "—"}</span>
              <span className="text-xs text-center tabular-nums">{skill}</span>
              <span className="text-xs text-center tabular-nums">{w.strength ?? "—"}</span>
              <span className="text-xs text-center tabular-nums">{w.ap ?? "0"}</span>
              <span className="text-xs text-center tabular-nums">{w.damage ?? "—"}</span>
            </div>
            {w.keywords && (
              <p className="px-2 pb-1.5 text-xs text-muted-foreground leading-relaxed">
                {w.keywords}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
