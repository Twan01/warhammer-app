import type { UdbModel } from "@/db/queries/unitDatabase";

const HEADER_CLASS =
  "text-[10px] font-semibold text-muted-foreground uppercase tracking-wide text-center";

const VALUE_CLASS = "text-xl font-semibold text-center";

interface UdbStatBlockProps {
  models: UdbModel[];
}

export function UdbStatBlock({ models }: UdbStatBlockProps) {
  const showName = models.length > 1;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div
        className={`grid gap-x-1 px-2 py-1 border-b border-border ${
          showName
            ? "grid-cols-[1fr_40px_32px_48px_32px_36px_32px]"
            : "grid-cols-[40px_32px_48px_32px_36px_32px]"
        }`}
      >
        {showName && <span className={`${HEADER_CLASS} text-left`}>Name</span>}
        <span className={HEADER_CLASS}>M</span>
        <span className={HEADER_CLASS}>T</span>
        <span className={HEADER_CLASS}>SV</span>
        <span className={HEADER_CLASS}>W</span>
        <span className={HEADER_CLASS}>LD</span>
        <span className={HEADER_CLASS}>OC</span>
      </div>

      {/* Rows */}
      {models.map((m) => {
        const svDisplay = m.inv_sv ? `${m.Sv ?? "—"}/${m.inv_sv}` : (m.Sv ?? "—");

        return (
          <div
            key={m.id}
            className={`grid gap-x-1 px-2 py-1.5 border-b border-border last:border-0 ${
              showName
                ? "grid-cols-[1fr_40px_32px_48px_32px_36px_32px]"
                : "grid-cols-[40px_32px_48px_32px_36px_32px]"
            }`}
          >
            {showName && (
              <span className="text-sm font-medium truncate self-center">
                {m.name ?? "—"}
              </span>
            )}
            <span className={VALUE_CLASS}>{m.M ?? "—"}</span>
            <span className={VALUE_CLASS}>{m.T ?? "—"}</span>
            <span className={VALUE_CLASS}>{svDisplay}</span>
            <span className={VALUE_CLASS}>{m.W ?? "—"}</span>
            <span className={VALUE_CLASS}>{m.Ld ?? "—"}</span>
            <span className={VALUE_CLASS}>{m.OC ?? "—"}</span>
          </div>
        );
      })}
    </div>
  );
}
