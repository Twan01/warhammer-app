/**
 * Phase 12 — PaintingRing component (UI-05).
 *
 * Renders a 96px circular SVG progress ring for the gallery card painting status.
 * - Track: zinc-600 (#52525b) — neutral, hardcoded; rings encode painting state, NOT
 *   faction identity (locked decision in 12-CONTEXT.md §Painting Ring — Appearance).
 * - Progress arc: hsl(var(--primary)) via Tailwind `text-primary` + stroke="currentColor"
 *   chain (Pitfall 1 — Tailwind v4 stroke-* utilities don't apply directly to SVG stroke).
 * - Linecap: round on progress arc only — track has default butt linecap.
 * - Math: stroke-dasharray = 2 * Math.PI * 38 ≈ 238.76; stroke-dashoffset = CIRCUMFERENCE *
 *   (1 - percentage / 100). At percentage=0 offset=CIRCUMFERENCE (no fill); at
 *   percentage=100 offset=0 (full ring).
 * - Defensive: percentage ?? 0 guard prevents NaN% rendering when a caller passes nullish
 *   (Pitfall 5).
 *
 * Pattern source: 12-RESEARCH.md §Architecture Patterns Pattern 2.
 */
const RADIUS = 38;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export interface PaintingRingProps {
  percentage: number;
}

export function PaintingRing({ percentage }: PaintingRingProps) {
  const pct = percentage ?? 0;
  const offset = CIRCUMFERENCE * (1 - pct / 100);

  return (
    <svg
      width={96}
      height={96}
      viewBox="0 0 96 96"
      role="img"
      aria-label={`${pct}% painted`}
    >
      {/* Track circle — neutral zinc-600 background arc */}
      <circle
        cx={48}
        cy={48}
        r={RADIUS}
        fill="none"
        stroke="#52525b"
        strokeWidth={8}
      />
      {/* Progress arc — primary color via currentColor inheritance (Pitfall 1) */}
      <circle
        cx={48}
        cy={48}
        r={RADIUS}
        fill="none"
        strokeWidth={8}
        strokeLinecap="round"
        stroke="currentColor"
        className="text-primary"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        transform="rotate(-90 48 48)"
      />
      {/* Percentage label — both className and fill attribute (Open Question 2 resilient pattern) */}
      <text
        x={48}
        y={48}
        dominantBaseline="middle"
        textAnchor="middle"
        className="text-base font-semibold"
        fill="currentColor"
        fontSize="16"
        fontWeight="600"
      >
        {pct}%
      </text>
    </svg>
  );
}
